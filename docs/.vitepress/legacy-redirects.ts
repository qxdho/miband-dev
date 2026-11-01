// 旧 IA 的 URL 映射。VitePress 使用 cleanUrls，旧地址会直接 404；
// 这里由 404 页在客户端跳转，保留外部引用与搜索引擎的入口。
//
// key 不带 base、不带结尾斜杠，也不带 .html。
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/apps': '/start/choose-path',
  '/apps/quickapp': '/quickapp',
  '/apps/quickapp/setup': '/quickapp/setup',
  '/apps/quickapp/runtime': '/quickapp/runtime',
  '/apps/quickapp/pitfalls': '/quickapp/pitfalls',
  '/apps/watchface': '/watchface',
  '/apps/watchface/package': '/watchface/format',

  '/system': '/platform',
  '/system/firmware': '/platform/firmware',
  '/system/firmware/package': '/platform/firmware/package',
  '/system/firmware/architecture': '/platform/firmware/architecture',
  '/system/firmware/filesystem': '/platform/firmware/filesystem',
  '/system/firmware/recovery': '/platform/firmware/recovery',
  '/system/native': '/native',
  '/system/native/modules': '/native/develop/modules',
  '/system/native/canopus': '/native/frameworks/canopus',
  '/system/native/chaos': '/native/frameworks/chaos',
  '/system/native/lvgl': '/native/ui/lvgl',
  '/system/native/arc': '/native/ui/arc',
  '/system/native/app-hiding': '/native/advanced/app-hiding',
  '/system/native/addresses': '/native/advanced/addresses',

  '/refs': '/platform/tools',
  '/refs/ble': '/platform/protocol/ble',
  '/refs/network': '/platform/protocol/network',
  '/refs/emulator': '/platform/tools/emulator',
  '/refs/reversing': '/platform/tools/reversing',
  '/refs/patterns': '/native/ui/patterns',
  '/refs/references': '/platform/reference/references',
  '/refs/examples': '/platform/reference/examples',

  '/about/control-center': '/native/advanced/control-center',
  '/about/code-review': '/native/frameworks/chaos-review',
}
