<template>
  <div class="scene-card card">
    <!-- 场景选择条 -->
    <div class="nn-scene-bar">
      <div
        v-for="s in SCENES"
        :key="s.id"
        class="nn-scene-chip"
        :class="{ on: s.id === scene }"
        @click="switchScene(s.id)"
      >
        <span class="nn-scene-chip-icon">{{ s.icon }}</span>
        <span class="nn-scene-chip-name">{{ s.name }}</span>
      </div>
    </div>

    <!-- 场景舞台：全部用 CSS 绘制，抠图主体靠轮廓站在场景里 -->
    <div
      ref="stageEl"
      class="nn-stage"
      :class="['nn-stage-' + scene, 'nn-mode-' + mode, { paused }]"
      @pointermove="onStageMove"
      @pointerleave="resetLook"
    >
      <!-- 草地 -->
      <template v-if="scene === 'grass'">
        <div class="nn-sun nn-sun-grass"></div>
        <div class="nn-cloud nn-cloud-a"></div>
        <div class="nn-cloud nn-cloud-b"></div>
        <div class="nn-hill nn-hill-back"></div>
        <div class="nn-hill nn-hill-front"></div>
        <div class="nn-tuft nn-tuft-1"></div>
        <div class="nn-tuft nn-tuft-2"></div>
        <div class="nn-ground-grass"></div>
      </template>

      <!-- 窗台 -->
      <template v-else-if="scene === 'window'">
        <div class="nn-win-glass"></div>
        <div class="nn-win-bar-v"></div>
        <div class="nn-win-bar-h"></div>
        <div class="nn-sill"></div>
        <div class="nn-pot">
          <div class="nn-pot-leaf"></div>
          <div class="nn-pot-body"></div>
        </div>
        <div class="nn-ground-floor"></div>
        <div class="nn-win-light"></div>
      </template>

      <!-- 客厅 -->
      <template v-else-if="scene === 'living'">
        <div class="nn-ground-wood"></div>
        <div class="nn-lv-rug"></div>
        <div class="nn-lv-sofa-back"></div>
        <div class="nn-lv-sofa"></div>
        <div class="nn-lv-lamp-pole"></div>
        <div class="nn-lv-lamp-base"></div>
        <div class="nn-lv-lamp"></div>
      </template>

      <!-- 海边 -->
      <template v-else-if="scene === 'seaside'">
        <div class="nn-ss-sun"></div>
        <div class="nn-ss-wave nn-ss-wave-1"></div>
        <div class="nn-ss-wave nn-ss-wave-2"></div>
      </template>

      <!-- 星空 -->
      <template v-else>
        <div class="nn-nt-galaxy"></div>
        <div class="nn-nt-moon"></div>
        <div
          v-for="s in STARS"
          :key="s.key"
          class="nn-nt-star"
          :class="s.size"
          :style="{ left: s.left + '%', top: s.top + '%', animationDelay: s.delay + 's' }"
        ></div>
        <div class="nn-nt-hill"></div>
        <div class="nn-nt-fly nn-nt-fly-1"></div>
        <div class="nn-nt-fly nn-nt-fly-2"></div>
      </template>

      <!-- 纪念植物：一株慢慢长的花，成长阶段由浇水次数派生 -->
      <div class="nn-plant" :class="['p-' + plantKey, { watering }]" :title="plantName">
        <div class="nn-plant-body">
          <span class="nn-stem"></span>
          <span class="nn-leaf nn-leaf-1"></span>
          <span class="nn-leaf nn-leaf-2"></span>
          <span class="nn-leaf nn-leaf-3"></span>
          <span class="nn-flower"></span>
        </div>
        <div class="nn-plant-soil"></div>
        <div class="nn-plant-pot"></div>
        <span v-if="watering" class="nn-drop nn-drop-1"></span>
        <span v-if="watering" class="nn-drop nn-drop-2"></span>
      </div>

      <!-- 宠物层：气泡 + 食盆 + 小球 + 主体 + 影子 -->
      <div class="nn-pet-layer">
        <!-- 小球：可拖拽，松手按重力弹跳滚动 -->
        <div
          v-if="ball.on"
          ref="ballEl"
          class="nn-play-ball"
          :class="{ dragging: ball.dragging }"
          :style="ballStyle"
          @pointerdown="onBallDown"
        >
          🎾
        </div>

        <div
          ref="anchorEl"
          class="nn-pet-anchor"
          :class="{ dragging, flying }"
          :style="anchorStyle"
          @pointerdown="onPointerDown"
        >
          <div v-if="bubble" class="nn-bubble-mini">{{ bubble }}</div>
          <!-- 食盆挂在宠物锚点上，永远在它脚边，不用另算百分比 -->
          <div v-if="bowl.on" class="nn-bowl">
            <span v-for="n in bowl.food" :key="n" class="nn-bowl-food">🍖</span>
          </div>
          <div class="nn-pet-shadow"></div>
          <div ref="wrapEl" class="nn-pet-wrap">
            <div class="nn-pet-body" :class="motionClass">
              <img
                v-if="cutout"
                class="nn-pet-cut"
                draggable="false"
                :src="cutout"
                :alt="pet.name"
              />
              <img
                v-else-if="pet.photo"
                class="nn-pet-img"
                draggable="false"
                :src="pet.photo"
                :alt="pet.name"
              />
              <div v-else class="nn-pet-generic">{{ typeEmoji }}</div>
            </div>
            <div v-if="expression" class="nn-pet-face">{{ expression }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 宠物信息 -->
    <div class="nn-scene-info">
      <div class="nn-pet-name">{{ pet.name }}</div>
      <div class="nn-pet-status">{{ status }}</div>
      <div v-if="greeting" class="nn-pet-greeting">{{ greeting }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import '../styles/scene.css'

const props = defineProps({
  pet: { type: Object, required: true },
  greeting: { type: String, default: '' },
  // 存在强度：still=静静留影 / gentle=轻微陪伴 / active=熟悉互动（默认）
  mode: { type: String, default: 'active' },
  // 一键暂停：停掉所有动画（呼吸、待机、拖拽、抛投、道具）
  paused: { type: Boolean, default: false }
})

const emit = defineEmits(['interact'])

const isStill = computed(() => props.mode === 'still')
const isGentle = computed(() => props.mode === 'gentle')
const isActive = computed(() => props.mode !== 'still' && props.mode !== 'gentle')
// 道具（小球/食盆）只在「熟悉互动」且未暂停时出现
const propsOn = computed(() => isActive.value && !props.paused)

const SCENES = [
  { id: 'grass', name: '草地', icon: '🌿' },
  { id: 'window', name: '窗台', icon: '🪟' },
  { id: 'living', name: '客厅', icon: '🛋️' },
  { id: 'seaside', name: '海边', icon: '🌊' },
  { id: 'night', name: '星空', icon: '🌙' }
]

const STARS = [
  { key: 1, left: 10, top: 20, delay: 0, size: 'lg' },
  { key: 2, left: 22, top: 36, delay: 0.7, size: 'sm' },
  { key: 3, left: 34, top: 12, delay: 1.4, size: 'sm' },
  { key: 4, left: 46, top: 30, delay: 2.1, size: 'lg' },
  { key: 5, left: 58, top: 16, delay: 1.1, size: 'sm' },
  { key: 6, left: 70, top: 38, delay: 0.4, size: 'sm' },
  { key: 7, left: 82, top: 14, delay: 2.6, size: 'lg' },
  { key: 8, left: 92, top: 30, delay: 0.9, size: 'sm' },
  { key: 9, left: 16, top: 46, delay: 1.8, size: 'sm' },
  { key: 10, left: 40, top: 44, delay: 0.2, size: 'sm' },
  { key: 11, left: 64, top: 46, delay: 2.9, size: 'sm' },
  { key: 12, left: 88, top: 44, delay: 1.3, size: 'sm' }
]

const TYPE_EMOJI = { cat: '🐱', dog: '🐶', other: '🐾' }
const GROUND_Y = 26 // 宠物站立的默认地面高度（px）
const BALL_GROUND = 18
const PET_G = 2600 // 抛投重力 px/s²
const BALL_G = 2400

const scene = ref(loadScene())
const bubble = ref('')
const expression = ref('')
const animClass = ref('')
const food = ref(false)

const stageEl = ref(null)
const anchorEl = ref(null)
const wrapEl = ref(null)
const ballEl = ref(null)

const idleClass = ref('')
const dragging = ref(false)
const flying = ref(false)
const watering = ref(false)
const petPos = reactive({ x: 50, y: GROUND_Y })

const ball = reactive({ on: false, x: 50, y: BALL_GROUND, dragging: false })
const bowl = reactive({ on: false, food: 0 })

let bubbleTimer = null
let animTimer = null
let idleTimer = null
let waterTimer = null
let bowlTimers = []
let ballRaf = 0
let reducedMotion = false

const cutout = computed(() => props.pet.cutout || '')
const typeEmoji = computed(() => TYPE_EMOJI[props.pet.type] || '🐾')
const plantKey = computed(() => props.pet.plant?.key || 'seed')
const plantName = computed(() => props.pet.plant?.name || '纪念植物')

// 动作优先级：互动 > 飞行 > 拖拽 > 待机 > 基础呼吸
const motionClass = computed(() => {
  if (animClass.value) return animClass.value
  if (flying.value) return 'anim-fly'
  if (dragging.value) return 'anim-drag'
  if (idleClass.value) return idleClass.value
  return ''
})

const anchorStyle = computed(() => ({
  left: petPos.x + '%',
  bottom: petPos.y + 'px'
}))

const ballStyle = computed(() => ({
  left: ball.x + '%',
  bottom: ball.y + 'px'
}))

// 场景里它正在干嘛（随场景变化，比一句通用的更有画面感）
const SCENE_STATUS = {
  grass: ['在草地上打滚 🌿', '追一只蝴蝶 🦋', '闻闻小花香不香 🌼'],
  window: ['趴在窗台晒太阳 ☀️', '看楼下的鸟飞过 🐦', '在窗边打盹 😴'],
  living: ['窝在沙发上发呆 🛋️', '把玩具推到沙发底下 🎾', '守着暖黄的灯光 💡'],
  seaside: ['在沙滩上追浪花 🌊', '被海风吹得眯眼睛 😌', '踩着自己的影子走 🐾'],
  night: ['数着星星打盹 🌙', '在月光下轻轻打呼 💤', '等一颗流星划过 ✨']
}

const status = computed(() => {
  const arr = SCENE_STATUS[scene.value] || []
  // 按天轮换，避免每次进页面都跳同一句
  const day = Math.floor(Date.now() / 86400000)
  return arr[day % arr.length]
})

/** 按本地时间推荐的场景：清晨/白天草地、傍晚海边、夜里星空。 */
function sceneByHour() {
  const h = new Date().getHours()
  if (h >= 6 && h < 10) return 'window'
  if (h >= 10 && h < 17) return 'grass'
  if (h >= 17 && h < 20) return 'seaside'
  return 'night'
}

function loadScene() {
  try {
    // 用户手动选过就尊重选择，一天内不再被时间覆盖
    const picked = localStorage.getItem('nn_scene_pick')
    const today = new Date().toDateString()
    if (picked) {
      const { id, day } = JSON.parse(picked)
      if (day === today && SCENES.some((x) => x.id === id)) return id
    }
    const s = localStorage.getItem('nn_scene')
    if (s && SCENES.some((x) => x.id === s)) return s
  } catch (e) {
    /* ignore */
  }
  return sceneByHour()
}

function switchScene(id, manual = true) {
  scene.value = id
  try {
    localStorage.setItem('nn_scene', id)
    if (manual) {
      localStorage.setItem(
        'nn_scene_pick',
        JSON.stringify({ id, day: new Date().toDateString() })
      )
    }
  } catch (e) {
    /* ignore */
  }
  // 切场景：回到该场景记忆位置（无则居中）
  petPos.x = 50
  petPos.y = GROUND_Y
  loadPos()
}

function loadPos() {
  try {
    const s = localStorage.getItem('nn_petpos_' + scene.value)
    if (s) {
      const p = JSON.parse(s)
      petPos.x = p.x
      // y 不记忆，始终站在地面
    }
  } catch (e) {
    /* ignore */
  }
}

function savePos() {
  try {
    // 只记忆水平位置，垂直始终落回地面
    localStorage.setItem('nn_petpos_' + scene.value, JSON.stringify({ x: petPos.x }))
  } catch (e) {
    /* ignore */
  }
}

const REACTION = { touch: '😌', feed: '🤤', play: '😸', catch: '😆', pounce: '🐾' }
const ANIM = { touch: 'anim-touch', feed: 'anim-feed', play: 'anim-play', catch: 'anim-catch' }

/** 触发一次互动表现：气泡 + 表情 + 动作动画 + 零食/小球特效。 */
function play(action, line) {
  // 打断待机，互动优先
  clearTimeout(idleTimer)
  idleClass.value = ''

  bubble.value = line || ''
  clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => (bubble.value = ''), 4200)

  expression.value = REACTION[action] || ''
  animClass.value = ANIM[action] || ''
  food.value = action === 'feed'

  if (action === 'feed' && propsOn.value) showBowl()
  if (action === 'play' && propsOn.value) launchBall()

  clearTimeout(animTimer)
  animTimer = setTimeout(
    () => {
      animClass.value = ''
      expression.value = ''
      food.value = false
      scheduleIdle()
    },
    action === 'play' ? 1300 : 1400
  )
}

/* ---- 食盆 ---- */
function showBowl() {
  bowl.on = true
  bowl.food = 3
  clearBowlTimers()
  bowlTimers.push(setTimeout(() => (bowl.food = 2), 700))
  bowlTimers.push(setTimeout(() => (bowl.food = 1), 1400))
  bowlTimers.push(setTimeout(() => (bowl.food = 0), 2100))
  bowlTimers.push(setTimeout(() => (bowl.on = false), 3600))
}

function clearBowlTimers() {
  bowlTimers.forEach((t) => clearTimeout(t))
  bowlTimers = []
}

/* ---- 小球：弹出 → 弹跳滚动，可拖拽 ---- */
function launchBall() {
  if (ballRaf) cancelAnimationFrame(ballRaf)
  ball.on = true
  ball.dragging = false
  const rect = stageEl.value.getBoundingClientRect()
  const w = rect.width
  let x = (petPos.x / 100) * w
  let y = petPos.y + 34
  let vx = (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 200)
  let vy = 720
  let bounces = 0
  let last = performance.now()
  const minX = 0.1 * w
  const maxX = 0.9 * w

  const step = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000)
    last = now
    vy -= BALL_G * dt
    x += vx * dt
    y += vy * dt
    if (x < minX) {
      x = minX
      vx = -vx * 0.6
    }
    if (x > maxX) {
      x = maxX
      vx = -vx * 0.6
    }
    if (y < BALL_GROUND) {
      y = BALL_GROUND
      bounces++
      vy = -vy * 0.52
      vx *= 0.7
      if (bounces > 4 || Math.abs(vy) < 140) {
        ball.x = (x / w) * 100
        ball.y = BALL_GROUND
        ballRaf = 0
        return
      }
    }
    ball.x = (x / w) * 100
    ball.y = y
    ballRaf = requestAnimationFrame(step)
  }
  ballRaf = requestAnimationFrame(step)
}

