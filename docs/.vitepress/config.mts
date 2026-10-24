/**
 * VitePress 站点配置文件
 *
 * ============================================================
 * 这个文件决定了：网站的地址前缀、标题、顶部导航、左侧目录、
 * 搜索框、页脚，以及各种界面文字。
 * 它不影响文章内容 —— 文章都在 docs/ 下的 .md 文件里。
 *
 * 【改前必读】
 * 1. 只改引号里的文字（比如 '开始'），不要删掉括号、逗号、冒号。
 * 2. 每一项之间用逗号 , 隔开，最后一项后面可以不加。
 * 3. 数组用 [ ]，对象用 { }，两者不要混。
 * 4. 改完执行 `pnpm docs:dev` 看效果，没问题再 git push。
 * 5. 改坏了用 `git checkout docs/.vitepress/config.mts` 还原。
 *
 * 【文件结构导航】直接搜索左边这些关键词就能跳过去
 *   ⚠️ 第 45 行    base（部署路径，最危险的一项）
 *   第 48 行起     站点元信息（标题、描述、SEO）
 *   第 101 行起    logo 与站名
 *   第 120 行起    顶部导航 nav
 *   第 159 行起    左侧目录 sidebar
 *   第 220 行起    搜索框
 *   第 242 行起    各处界面文字
 *   第 268 行起    页脚
 * ============================================================
 */

import { defineConfig } from 'vitepress'

// ─── 部署路径（base）────────────────────────────────────────
// 本站发布在 https://qxdho.github.io/miband-dev/，属于「项目页」
// （地址后面还挂着 /miband-dev/ 这一层）。
//
// 所以这里必须是 '/miband-dev/'，和 GitHub 上的仓库名保持一致。
//
// 改错的后果：网站在本地看起来完全正常，但推到 GitHub 后
//            样式、图片、脚本全部 404，页面变成纯文本。
//            —— 这是本项目最容易犯、也最难查的错。
//
// 什么时候才需要改？
//   只有当仓库改名为 qxdho.github.io 时，才改成 '/'。
//   那时候网站会变成 https://qxdho.github.io/ 根路径。
//
// 改仓库名的话，这里必须同步改，然后重新提交推送。
const BASE = '/miband-dev/'

