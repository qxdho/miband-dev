<script setup lang="ts">
import data from '../data/models.json'

type Cap = boolean | 'partial' | 'unknown'

const models = data.models as Array<{
  id: string
  name: string
  screen: [number, number] | null
  radius: number | null
  os: string
  soc: string
  quickapp: Cap
  watchface: Cap
  native: Cap
  flash: Cap
  sources?: string[]
}>

function capText(v: Cap | undefined): string {
  if (v === true) return '✓'
  if (v === 'partial') return '◐'
  if (v === false) return '✕'
  return '❓'
}

function capClass(v: Cap | undefined): string {
  if (v === true) return 'cap cap-ok'
  if (v === 'partial') return 'cap cap-partial'
  if (v === false) return 'cap cap-no'
  return 'cap cap-unknown'
}

function capTitle(v: Cap | undefined): string {
  if (v === true) return '据来源可用，尚未亲测'
  if (v === 'partial') return '部分可用 / 有条件'
  if (v === false) return '不可用'
  return '待验证'
}

function screenText(s: [number, number] | null): string {
  return s ? `${s[0]}×${s[1]}` : '❓'
}

function radiusText(r: number | null): string {
  return r == null ? '❓' : `${r}px`
}
</script>

<template>
  <div class="matrix-wrap">
    <table class="model-matrix">
      <thead>
        <tr>
          <th>机型</th>
          <th>屏幕</th>
          <th>圆角</th>
          <th>系统</th>
          <th>SoC</th>
          <th>快应用</th>
          <th>表盘</th>
          <th>原生模块</th>
          <th>刷固件</th>
          <th>来源</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in models" :key="m.id">
          <td class="model-name">
            <strong>{{ m.name }}</strong>
            <code>{{ m.id }}</code>
          </td>
          <td>{{ screenText(m.screen) }}</td>
          <td>{{ radiusText(m.radius) }}</td>
          <td>{{ m.os }}</td>
          <td>{{ m.soc }}</td>
          <td><span :class="capClass(m.quickapp)" :title="capTitle(m.quickapp)">{{ capText(m.quickapp) }}</span></td>
          <td><span :class="capClass(m.watchface)" :title="capTitle(m.watchface)">{{ capText(m.watchface) }}</span></td>
          <td><span :class="capClass(m.native)" :title="capTitle(m.native)">{{ capText(m.native) }}</span></td>
          <td><span :class="capClass(m.flash)" :title="capTitle(m.flash)">{{ capText(m.flash) }}</span></td>
          <td>
            <a
              v-if="m.sources && m.sources.length"
              :href="m.sources[0]"
              target="_blank"
              rel="noreferrer"
            >来源</a>
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <p class="matrix-legend">
    <span class="cap cap-ok">✓</span> 据来源可用 ·
    <span class="cap cap-partial">◐</span> 部分/有条件 ·
    <span class="cap cap-no">✕</span> 不可用 ·
    <span class="cap cap-unknown">❓</span> 待验证
  </p>
</template>