let ballDrag = null

function onBallDown(e) {
  if (e.button !== undefined && e.button !== 0) return
  e.stopPropagation()
  ball.dragging = true
  if (ballRaf) {
    cancelAnimationFrame(ballRaf)
    ballRaf = 0
  }
  const rect = stageEl.value.getBoundingClientRect()
  if (ballEl.value && e.pointerId != null) {
    try {
      ballEl.value.setPointerCapture(e.pointerId)
    } catch (err) {
      /* ignore */
    }
  }
  ballDrag = { rect, x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', onBallMove)
  window.addEventListener('pointerup', onBallUp, { once: true })
  window.addEventListener('pointercancel', onBallUp, { once: true })
}

function onBallMove(e) {
  if (!ballDrag) return
  const { rect } = ballDrag
  const pct = ((e.clientX - rect.left) / rect.width) * 100
  ball.x = Math.max(6, Math.min(94, pct))
  // 球可以被拎到空中，限在舞台内
  ball.y = Math.max(BALL_GROUND, Math.min(rect.height - 60, rect.bottom - e.clientY))
}

function onBallUp() {
  window.removeEventListener('pointermove', onBallMove)
  window.removeEventListener('pointerup', onBallUp)
  window.removeEventListener('pointercancel', onBallUp)
  ballDrag = null
  if (!ball.dragging) return
  ball.dragging = false
  // 松手：让它从当前高度自由落体
  const rect = stageEl.value.getBoundingClientRect()
  const w = rect.width
  let x = (ball.x / 100) * w
  let y = ball.y
  let vx = 0
  let vy = 0
  let bounces = 0
  let last = performance.now()
  const step = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000)
    last = now
    vy -= BALL_G * dt
    y += vy * dt
    if (y < BALL_GROUND) {
      y = BALL_GROUND
      bounces++
      vy = -vy * 0.5
      vx *= 0.8
      if (bounces > 3 || Math.abs(vy) < 120) {
        ball.y = BALL_GROUND
        ballRaf = 0
        return
      }
    }
    ball.y = y
    ballRaf = requestAnimationFrame(step)
  }
  ballRaf = requestAnimationFrame(step)
}

