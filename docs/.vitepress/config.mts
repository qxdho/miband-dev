import { defineConfig } from 'vitepress'

// 重要：base 必须与仓库名一致。漏掉这行，GitHub Pages 上样式和图片会全部 404。
const BASE = '/miband-dev/'

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
      { text: '开始', link: '/start/models', activeMatch: '/start/' },
      { text: '快应用', link: '/quickapp/setup', activeMatch: '/quickapp/' },
      { text: '关于', link: '/community/about', activeMatch: '/community/' },
    ],

    sidebar: {
      '/start/': [
        {
          text: '开始',
          items: [
            { text: '机型能力矩阵', link: '/start/models' },
            { text: '术语表', link: '/start/glossary' },
          ],
        },
      ],
      '/quickapp/': [
        {
          text: '快应用',
          items: [
            { text: '环境搭建', link: '/quickapp/setup' },
            { text: '十大坑', link: '/quickapp/pitfalls' },
          ],
        },
      ],
      '/community/': [
        {
          text: '社区',
          items: [{ text: '关于本站', link: '/community/about' }],
        },
      ],
    },

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
