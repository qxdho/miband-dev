import { defineConfig } from 'vitepress'
import { LEGACY_REDIRECTS } from './legacy-redirects'

/**
 * ⚠️ 不要改。这个值必须和 GitHub 仓库名一致。
 *    改成别的 → 线上全站变纯文本（CSS/JS/图片全部 404），本地预览看不出来。
 *    只有仓库改名为 qxdho.github.io 时，才改成 '/'
 */
const BASE = '/miband-dev/'

export default defineConfig({
  lang: 'zh-CN', // 【可改】页面语言。中文填 'zh-CN'

  // 【可改】浏览器标签页上的标题，每个页面会拼成「页面名 | 米环开发文档」
  title: '米环开发文档',

  // 【可改】搜索引擎和分享预览里显示的介绍，建议 80-160 字
  description:
    '小米手环 / 小米手表 Vela 开发文档：表盘、快应用、原生应用与平台资料。',

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

    // 首屏渲染前套用读者上次选的配色（存在 localStorage 的 miband-hue），
    // 否则会先闪一下默认橙色再变色。可选值见 theme/custom.css 的 html[data-hue=...]。
    [
      'script',
      {},
      "try{var h=localStorage.getItem('miband-hue');if(h)document.documentElement.setAttribute('data-hue',h)}catch(e){}",
    ],

    // 旧 IA 的 404 跳转。脚本只在路径命中映射时执行，正常页面不受影响。
    [
      'script',
      {},
      `(function(){var base=${JSON.stringify(BASE)};var map=${JSON.stringify(LEGACY_REDIRECTS)};var p=location.pathname;if(p.indexOf(base)===0){p=p.slice(base.length-1)}else if(p.charAt(0)!=='/'){p='/'+p}if(p.slice(-5)==='.html'){p=p.slice(0,-5)}if(p.length>1&&p.slice(-1)==='/'){p=p.slice(0,-1)}var to=map[p];if(to){location.replace(base+(to.charAt(0)==='/'?to.slice(1):to))}})()`,
    ],

    // 【可改】作者信息
    ['meta', { name: 'author', content: 'miband-dev contributors' }],

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
    siteTitle: '米环开发文档',

    // 【可改】顶部导航按钮。加按钮 → 复制一行改文字和地址；删按钮 → 整行删掉
    //         activeMatch 控制当前在某个板块时哪个按钮高亮，可以不要
    //         items 是下拉菜单，「更多」展开后显示里面的子项
    nav: [
      { text: '开始', link: '/start/', activeMatch: '/start/' },
      { text: '表盘', link: '/watchface/', activeMatch: '/watchface/' },
      { text: '快应用', link: '/quickapp/', activeMatch: '/quickapp/' },
      { text: '原生应用', link: '/native/', activeMatch: '/native/' },
      { text: '平台与工具', link: '/platform/', activeMatch: '/platform/' },
      { text: '关于', link: '/about/', activeMatch: '/about/' },
    ],

    // 【可改】导航栏右侧的社交图标，点开是仓库地址。加图标 → 复制一行换 icon 和 link
    //         icon 只认内置名：github / gitlab / x / discord / youtube 等
    socialLinks: [
      { icon: 'github', link: 'https://github.com/qxdho/miband-dev', ariaLabel: 'GitHub 仓库' },
    ],

    // 【可改】左侧目录。每个大板块只保留一个分组，组内列出该板块全部页面。
    //         进入哪个板块就显示对应的分组；link 不写 .html、不写 docs/。
    sidebar: {
      '/start/': [
        {
          text: '开始',
          collapsed: false,
          items: [
            { text: '从这里开始', link: '/start/' },
            { text: '三条路怎么选', link: '/start/choose-path' },
            { text: '机型能力矩阵', link: '/start/models' },
            { text: '术语表', link: '/start/glossary' },
          ],
        },
      ],
      '/watchface/': [
        {
          text: '表盘',
          collapsed: false,
          items: [
            { text: '表盘总览', link: '/watchface/' },
            { text: '普通表盘', link: '/watchface/normal/' },
            { text: '普通表盘打包', link: '/watchface/normal/package' },
            { text: 'Lua 表盘', link: '/watchface/lua/' },
            { text: 'Lua 表盘能力', link: '/watchface/lua/capabilities' },
            { text: 'Lua 表盘打包', link: '/watchface/lua/package' },
            { text: 'Lua 表盘开发', link: '/watchface/lua/develop' },
            { text: 'Lua 表盘示例', link: '/watchface/lua/examples' },
            { text: '表盘包格式', link: '/watchface/format' },
            { text: '安装表盘', link: '/watchface/install' },
          ],
        },
      ],
      '/quickapp/': [
        {
          text: '快应用',
          collapsed: false,
          items: [
            { text: '介绍', link: '/quickapp/' },
            { text: '环境搭建', link: '/quickapp/setup' },
            { text: '工程结构', link: '/quickapp/structure' },
            { text: '能力', link: '/quickapp/capabilities' },
            { text: '运行时与 fetch', link: '/quickapp/runtime' },
            { text: '打包方式', link: '/quickapp/package' },
            { text: '常见问题', link: '/quickapp/pitfalls' },
          ],
        },
      ],
      '/native/': [
        {
          text: '原生应用',
          collapsed: false,
          items: [
            { text: '介绍', link: '/native/' },
            { text: '支持的设备', link: '/native/devices' },
            { text: '加载方式', link: '/native/loading' },
            { text: '能力', link: '/native/capabilities' },
            { text: '内核模块系统', link: '/native/develop/modules' },
            { text: '最小模块', link: '/native/develop/hello' },
            { text: 'LVGL 与界面', link: '/native/ui/lvgl' },
            { text: '圆环与 ARC 控件', link: '/native/ui/arc' },
            { text: '原生开发模式', link: '/native/ui/patterns' },
            { text: 'Canopus', link: '/native/frameworks/canopus' },
            { text: 'Chaos', link: '/native/frameworks/chaos' },
            { text: 'Chaos 代码审查', link: '/native/frameworks/chaos-review' },
            { text: 'Canopus 地址手册', link: '/native/advanced/addresses' },
            { text: '应用隐藏与免重启', link: '/native/advanced/app-hiding' },
            { text: '控制中心与地址视图', link: '/native/advanced/control-center' },
            { text: '原生示例', link: '/native/examples' },
          ],
        },
      ],
      '/platform/': [
        {
          text: '平台与工具',
          collapsed: false,
          items: [
            { text: '平台总览', link: '/platform/' },
            { text: '固件研究', link: '/platform/firmware/' },
            { text: '固件包格式', link: '/platform/firmware/package' },
            { text: '系统架构', link: '/platform/firmware/architecture' },
            { text: '设备文件系统', link: '/platform/firmware/filesystem' },
            { text: '启动链与救砖', link: '/platform/firmware/recovery' },
            { text: 'BLE 协议与鉴权', link: '/platform/protocol/ble' },
            { text: '网络通路', link: '/platform/protocol/network' },
            { text: '工具索引', link: '/platform/tools/' },
            { text: 'QEMU 模拟器', link: '/platform/tools/emulator' },
            { text: '逆向与复现', link: '/platform/tools/reversing' },
            { text: '参考资料', link: '/platform/reference/references' },
            { text: '示例代码', link: '/platform/reference/examples' },
          ],
        },
      ],
      '/about/': [
        {
          text: '关于',
          collapsed: false,
          items: [
            { text: '关于本站', link: '/about/' },
            { text: '研究历程与误判', link: '/about/history' },
          ],
        },
      ],
    },

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
      copyright: 'Copyright © 2026 米环开发文档 contributors',
    },
  },
})
