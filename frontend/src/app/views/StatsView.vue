<template>
  <div class="panel stats">
    <div class="panel-head">
      <h3>陪伴数据</h3>
      <p>把摸过、喂过、玩过，和这些天的心情，摊开来看一眼。</p>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />

    <template v-else-if="data">
      <!-- 顶部三张数卡 -->
      <div class="stat-cards">
        <div class="stat-card">
          <b class="big">{{ data.days }}</b>
          <span>天 · 从相遇起</span>
        </div>
        <div class="stat-card">
          <b class="big">{{ data.total }}</b>
          <span>次 · 一起互动</span>
        </div>
        <div class="stat-card lv">
          <b class="big">Lv.{{ data.intimacy.level }}</b>
          <span class="lv-title">{{ data.intimacy.title }}</span>
          <i class="lv-bar"><u :style="{ width: data.intimacy.progress + '%' }"></u></i>
        </div>
      </div>

      <!-- 互动构成 + 心情分布 -->
      <div class="chart-row">
        <section class="chart-card">
          <h4 class="chart-title">互动构成</h4>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 120 120" role="img" aria-label="互动构成环形图">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#efe6d5" stroke-width="14" />
              <g transform="rotate(-90 60 60)">
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  stroke="#5f7052" stroke-width="14" stroke-linecap="round"
                  :stroke-dasharray="`${donut.t} ${donut.C - donut.t}`"
                  :stroke-dashoffset="0"
                />
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  stroke="#d98e5f" stroke-width="14" stroke-linecap="round"
                  :stroke-dasharray="`${donut.f} ${donut.C - donut.f}`"
                  :stroke-dashoffset="`${-donut.t}`"
                />
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  stroke="#e0b872" stroke-width="14" stroke-linecap="round"
                  :stroke-dasharray="`${donut.p} ${donut.C - donut.p}`"
                  :stroke-dashoffset="`${-(donut.t + donut.f)}`"
                />
              </g>
              <text x="60" y="57" class="donut-num" text-anchor="middle">{{ data.total }}</text>
              <text x="60" y="74" class="donut-sub" text-anchor="middle">次</text>
            </svg>
            <ul class="legend">
              <li><i style="background:#5f7052"></i>摸摸 {{ data.touch }}</li>
              <li><i style="background:#d98e5f"></i>喂食 {{ data.feed }}</li>
              <li><i style="background:#e0b872"></i>玩耍 {{ data.play }}</li>
            </ul>
          </div>
        </section>

        <section class="chart-card">
          <h4 class="chart-title">心情分布</h4>
          <ul v-if="moodTotal" class="mood-bars">
            <li v-for="m in data.moodDist" :key="m.key">
              <span class="mb-label">{{ m.label }}</span>
              <span class="mb-track">
                <i :style="{ width: pct(m.count, moodTotal), background: m.color }"></i>
              </span>
              <span class="mb-num">{{ m.count }}</span>
            </li>
          </ul>
          <p v-else class="empty-hint">还没有心情记录，记一次就有了。</p>
        </section>
      </div>

      <!-- 亲密度累计曲线 -->
      <section class="chart-card full">
        <h4 class="chart-title">亲密度曲线 <span class="chart-note">越靠上，越亲近</span></h4>
        <svg v-if="curveHasData" class="line" viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="亲密度累计曲线">
          <path :d="curveArea" class="curve-fill" />
          <polyline :points="curvePoints" class="curve-line" />
        </svg>
        <p v-else class="empty-hint">多陪它几天，这里会有一条向上的线。</p>
        <div v-if="curveHasData" class="axis">
          <span>{{ curveStart }}</span>
          <span>{{ curveEnd }}</span>
        </div>
      </section>

      <!-- 最近 30 天热力 -->
      <section class="chart-card full">
        <h4 class="chart-title">最近 30 天 <span class="chart-note">每天陪它的次数</span></h4>
        <svg v-if="heatTotal" class="heat" viewBox="0 0 320 100" preserveAspectRatio="none" role="img" aria-label="最近30天互动柱状图">
          <g>
            <rect
              v-for="(d, i) in data.daily"
              :key="d.date"
              :x="heatX(i)"
              :y="heatY(d.count)"
              :width="heatW"
              :height="heatH(d.count)"
              rx="2"
              class="heat-bar"
            />
          </g>
        </svg>
        <p v-else class="empty-hint">最近还没有互动，轻轻摸它一下吧。</p>
      </section>

      <!-- 本月回顾 -->
      <section class="chart-card full">
        <h4 class="chart-title">这个月</h4>
        <div class="monthly">
          <div class="m-item"><b>{{ data.monthly.interactions }}</b><span>次互动</span></div>
          <div class="m-item"><b>{{ data.monthly.moods }}</b><span>次心情</span></div>
          <div class="m-item"><b>{{ data.monthly.footprints }}</b><span>天来过</span></div>
          <div class="m-item"><b>{{ data.monthly.letters }}</b><span>封信</span></div>
          <div class="m-item"><b>{{ data.monthly.tributes }}</b><span>封思念信</span></div>
        </div>
      </section>
    </template>

    <el-empty v-else description="还没有数据" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from '../ui.js'
import { api } from '../api.js'

const data = ref(null)
const loading = ref(true)

const HEAT_W = 320
const HEAT_BARS = 30
const HEAT_GAP = 3