/* ---- 视线跟随：宠物整体朝光标方向微微偏移 ---- */
let lookX = 0
let lookY = 0
let lookRaf = 0

function applyLook() {
  lookRaf = 0
  if (!wrapEl.value) return
  wrapEl.value.style.transform =
    lookX || lookY ? `translate(${lookX.toFixed(2)}px, ${lookY.toFixed(2)}px)` : ''
}

function scheduleLook() {
  if (!lookRaf) lookRaf = requestAnimationFrame(applyLook)
}

function onStageMove(e) {
  if (reducedMotion || dragging.value || flying.value || props.paused || isStill.value) return
  const el = anchorEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const dx = e.clientX - (r.left + r.width / 2)
  const dy = e.clientY - (r.top + r.height / 2)
  const d = Math.hypot(dx, dy)
  if (d < 1) return
  const k = Math.min(1, d / 240) // 越远偏得越多，但最多 1
  lookX = (dx / d) * k * 3.4
  lookY = (dy / d) * k * 2.4
  scheduleLook()
}

function resetLook() {
  if (!lookX && !lookY) return
  lookX = 0
  lookY = 0
  scheduleLook()
}

/* ---- 待机动作状态机 ---- */
const IDLE_ACTIONS = {
  blink: { cls: 'anim-blink', face: '', dur: 900 },
  look: { cls: 'anim-look', face: '👀', dur: 2200 },
  tilt: { cls: 'anim-tilt', face: '❓', dur: 1800 },
  nod: { cls: 'anim-nod', face: '', dur: 1400 },
  groom: { cls: 'anim-groom', face: '😌', dur: 2400 },
  yawn: { cls: 'anim-yawn', face: '🥱', dur: 1600 },
  stretch: { cls: 'anim-stretch', face: '😌', dur: 2000 },
  nap: { cls: 'anim-nap', face: '😴', dur: 3200 }
}
// 加权池：轻动作（眨眼/东张西望/点头）更频繁，打盹/伸懒腰较少
const IDLE_POOL = [
  'blink', 'blink', 'blink', 'look', 'look', 'tilt', 'tilt',
  'nod', 'nod', 'groom', 'yawn', 'stretch', 'nap'
]
// 轻微陪伴档：只保留最轻的动作（眨眼/张望/点头），不打盹不伸懒腰不叫
const GENTLE_POOL = ['blink', 'blink', 'blink', 'look', 'tilt', 'nod']

