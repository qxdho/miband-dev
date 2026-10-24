<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'
import { HUES, currentHue, initHue, setHue } from './hues'

withDefaults(defineProps<{ variant?: 'nav' | 'screen' }>(), {
  variant: 'nav',
})

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
const label = computed(() => (isEn.value ? 'Accent color' : '主题色'))

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const current = computed(() => HUES.find((h) => h.id === currentHue.value) ?? HUES[0])

function pick(id: string) {
  setHue(id)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  initHue()
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <!-- 桌面端：导航栏上的小圆点按钮，点开展开色板 -->
  <div v-if="variant === 'nav'" ref="root" class="hue-picker hue-picker--nav">
    <button
      type="button"
      class="hue-btn"
      :aria-label="label"
      :aria-expanded="open"
      :title="label"
      @click="open = !open"
    >
      <span class="hue-dot" :style="{ background: current.swatch }" />
    </button>

    <div v-if="open" class="hue-panel" role="group" :aria-label="label">
      <button
        v-for="h in HUES"
        :key="h.id"
        type="button"
        class="hue-item"
        :class="{ 'is-active': h.id === currentHue }"
        :title="isEn ? h.labelEn : h.label"
        :aria-label="isEn ? h.labelEn : h.label"
        :aria-pressed="h.id === currentHue"
        @click="pick(h.id)"
      >
        <span class="hue-dot" :style="{ background: h.swatch }" />
      </button>
    </div>
  </div>

  <!-- 移动端：直接排在折叠菜单里，不用展开层 -->
  <div v-else class="hue-picker hue-picker--screen">
    <p class="hue-title">{{ label }}</p>
    <div class="hue-row" role="group" :aria-label="label">
      <button
        v-for="h in HUES"
        :key="h.id"
        type="button"
        class="hue-item"
        :class="{ 'is-active': h.id === currentHue }"
        :title="isEn ? h.labelEn : h.label"
        :aria-label="isEn ? h.labelEn : h.label"
        :aria-pressed="h.id === currentHue"
        @click="pick(h.id)"
      >
        <span class="hue-dot" :style="{ background: h.swatch }" />
      </button>
    </div>
  </div>
</template>
