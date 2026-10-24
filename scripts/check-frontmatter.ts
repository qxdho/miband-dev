import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { z } from 'zod'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = path.join(root, 'docs')
const modelsFile = path.join(docsDir, '.vitepress', 'data', 'models.json')

const CAP = z.union([z.boolean(), z.literal('unknown'), z.literal('partial')])

const modelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  screen: z.tuple([z.number().int().positive(), z.number().int().positive()]).nullable(),
  radius: z.number().int().nonnegative().nullable(),
  os: z.string().min(1),
  soc: z.string().min(1),
  quickapp: CAP,
  watchface: CAP,
  native: CAP,
  flash: CAP,
  sources: z.array(z.string().url()).optional(),
})

const modelsFileSchema = z.object({
  updated: z.string(),
  note: z.string().optional(),
  models: z.array(modelSchema).min(1),
})

const modelIds = (() => {
  const raw = JSON.parse(fs.readFileSync(modelsFile, 'utf8'))
  const parsed = modelsFileSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('✗ models.json 不符合 schema:')
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  const ids = parsed.data.models.map((m) => m.id)
  if (new Set(ids).size !== ids.length) {
    console.error('✗ models.json 存在重复的机型 id')
    process.exit(1)
  }
  return ids
})()

const frontmatterSchema = z
  .object({
    title: z.string().min(1, 'title 不能为空'),
    models: z.array(z.enum(modelIds as [string, ...string[]])).min(1, 'models 至少填一个机型'),
    firmware: z.string().min(1).default('unknown'),
    verified: z.coerce.date({ message: 'verified 必须是日期（如 2026-10-24）' }),
    status: z.enum(['tested', 'sourced', 'unverified']),
    source: z.string().url().optional(),
    contributors: z.array(z.string().min(1)).min(1, 'contributors 至少填一个'),
  })
  .superRefine((data, ctx) => {
    if (data.status !== 'tested' && !data.source) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source'],
        message: 'status 不是 tested 时必须填 source（来源链接）',
      })
    }
  })

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

function isHomePage(file: string, data: Record<string, unknown>): boolean {
  const rel = path.relative(docsDir, file)
  return rel === 'index.md' || data.layout === 'home'
}

const TWELVE_MONTHS = 365 * 24 * 60 * 60 * 1000
const now = Date.now()

const errors: string[] = []
const warnings: string[] = []
let checked = 0

for (const file of walk(docsDir)) {
  const rel = path.relative(root, file)
  const parsed = matter(fs.readFileSync(file, 'utf8'))
  const data = parsed.data as Record<string, unknown>

  if (isHomePage(file, data)) continue

  checked++
  const result = frontmatterSchema.safeParse(data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${rel} → ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    continue
  }

  const age = now - result.data.verified.getTime()
  if (age > TWELVE_MONTHS) {
    warnings.push(
      `${rel} → verified（${result.data.verified.toISOString().slice(0, 10)}）已超过 12 个月，请复核`,
    )
  }
}

if (warnings.length) {
  console.warn('⚠ 警告（不阻断 CI）：')
  for (const w of warnings) console.warn('  - ' + w)
}

if (errors.length) {
  console.error(`✗ frontmatter 校验失败，共 ${errors.length} 处：`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}

console.log(`✓ models.json 通过 schema（${modelIds.length} 个机型）`)
console.log(`✓ frontmatter 校验通过（${checked} 篇内容页）`)