function pickIdle() {
  if (isStill.value) return null
  const pool = isGentle.value ? GENTLE_POOL : IDLE_POOL
  const id = pool[Math.floor(Math.random() * pool.length)]
  return { id, ...IDLE_ACTIONS[id] }
}

function scheduleIdle() {
  clearTimeout(idleTimer)
  if (props.paused || isStill.value) return
  idleTimer = setTimeout(playIdle, 3000 + Math.random() * 5000)
}

function playIdle() {
  if (props.paused || isStill.value) return
  if (dragging.value || flying.value || animClass.value) {
    scheduleIdle()
    return
  }
  const a = pickIdle()
  if (!a) return
  idleClass.value = a.cls
  if (a.face) expression.value = a.face
  // 待机动作不再自动弹气泡，气泡只由点击互动触发
  idleTimer = setTimeout(() => {
    idleClass.value = ''
    if (!animClass.value) expression.value = ''
    scheduleIdle()
  }, a.dur)
}

/* ---- 点击 / 拖拽 / 抛投 ---- */
let downX = 0
let downY = 0
let moved = false
let dragStart = null
let samples = []

function onPointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return
  downX = e.clientX
  downY = e.clientY
  moved = false
  samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }]

  // 暂停或非「熟悉互动」档：不拖拽、不抛投，只识别点击（轻互动仍保留）
  if (props.paused || !isActive.value) {
    window.addEventListener('pointerup', onPointerUp, { once: true })
    window.addEventListener('pointercancel', onPointerUp, { once: true })
    return
  }

  const stageRect = stageEl.value.getBoundingClientRect()
  const anchorRect = anchorEl.value.getBoundingClientRect()
  dragStart = { stageRect, anchorRect }
  // 显式捕获指针：即使首次交互 / 指针移出元素或 iframe，后续 move/up 也稳定投递给本元素
  if (anchorEl.value && e.pointerId != null) {
    try {
      anchorEl.value.setPointerCapture(e.pointerId)
    } catch (err) {
      /* ignore */
    }
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
  window.addEventListener('pointercancel', onPointerUp, { once: true })
}