// 环形图三段弧长
const donut = computed(() => {
  const C = 2 * Math.PI * 48
  const t = data.value?.touch || 0
  const f = data.value?.feed || 0
  const p = data.value?.play || 0
  const sum = t + f + p
  const seg = (n) => (sum ? (n / sum) * C : 0)
  return { t: seg(t), f: seg(f), p: seg(p), C }
})

const moodTotal = computed(() =>
  (data.value?.moodDist || []).reduce((a, m) => a + m.count, 0)
)

// 曲线点与面积
const curvePoints = computed(() => {
  const curve = data.value?.curve || []
  if (!curve.length) return ''
  const W = 320, padL = 4, padR = 4, padT = 10, padB = 14
  const maxXp = Math.max(1, ...curve.map((p) => p.xp))
  const n = curve.length
  return curve
    .map((p, i) => {
      const x = n <= 1 ? W / 2 : padL + (i / (n - 1)) * (W - padL - padR)
      const y = padT + (1 - p.xp / maxXp) * (120 - padT - padB)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const curveArea = computed(() => {
  const pts = curvePoints.value
  if (!pts) return ''
  const first = pts.split(' ')[0]
  const last = pts.split(' ').pop()
  const firstX = first.split(',')[0]
  const lastX = last.split(',')[0]
  return `M ${firstX} 120 L ${pts} L ${lastX} 120 Z`
})

const curveStart = computed(() => shortDate(data.value?.curve?.[0]?.date))
const curveEnd = computed(() => shortDate(data.value?.curve?.[data.value.curve.length - 1]?.date))

// 曲线至少要有 3 个点才画，否则只显示一句提示（避免两三个点贴顶像没渲染）
const curveHasData = computed(() => (data.value?.curve || []).length >= 3)

const heatTotal = computed(() => (data.value?.daily || []).reduce((a, d) => a + d.count, 0))
const heatMax = computed(() =>
  Math.max(1, ...(data.value?.daily || []).map((d) => d.count))
)

const heatW = computed(() => (HEAT_W - HEAT_GAP * (HEAT_BARS - 1)) / HEAT_BARS)
const heatX = (i) => i * (heatW.value + HEAT_GAP)
const heatY = (count) => 100 - (count / heatMax.value) * (100 - 4)
const heatH = (count) => (count / heatMax.value) * (100 - 4) + 0.5

function pct(n, total) {
  return total ? Math.max(2, Math.round((n / total) * 100)) + '%' : '0%'
}

function shortDate(s) {
  return s ? s.slice(5) : ''
}

async function load() {
  try {
    data.value = await api.stats()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.stats {
  max-width: 760px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-card .big {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.stat-card > span {
  font-size: 13px;
  color: var(--muted);
}

.stat-card.lv .lv-title {
  font-size: 14px;
  color: var(--olive-deep);
  font-weight: 600;
}

.lv-bar {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: var(--cream-deep);
  overflow: hidden;
  margin-top: 6px;
}

.lv-bar u {
  display: block;
  height: 100%;
  background: var(--olive);
  border-radius: 999px;
  transition: width 0.4s ease;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.chart-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px;
}

.chart-card.full {
  margin-bottom: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 14px;
  color: var(--ink);
}

.chart-note {
  font-weight: 400;
  font-size: 12.5px;
  color: var(--muted);
  margin-left: 6px;
}

.donut-wrap {
  display: flex;
  align-items: center;
  gap: 18px;
}

.donut {
  width: 110px;
  height: 110px;
  flex: none;
}

.donut-num {
  font-size: 22px;
  font-weight: 700;
  fill: var(--ink);
}

.donut-sub {
  font-size: 11px;
  fill: var(--muted);
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--ink-soft);
}

.legend i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}

.mood-bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.mood-bars li {
  display: grid;
  grid-template-columns: 92px 1fr 26px;
  align-items: center;
  gap: 10px;
}

.mb-label {
  font-size: 12.5px;
  color: var(--ink-soft);
}

.mb-track {
  height: 10px;
  border-radius: 999px;
  background: var(--cream-deep);
  overflow: hidden;
}

.mb-track i {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.mb-num {
  font-size: 12.5px;
  color: var(--muted);
  text-align: right;
}

.line {
  width: 100%;
  height: 130px;
  display: block;
}

.curve-line {
  fill: none;
  stroke: var(--olive);
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.curve-fill {
  fill: rgba(95, 112, 82, 0.1);
}

.axis {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 6px;
}

.heat {
  width: 100%;
  height: 110px;
  display: block;
}

.heat-bar {
  fill: var(--olive);
  opacity: 0.85;
}

.monthly {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.m-item {
  flex: 1;
  min-width: 92px;
  background: var(--cream);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-item b {
  font-size: 20px;
  font-weight: 700;
}

.m-item span {
  font-size: 12px;
  color: var(--muted);
}

.empty-hint {
  font-size: 13.5px;
  color: var(--muted);
  padding: 10px 0;
}

@media (max-width: 560px) {
  .stat-cards {
    grid-template-columns: 1fr 1fr;
  }
  .stat-card.lv {
    grid-column: 1 / -1;
  }
  .chart-row {
    grid-template-columns: 1fr;
  }
  .mood-bars li {
    grid-template-columns: 84px 1fr 24px;
  }
}
</style>
