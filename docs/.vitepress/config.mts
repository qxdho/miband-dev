import { defineConfig } from 'vitepress'

// 站点发布在 https://miband-dev.github.io/（用户/组织主页，根路径），所以 base 是 '/'。
// 如果改回「项目页」形式（https://<user>.github.io/miband-dev/），这里要同步改成 '/miband-dev/'，
// 否则 GitHub Pages 上样式和图片会全部 404——这是本项目第一号事故源。
const BASE = '/'

export default defineConfig({
  lang: 'zh-CN',
  title: '米环开发手册',
  description:
    '小米手环 / 小米手表开发者资料库：快应用、表盘、固件研究、原生应用、BLE 协议与工具索引。只做国行，非官方。',
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#0ea5e9' }],
    ['meta', { name: 'author', content: '米环开发手册 contributors' }],
    [
      'meta',
      {
        name: 'keywords',
        content: '小米手环,快应用,VelaOS,NuttX,表盘,固件,原生应用,开发者文档',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '米环开发手册',

    nav: [
      { text: '开始', link: '/start/', activeMatch: '/start/' },
      { text: '快应用', link: '/quickapp/', activeMatch: '/quickapp/' },
      { text: '表盘', link: '/watchface/', activeMatch: '/watchface/' },
      { text: '固件', link: '/firmware/', activeMatch: '/firmware/' },
      { text: '原生', link: '/native/', activeMatch: '/native/' },
      {
        text: '更多',
        items: [
          { text: 'BLE 协议', link: '/protocol/' },
          { text: '工具索引', link: '/tools/' },
          { text: '示例代码', link: '/examples/' },
          { text: '关于本站', link: '/community/about' },
        ],
      },
    ],

    // 全局侧边栏：分类即导航。新增页面只往对应分组里加一项。
    sidebar: [
      {
        text: '开始',
        collapsed: true,
        items: [
          { text: '从这里开始', link: '/start/' },
          { text: '机型能力矩阵', link: '/start/models' },
          { text: '术语表', link: '/start/glossary' },
        ],
      },
      {
        text: '快应用',
        collapsed: true,
        items: [
          { text: '导读', link: '/quickapp/' },
          { text: '环境搭建', link: '/quickapp/setup' },
          { text: '十大坑', link: '/quickapp/pitfalls' },
        ],
      },
      {
        text: '表盘',
        collapsed: true,
        items: [{ text: '导读', link: '/watchface/' }],
      },
      {
        text: '固件研究',
        collapsed: true,
        items: [{ text: '导读', link: '/firmware/' }],
      },
      {
        text: '原生应用',
        collapsed: true,
        items: [{ text: '导读', link: '/native/' }],
      },
      {
        text: 'BLE 协议',
        collapsed: true,
        items: [{ text: '导读', link: '/protocol/' }],
      },
      {
        text: '工具与示例',
        collapsed: true,
        items: [
          { text: '工具索引', link: '/tools/' },
          { text: '示例代码', link: '/examples/' },
        ],
      },
      {
        text: '参与',
        collapsed: true,
        items: [{ text: '关于本站', link: '/community/about' }],
      },
    ],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdatedText: '最后更新',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    langMenuLabel: '语言',

    footer: {
      message:
        '非官方项目，与小米公司无关联。文档采用 CC BY-SA 4.0，代码采用 MIT。',
      copyright: 'Copyright © 2026 米环开发手册 contributors',
    },
  },
})