function onPointerMove(e) {
  if (!dragStart) return
  const dx = e.clientX - downX
  const dy = e.clientY - downY
  if (!moved && Math.abs(dx) + Math.abs(dy) > 2) {
    moved = true
    dragging.value = true
    clearTimeout(idleTimer)
    idleClass.value = ''
    expression.value = '😮'
  }
  if (!dragging.value) return
  // 保留最近 130ms 的轨迹，用来算松手瞬间的速度
  const now = performance.now()
  samples.push({ t: now, x: e.clientX, y: e.clientY })
  while (samples.length > 2 && now - samples[0].t > 130) samples.shift()

  const rect = dragStart.stageRect
  const centerX = dragStart.anchorRect.left + dragStart.anchorRect.width / 2 + dx
  const pct = ((centerX - rect.left) / rect.width) * 100
  petPos.x = Math.max(12, Math.min(88, pct))
  // 垂直只允许拎起到舞台内，避免被顶部裁切
  const bottomPx = rect.bottom - dragStart.anchorRect.bottom - dy
  petPos.y = Math.max(6, Math.min(rect.height - 110, bottomPx))
}

/** 松手瞬间的速度（屏幕坐标 px/s，y 向下为正）。 */
function releaseVelocity() {
  if (samples.length < 2) return { vx: 0, vy: 0 }
  const first = samples[0]
  const last = samples[samples.length - 1]
  const dt = (last.t - first.t) / 1000
  if (dt <= 0.008) return { vx: 0, vy: 0 }
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt }
}

