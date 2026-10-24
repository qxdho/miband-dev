import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ModelMatrix from '../components/ModelMatrix.vue'
import StatusBadge from '../components/StatusBadge.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ModelMatrix', ModelMatrix)
    app.component('StatusBadge', StatusBadge)
  },
} satisfies Theme
