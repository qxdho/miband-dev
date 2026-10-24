import { ref } from 'vue'

export interface Hue {
  id: string
  label: string
  labelEn: string
  /** 色板上显示的圆点颜色，用中间明度的鲜色，浅色深色背景上都看得见 */
  swatch: string
}

/**
 * 可选配色。每一项在 theme/custom.css 里都有对应的
 * html[data-hue='id'] 与 html.dark[data-hue='id'] 两组变量。
 * 加一种配色 = 这里加一项 + custom.css 加两组变量。
 */
export const HUES: Hue[] = [
  { id: 'orange', label: '小米橙', labelEn: 'Orange', swatch: '#ea580c' },
  { id: 'blue', label: '海蓝', labelEn: 'Blue', swatch: '#2563eb' },
  { id: 'green', label: '草绿', labelEn: 'Green', swatch: '#16a34a' },
  { id: 'purple', label: '黛紫', labelEn: 'Purple', swatch: '#7c3aed' },
  { id: 'teal', label: '青碧', labelEn: 'Teal', swatch: '#0d9488' },
  { id: 'pink', label: '品红', labelEn: 'Pink', swatch: '#db2777' },
]

export const HUE_KEY = 'miband-hue'
export const DEFAULT_HUE = 'orange'

/** 当前配色。两个 ThemePicker 实例（导航栏 / 移动端菜单）共用这一份状态 */
export const currentHue = ref(DEFAULT_HUE)

export function setHue(id: string) {
  currentHue.value = id
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-hue', id)
  try {
    localStorage.setItem(HUE_KEY, id)
  } catch {
    // 隐私模式下 localStorage 会抛错，忽略即可，只影响记住选择
  }
}

/** 页面加载后把 <html data-hue> 的值同步回 Vue，用于高亮当前配色 */
export function initHue() {
  if (typeof document === 'undefined') return
  const id = document.documentElement.getAttribute('data-hue')
  if (id && HUES.some((h) => h.id === id)) currentHue.value = id
}