function onPointerUp(e) {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (e && e.pointerId != null && anchorEl.value && anchorEl.value.hasPointerCapture) {
    try {
      anchorEl.value.releasePointerCapture(e.pointerId)
    } catch (err) {
      /* ignore */
    }
  }
  if (dragging.value) {
    dragging.value = false
    const { vx, vy } = releaseVelocity()
    const speed = Math.hypot(vx, vy)
    // 甩得够快 → 抛出去；只是慢慢挪 → 原地放回地面
    if (speed > 700 && !reducedMotion) {
      startFly(vx, vy)
    } else {
      petPos.y = GROUND_Y // 松手回落到地面，transition 带弹跳
      savePos()
      play('catch', pickLandLine())
    }
  } else if (!moved) {
    emit('interact', 'touch')
  }
  dragStart = null
  samples = []
}

/** 抛投：把速度交给物理，抛物线飞出 + 撞墙反弹 + 落地弹跳衰减。 */
function startFly(vxScreen, vyScreen) {
  const rect = stageEl.value.getBoundingClientRect()
  const w = rect.width
  const minX = 0.12 * w
  const maxX = 0.88 * w
  const maxUp = rect.height - 110
  let x = Math.min(maxX, Math.max(minX, (petPos.x / 100) * w))
  let y = petPos.y
  let vx = vxScreen * 0.5
  let vy = -vyScreen * 0.5 // 屏幕向上为正
  let bounces = 0
  const t0 = performance.now()
  let last = t0

  clearTimeout(idleTimer)
  idleClass.value = ''
  flying.value = true
  expression.value = '😵'

  const step = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000)
    last = now
    vy -= PET_G * dt
    x += vx * dt
    y += vy * dt
    if (x < minX) {
      x = minX
      vx = -vx * 0.5
    }
    if (x > maxX) {
      x = maxX
      vx = -vx * 0.5
    }
    if (y > maxUp) {
      y = maxUp
      vy = -Math.abs(vy) * 0.4
    }
    if (y < GROUND_Y) {
      y = GROUND_Y
      bounces++
      if (bounces > 3 || Math.abs(vy) < 160) {
        finishFly()
        return
      }
      vy = -vy * 0.46
      vx *= 0.6
    }
    petPos.x = (x / w) * 100
    petPos.y = y
    if (now - t0 > 4000) {
      finishFly()
      return
    }
    requestAnimationFrame(step)
  }

  const finishFly = () => {
    flying.value = false
    petPos.y = GROUND_Y
    savePos()
    play('catch', pickLandLine())
  }

  requestAnimationFrame(step)
}

