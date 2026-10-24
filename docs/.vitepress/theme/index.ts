import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ModelMatrix from '../components/ModelMatrix.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ThemePicker from './ThemePicker.vue'
import './custom.css'

export default {
  extends: DefaultTheme,

  // 配色选择器放两个位置：桌面端在导航栏，移动端在折叠菜单里
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(ThemePicker, { variant: 'nav' }),
      'nav-screen-content-after': () => h(ThemePicker, { variant: 'screen' }),
    }),

  enhanceApp({ app }) {
    app.component('ModelMatrix', ModelMatrix)
    app.component('StatusBadge', StatusBadge)
  },
} satisfies Theme
