import { defineConfig } from 'vitepress'

/**
 * ⚠️ 不要改。这个值必须和 GitHub 仓库名一致。
 *    改成别的 → 线上全站变纯文本（CSS/JS/图片全部 404），本地预览看不出来。
 *    只有仓库改名为 qxdho.github.io 时，才改成 '/'
 */
const BASE = '/miband-dev/'

export default defineConfig({
  lang: 'zh-CN', // 【可改】页面语言。中文填 'zh-CN'

  // 【可改】浏览器标签页上的标题，每个页面会拼成「页面名 | 米环开发手册」
  title: 'MiBand开发手册',

  // 【可改】搜索引擎和分享预览里显示的介绍，建议 80-160 字
  description:
    '小米手环 / 小米手表开发者资料库',

  // ⚠️ 不要动，指向上面的 BASE
  base: BASE,

  // ⚠️ 不要改。改成 false → 所有网址变成 /xxx.html 后缀，站内链接全断
  cleanUrls: true,

  // 【可改】每个页面底部是否显示「最后更新」日期。false = 不显示
  lastUpdated: true,

  // ─── 多语言 ──────────────────────────────────────────────
  // root 是默认语言（中文，在 docs/ 下）。
  // en 是英文（在 docs/en/ 下），link 指向它的首页。
  //
  // 加一门语言 = 在这里加一项（如 ja），再建 docs/ja/ 目录放译文。
  // 译文不会自动生成，必须有人写。
  //
  // 想暂时关掉英文：把 en 这一整块删掉，顶部导航的语言菜单会自动消失，
  // 英文页面留在仓库里不影响构建。
  locales: {
    root: {
      label: '简体中文', // 语言菜单里显示的名字
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      title: 'Mi Band Developer Handbook',
      description:
        'Developer resources for Xiaomi Mi Band / Smart Band: Quick Apps, watchfaces, firmware research, native apps, BLE protocol and tools. China-region devices only. Unofficial.',

      // 英文站的导航和目录。链接必须带 /en/ 前缀。
      themeConfig: {
        nav: [
          { text: 'Start', link: '/en/start/', activeMatch: '/en/start/' },
          { text: 'Chinese docs', link: '/' },
        ],

        sidebar: [
          {
            text: 'Start',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/en/start/' },
              { text: 'Device matrix', link: '/en/start/models' },
              { text: 'Glossary', link: '/en/start/glossary' },
            ],
          },
          {
            text: 'Not translated yet',
            collapsed: true,
            items: [{ text: 'Chinese site', link: '/' }],
          },
        ],

        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdatedText: 'Last updated',
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance',
        langMenuLabel: 'Language',

        search: {
          options: {
            translations: {
              button: { buttonText: 'Search', buttonAriaLabel: 'Search' },
              modal: {
                noResultsText: 'No results found',
                resetButtonTitle: 'Clear query',
                footer: {
                  selectText: 'Select',
                  navigateText: 'Navigate',
                  closeText: 'Close',
                },
              },
            },
          },
        },

        footer: {
          message:
            'Unofficial project, not affiliated with Xiaomi. Docs under CC BY-SA 4.0, code under MIT.',
          copyright: 'Copyright © 2026 Mi Band Developer Handbook contributors',
        },
      },
    },
  },

  head: [
    // 浏览器标签栏上的小图标（favicon）。文件在 docs/public/。
    //
    // ⚠️ 这里【必须】写成 base + 文件名，即 ${BASE}favicon.svg。
    //    写成 '/favicon.svg' 会去请求 https://qxdho.github.io/favicon.svg，
    //    少了 /miband-dev/ 这一层，得到 404，标签栏一直是空白。
    //    （导航栏的 logo 不一样，那个 VitePress 会自动补 base，写 '/logo.svg' 就对。）
    //
    // 想换图标：把 docs/public/favicon.svg 换成你自己的文件即可，这行不用动。
    // 换仓库名时（见第 8 行的 BASE），下面三行会跟着变，不用动。
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],

    // 老浏览器不认 SVG 图标，用 PNG 兜底。没有这个文件就删掉本行。
    ['link', { rel: 'alternate icon', type: 'image/png', href: `${BASE}favicon.png` }],

    // 苹果设备「添加到主屏幕」用的图标（180x180）。没有就删掉本行。
    ['link', { rel: 'apple-touch-icon', href: `${BASE}apple-touch-icon.png` }],

    // 【可改】手机浏览器地址栏颜色，取值见 theme/custom.css 的 --vp-c-brand-3
    ['meta', { name: 'theme-color', content: '#c2410c' }],

    // 【可改】作者信息
    ['meta', { name: 'author', content: '谦虚の海鸥' }],

    // 【可改】搜索引擎关键词，英文逗号分隔
    [
      'meta',
      {
        name: 'keywords',
        content: '小米手环,快应用,VelaOS,NuttX,表盘,固件,原生应用,开发者文档',
      },
    ],
  ],

  themeConfig: {
    // 【可改】导航栏图标，文件在 docs/public/。写成 '/文件名.svg'，不要带 /miband-dev/
    logo: '/logo.svg',

    // 【可改】图标旁的文字。删掉这行 → 只显示图标不显示字
    siteTitle: 'MiBand开发手册',

    // 【可改】顶部导航按钮。加按钮 → 复制一行改文字和地址；删按钮 → 整行删掉
    //         activeMatch 控制当前在某个板块时哪个按钮高亮，可以不要
    //         items 是下拉菜单，「更多」展开后显示里面的子项
    nav: [
      { text: '开始', link: '/start/', activeMatch: '/start/' },
      { text: '快应用', link: '/quickapp/', activeMatch: '/quickapp/' },
      { text: '表盘', link: '/watchface/', activeMatch: '/watchface/' },
      { text: '固件', link: '/firmware/', activeMatch: '/firmware/' },
      { text: '原生应用', link: '/native/', activeMatch: '/native/' },
      {
        text: '更多',
        items: [
          { text: 'BLE协议', link: '/protocol/' },
          { text: '工具索引', link: '/tools/' },
          { text: '示例代码', link: '/examples/' },
          { text: '关于本站', link: '/community/about' },
        ],
      },
    ],

    // 【可改】左侧目录。加页面 → 在对应 items 里加 { text: '标题', link: '/路径' }
    //         link 不写 .html、不写 docs/
    //         collapsed: true 默认折叠 / false 默认展开
    //         text 是分组标题，不能点
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
          { text: '常见问题', link: '/quickapp/pitfalls' },
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

    // ⚠️ provider 不要改。'local' = 免费本地搜索，改了要付费注册服务
    search: {
      provider: 'local',
      options: {
        // 【可改】搜索框里的界面文字
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

    // 【可改】右侧「本页目录」浮层。显示 h2、h3 标题，改成 [2, 4] 会连 h4 一起显示
    outline: { label: '本页目录', level: [2, 3] },

    // 【可改】页面底部上一篇/下一篇按钮的文字
    docFooter: { prev: '上一篇', next: '下一篇' },

    // 【可改】各处的界面小字，都是提示文字，改成什么都行
    lastUpdatedText: '最后更新',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    langMenuLabel: '语言',

    // 【可改】页脚。message 里的「非官方，与小米公司无关联」是法律红线，不要删
    footer: {
      message:
        '非官方项目，与小米公司无关联。文档采用 CC BY-SA 4.0，代码采用 MIT。',
      copyright: 'Copyright © 2026 米环开发手册 contributors',
    },
  },
})