export default defineConfig({
  // ─── 站点元信息 ────────────────────────────────────────────

  // 页面语言。'zh-CN' 让浏览器知道这是简体中文，
  // 影响字体渲染、拼音排版、屏幕阅读器发音。
  lang: 'zh-CN',

  // 站点标题。显示在：浏览器标签页、搜索结果、导航栏左上角。
  // 每个页面会自动拼成「页面标题 | 米环开发手册」。
  title: '米环开发手册',

  // 站点描述。显示在：搜索引擎结果、分享到社交平台时的预览文字。
  // 建议 80-160 字，写清这个站是干什么的。
  description:
    '小米手环 / 小米手表开发者资料库：快应用、表盘、固件研究、原生应用、BLE 协议与工具索引。只做国行，非官方。',

  // 见文件开头定义。再次强调：这一行不要动。
  base: BASE,

  // 生成的网址去掉 .html 后缀。
  // true：  /quickapp/setup
  // false： /quickapp/setup.html
  // 保持 true，所有站内链接都不要写 .html。
  cleanUrls: true,

  // 页面底部显示「最后更新：某年某月某日」。
  // 时间取自 git 提交记录，所以必须已提交才看得到。
  lastUpdated: true,

  // ─── 注入到每个页面 <head> 里的标签 ───────────────────────
  // 格式：['标签名', { 属性: 值 }]
  head: [
    // 手机浏览器地址栏的颜色（Android Chrome）。可改成 '#0ea5e9' 等任意色值。
    ['meta', { name: 'theme-color', content: '#0ea5e9' }],

    // 作者信息。
    ['meta', { name: 'author', content: '米环开发手册 contributors' }],

    // 关键词。对搜索引擎排名影响很小，但填了没坏处。
    // 用英文逗号分隔，不要有空格。
    [
      'meta',
      {
        name: 'keywords',
        content: '小米手环,快应用,VelaOS,NuttX,表盘,固件,原生应用,开发者文档',
      },
    ],
  ],

  // ─── 主题配置（界面外观）──────────────────────────────────
  themeConfig: {
    // 导航栏左上角的图标。文件在 docs/public/logo.svg。
    // 注意：这里写 '/logo.svg'，不要写成 '/miband-dev/logo.svg'，
    //       系统会自动加上 BASE 前缀。
    logo: '/logo.svg',

    // 图标旁边显示的文字。
    // 如果不想显示文字，删掉这行即可（只留 logo）。
    siteTitle: '米环开发手册',

    // ─── 顶部导航栏（nav）─────────────────────────────────
    // 平铺在页面最上方的入口。数组里每一项就是一个按钮。
    //
    // 字段说明：
    //   text         按钮上显示的文字
    //   link         点击跳转的地址（站内路径，不带 .html）
    //   activeMatch  当前在哪个路径下时这个按钮高亮（可选）
    //   items        【下拉菜单】用这个代替 link，里面再放子项
    //
    // 【加一个新按钮】复制一整行，改文字和地址：
    //   { text: '新页面', link: '/新路径/' },
    //
    // 【删一个按钮】整行删掉。
    nav: [
      { text: '开始', link: '/start/', activeMatch: '/start/' },
      { text: '快应用', link: '/quickapp/', activeMatch: '/quickapp/' },
      { text: '表盘', link: '/watchface/', activeMatch: '/watchface/' },
      { text: '固件', link: '/firmware/', activeMatch: '/firmware/' },
      { text: '原生', link: '/native/', activeMatch: '/native/' },

      // 「更多」是一个下拉菜单：鼠标移上去才展开。
      // 因为顶部放不下 10 个按钮，剩下的收进这里。
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

    // ─── 左侧目录（sidebar）───────────────────────────────
    // 全站共用这一份目录，不是每个板块各配一份。
    //
    // 为什么这样设计：读者在任何页面都能看到全站结构，
    // 不用先「进到某个板块」才知道有哪些内容。
    //
    // 结构：
    //   text       分组标题（不可点击）
    //   collapsed  true = 默认折叠；false = 默认展开
    //   items      组内的页面列表
    //
    // 【加一个页面】
    //   1. 先把 .md 文件建好，比如 docs/quickapp/manifest.md
    //   2. 在对应分组的 items 里加一行：
    //        { text: '工程结构', link: '/quickapp/manifest' },
    //   3. link 里【不要】写 .html，也不要写 docs/
    //
    // 【注意】建了 .md 却忘了在这里加一行，
    //         页面能访问（知道网址的情况下），但目录里点不到。
    sidebar: [
      {
        text: '开始',
        collapsed: true, // 想让它默认展开，把 true 改成 false
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
          // 以后写好的快应用页面，照上面格式往这里加
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

    // ─── 搜索框 ──────────────────────────────────────────
    // provider: 'local' = 浏览器本地搜索。
    //   ✅ 免费、不用联网、不用注册任何服务
    //   ✅ 构建时把所有文章索引成一个文件，打开网页时下载
    //   ❌ 文章特别多（几千页）时索引文件会变大
    // 本站规模完全够用，不需要换成 Algolia 之类的付费服务。
    search: {
      provider: 'local',
      options: {
        // 下面全是界面上的按钮文字，可以按喜好改。
        translations: {
          button: {
            buttonText: '搜索文档', // 搜索框里的占位文字
            buttonAriaLabel: '搜索文档', // 读屏软件念出来的文字
          },
          modal: {
            noResultsText: '没有找到结果', // 搜不到时显示
            resetButtonTitle: '清除查询条件', // 清除按钮
            footer: {
              selectText: '选择', // 键盘提示
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    // ─── 零散的界面文字 ───────────────────────────────────
    // 这些是页面各个角落的小字，不需要翻译成英文，直接写中文即可。

    // 右侧「本页目录」浮层：只显示 h2 和 h3 标题（[2, 3]）。
    // 想连 h4 一起显示就改成 [2, 4]。
    outline: { label: '本页目录', level: [2, 3] },

    // 页面底部的「上一篇 / 下一篇」导航按钮。
    docFooter: { prev: '上一篇', next: '下一篇' },

    // 页脚里的「最后更新：xxxx」（需要 lastUpdated: true）。
    lastUpdatedText: '最后更新',

    // 右下角「回到顶部」按钮的提示文字。
    returnToTopLabel: '回到顶部',

    // 手机端左上角「目录」按钮的提示文字。
    sidebarMenuLabel: '目录',

    // 右上角月牙/太阳图标的提示文字（暗色模式开关）。
    // 暗色模式是内置的，不用另外配置。
    darkModeSwitchLabel: '主题',

    // 如果以后加多语言，切换菜单的提示文字。
    langMenuLabel: '语言',

    // ─── 页脚 ────────────────────────────────────────────
    // 每个页面最底部显示的内容。
    //
    // 【重要】message 里「非官方，与小米公司无关联」这句话
    // 是项目的法律红线（见 CONTRIBUTING.md），不要删掉。
    // 它避免本站被误解为小米官方渠道。
    footer: {
      message:
        '非官方项目，与小米公司无关联。文档采用 CC BY-SA 4.0，代码采用 MIT。',
      copyright: 'Copyright © 2026 米环开发手册 contributors',
    },
  },
})
