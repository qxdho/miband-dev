<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const props = withDefaults(
  defineProps<{
    status: 'tested' | 'sourced' | 'unverified'
    verified?: string
    firmware?: string
  }>(),
  { verified: '', firmware: '' },
)

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const meta = computed(() => {
  if (isEn.value) {
    switch (props.status) {
      case 'tested':
        return { label: 'Tested', cls: 'badge badge-tested', hint: 'Reproduced on a physical device by the author' }
      case 'sourced':
        return { label: 'Sourced', cls: 'badge badge-sourced', hint: 'Compiled from public sources, not tested' }
      default:
        return { label: 'Unverified', cls: 'badge badge-unverified', hint: 'For reference only, verify before relying on it' }
    }
  }
  switch (props.status) {
    case 'tested':
      return { label: '亲测', cls: 'badge badge-tested', hint: '作者在真机上跑通过' }
    case 'sourced':
      return { label: '据来源', cls: 'badge badge-sourced', hint: '内容整理自公开来源，未亲测' }
    default:
      return { label: '未验证', cls: 'badge badge-unverified', hint: '仅供参考，请自行核实' }
  }
})
</script>

<template>
  <span class="status-line">
    <span :class="meta.cls" :title="meta.hint">{{ meta.label }}</span>
    <span v-if="verified" class="status-meta">{{ isEn ? 'Last checked' : '最后核对' }} {{ verified }}</span>
    <span v-if="firmware" class="status-meta">{{ isEn ? 'Firmware' : '适用固件' }} {{ firmware }}</span>
  </span>
</template>
