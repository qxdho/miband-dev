<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import data from '../data/models.json'

type Cap = boolean | 'partial' | 'unknown'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const models = data.models as Array<{
  id: string
  name: string
  nameEn?: string
  screen: [number, number] | null
  radius: number | null
  os: string
  soc: string
  quickapp: Cap
  watchface: Cap
  native: Cap
  flash: Cap
  sources?: string[]
}>

const t = computed(() =>
  isEn.value
    ? {
        model: 'Device',
        screen: 'Screen',
        radius: 'Radius',
        os: 'OS',
        soc: 'SoC',
        quickapp: 'Quick App',
        watchface: 'Watchface',
        native: 'Native',
        flash: 'Flash',
        source: 'Source',
        ok: 'Reported working, not tested',
        partial: 'Partially available',
        no: 'Unavailable',
        unknown: 'Not verified',
        legendOk: 'reported working',
        legendPartial: 'partial / conditional',
        legendNo: 'unavailable',
        legendUnknown: 'unverified',
      }
    : {
        model: '机型',
        screen: '屏幕',
        radius: '圆角',
        os: '系统',
        soc: 'SoC',
        quickapp: '快应用',
        watchface: '表盘',
        native: '原生模块',
        flash: '刷固件',
        source: '来源',
        ok: '据来源可用，尚未亲测',
        partial: '部分可用 / 有条件',
        no: '不可用',
        unknown: '待验证',
        legendOk: '据来源可用',
        legendPartial: '部分/有条件',
        legendNo: '不可用',
        legendUnknown: '待验证',
      },
)

function nameOf(m: (typeof models)[number]): string {
  return isEn.value && m.nameEn ? m.nameEn : m.name
}

function capText(v: Cap | undefined): string {
  if (v === true) return '✓'
  if (v === 'partial') return '◐'
  if (v === false) return '✕'
  return '❓'
}

function capClass(v: Cap | undefined): string {
  if (v === true) return 'cap cap-ok'
  if (v === 'partial') return 'cap cap-partial'
  if (v === false) return 'cap cap-no'
  return 'cap cap-unknown'
}

function capTitle(v: Cap | undefined): string {
  if (v === true) return t.value.ok
  if (v === 'partial') return t.value.partial
  if (v === false) return t.value.no
  return t.value.unknown
}

function screenText(s: [number, number] | null): string {
  return s ? `${s[0]}×${s[1]}` : '❓'
}

function radiusText(r: number | null): string {
  return r == null ? '❓' : `${r}px`
}
</script>

<template>
  <div class="matrix-wrap">
    <table class="model-matrix">
      <thead>
        <tr>
          <th>{{ t.model }}</th>
          <th>{{ t.screen }}</th>
          <th>{{ t.radius }}</th>
          <th>{{ t.os }}</th>
          <th>{{ t.soc }}</th>
          <th>{{ t.quickapp }}</th>
          <th>{{ t.watchface }}</th>
          <th>{{ t.native }}</th>
          <th>{{ t.flash }}</th>
          <th>{{ t.source }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in models" :key="m.id">
          <td class="model-name">
            <strong>{{ nameOf(m) }}</strong>
            <code>{{ m.id }}</code>
          </td>
          <td>{{ screenText(m.screen) }}</td>
          <td>{{ radiusText(m.radius) }}</td>
          <td>{{ m.os }}</td>
          <td>{{ m.soc }}</td>
          <td><span :class="capClass(m.quickapp)" :title="capTitle(m.quickapp)">{{ capText(m.quickapp) }}</span></td>
          <td><span :class="capClass(m.watchface)" :title="capTitle(m.watchface)">{{ capText(m.watchface) }}</span></td>
          <td><span :class="capClass(m.native)" :title="capTitle(m.native)">{{ capText(m.native) }}</span></td>
          <td><span :class="capClass(m.flash)" :title="capTitle(m.flash)">{{ capText(m.flash) }}</span></td>
          <td>
            <a
              v-if="m.sources && m.sources.length"
              :href="m.sources[0]"
              target="_blank"
              rel="noreferrer"
            >{{ t.source }}</a>
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <p class="matrix-legend">
    <span class="cap cap-ok">✓</span> {{ t.legendOk }} ·
    <span class="cap cap-partial">◐</span> {{ t.legendPartial }} ·
    <span class="cap cap-no">✕</span> {{ t.legendNo }} ·
    <span class="cap cap-unknown">❓</span> {{ t.legendUnknown }}
  </p>
</template>