function pickLandLine() {
  const lines = ['就待在这儿啦～', '嘿，放我下来！', '这里风景不错 🐾', '站稳咯', '飞得有点高 😵‍💫']
  return lines[Math.floor(Math.random() * lines.length)]
}

/** 升级等特殊时刻：单独一条长气泡 + 雀跃动作，不复用互动台词的 4.2s 计时。 */
function celebrate(text) {
  bubble.value = text || ''
  clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => (bubble.value = ''), 6200)
  expression.value = '🎉'
  if (props.paused) return
  animClass.value = 'anim-play'
  clearTimeout(animTimer)
  animTimer = setTimeout(() => {
    animClass.value = ''
    expression.value = ''
    scheduleIdle()
  }, 1800)
}

/** 浇水：植物抖一下 + 落两滴水珠，气泡带一句反馈。 */
function water(line) {
  watering.value = false
  requestAnimationFrame(() => {
    watering.value = true
    clearTimeout(waterTimer)
    waterTimer = setTimeout(() => (watering.value = false), 1600)
  })
  if (line) {
    bubble.value = line
    clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => (bubble.value = ''), 4200)
  }
}

// 一键暂停：停掉所有动画与物理，复位到安静状态；恢复时重新进入待机
watch(
  () => props.paused,
  (p) => {
    if (p) {
      clearTimeout(idleTimer)
      clearTimeout(bubbleTimer)
      clearTimeout(animTimer)
      clearBowlTimers()
      if (ballRaf) {
        cancelAnimationFrame(ballRaf)
        ballRaf = 0
      }
      if (lookRaf) {
        cancelAnimationFrame(lookRaf)
        lookRaf = 0
      }
      dragging.value = false
      flying.value = false
      animClass.value = ''
      idleClass.value = ''
      expression.value = ''
      ball.on = false
      bowl.on = false
      lookX = 0
      lookY = 0
      if (wrapEl.value) wrapEl.value.style.transform = ''
    } else {
      scheduleIdle()
    }
  }
)

onMounted(() => {
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (e) {
    reducedMotion = false
  }
  loadPos()
  scheduleIdle()
})

onBeforeUnmount(() => {
  clearTimeout(idleTimer)
  clearTimeout(bubbleTimer)
  clearTimeout(animTimer)
  clearTimeout(waterTimer)
  clearBowlTimers()
  if (ballRaf) cancelAnimationFrame(ballRaf)
  if (lookRaf) cancelAnimationFrame(lookRaf)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointermove', onBallMove)
})

defineExpose({ play, switchScene, celebrate, water })
</script>
