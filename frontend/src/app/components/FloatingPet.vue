<template>
  <div class="fp-root" :class="{ collapsed }" :style="rootStyle">
    <!-- 收起后的迷你圆球：点一下重新展开 -->
    <button v-if="collapsed" class="fp-orb" @click="expand" title="点我展开">
      <span class="fp-orb-mark">念</span>
    </button>

    <!-- 展开的宠物 -->
    <template v-else>
      <div class="fp-shadow"></div>
      <div
        ref="bodyEl"
        class="fp-body"
        :class="{ dragging }"
        title="拖拽移动 · 单击摸摸 · 双击回陪伴页"
        @pointerdown="onDown"
      >
        <img
          v-if="cutout"
          class="fp-img fp-cut"
          :src="cutout"
          :alt="name"
          draggable="false"
        />
        <img
          v-else-if="photo"
          class="fp-img fp-photo"
          :src="photo"
          :alt="name"
          draggable="false"
        />
        <span v-else class="fp-generic">{{ emoji }}</span>
        <span v-if="heartKey" :key="heartKey" class="fp-heart">💛</span>
      </div>
      <div v-if="bubble" class="fp-bubble">{{ bubble }}</div>
      <button class="fp-close" @pointerdown.stop @click.stop="collapse" title="收起">×</button>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { pet } from '../store.js'

const router = useRouter()

const PET = 96
const ORB = 44
const POS_KEY = 'nn_fp_pos'
const COLLAPSED_KEY = 'nn_fp_collapsed'

const name = computed(() => pet.value?.name || '它')
const cutout = computed(() => pet.value?.cutout || '')
const photo = computed(() => pet.value?.photo || '')
const type = computed(() => pet.value?.type || 'cat')
const emoji = computed(() => ({ cat: '🐱', dog: '🐶', other: '🐾' }[type.value] || '🐾'))

const collapsed = ref(loadCollapsed())
const pos = reactive({ x: 0, y: 0 })
const dragging = ref(false)
const bubble = ref('')
const heartKey = ref(0)

let bubbleTimer = null
let clickTimer = null
let lastClickAt = 0
let reducedMotion = false

/* ---- 位置持久化 ---- */
function loadCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch (e) {
    return false
  }
}

function loadPos() {
  try {
    const s = localStorage.getItem(POS_KEY)
    if (s) {
      const p = JSON.parse(s)
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
        pos.x = p.x
        pos.y = p.y
        clamp()
        return
      }
    }
  } catch (e) {
    /* ignore */
  }
  toDefault()
}

function savePos() {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ x: pos.x, y: pos.y }))
  } catch (e) {
    /* ignore */
  }
}

/** 视口安全边距：顶部留气泡空间，移动端底部抬高避开标签栏。 */
function insets() {
  const mobile = window.innerWidth <= 860
  return { top: 46, bottom: mobile ? 78 : 20, side: 4 }
}

function clamp() {
  const size = collapsed.value ? ORB : PET
  const in_ = insets()
  const maxX = Math.max(in_.side, window.innerWidth - size - in_.side)
  const maxY = Math.max(in_.top, window.innerHeight - size - in_.bottom)
  pos.x = Math.min(Math.max(in_.side, pos.x), maxX)
  pos.y = Math.min(Math.max(in_.top, pos.y), maxY)
}

function toDefault() {
  const size = collapsed.value ? ORB : PET
  const in_ = insets()
  pos.x = window.innerWidth - size - 20
  pos.y = window.innerHeight - size - in_.bottom
  clamp()
}

const rootStyle = computed(() => ({
  left: pos.x + 'px',
  top: pos.y + 'px'
}))

/* ---- 拖拽 / 点击 / 双击 ---- */
let startX = 0
let startY = 0
let originX = 0
let originY = 0
let moved = false

function onDown(e) {
  if (e.button !== undefined && e.button !== 0) return
  if (collapsed.value) return
  e.preventDefault()
  startX = e.clientX
  startY = e.clientY
  originX = pos.x
  originY = pos.y
  moved = false
  dragging.value = true
  if (e.pointerId != null && bodyEl.value) {
    try {
      bodyEl.value.setPointerCapture(e.pointerId)
    } catch (err) {
      /* ignore */
    }
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function onMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!moved && Math.abs(dx) + Math.abs(dy) > 5) moved = true
  if (!moved) return
  pos.x = originX + dx
  pos.y = originY + dy
  clamp()
}

function onUp() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
  if (!dragging.value) return
  dragging.value = false
  if (moved) {
    savePos()
  } else {
    const now = Date.now()
    if (now - lastClickAt < 420) {
      clearTimeout(clickTimer)
      lastClickAt = 0
      goHome()
    } else {
      lastClickAt = now
      clickTimer = setTimeout(() => {
        lastClickAt = 0
        poke()
      }, 420)
    }
  }
}

function poke() {
  say(GREET[Math.floor(Math.random() * GREET.length)])
  heartKey.value += 1
}

function goHome() {
  if (router.currentRoute.value.name !== 'companion') {
    router.push('/companion')
  }
}

const GREET = [
  '我在呢，一直陪着你',
  '戳我干嘛呀～',
  '想它的话，双击我回去看看',
  '我在角落偷偷看着你',
  '累了就摸摸头吧'
]

function say(text) {
  bubble.value = text || ''
  clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => (bubble.value = ''), 2400)
}

function collapse() {
  collapsed.value = true
  try {
    localStorage.setItem(COLLAPSED_KEY, '1')
  } catch (e) {
    /* ignore */
  }
  clamp()
  savePos()
}

function expand() {
  collapsed.value = false
  try {
    localStorage.setItem(COLLAPSED_KEY, '0')
  } catch (e) {
    /* ignore */
  }
  clamp()
  savePos()
}

/* ---- 生命周期 ---- */
function onResize() {
  clamp()
  savePos()
}

onMounted(() => {
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (e) {
    reducedMotion = false
  }
  loadPos()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  clearTimeout(bubbleTimer)
  clearTimeout(clickTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
})
</script>

<style scoped>
.fp-root {
  position: fixed;
  z-index: 40; /* 高于页面内容(topbar 6 / tabbar 20)，低于弹窗遮罩(2000+) */
  width: 96px;
  height: 96px;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

/* ---- 收起后的迷你圆球 ---- */
.fp-root.collapsed {
  width: 44px;
  height: 44px;
}

.fp-orb {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line, #e4d9c4);
  background: var(--olive, #5f7052);
  color: #fdfaf3;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 6px 16px -8px rgba(70, 82, 60, 0.9);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.fp-orb:hover {
  transform: scale(1.08);
  box-shadow: 0 9px 20px -8px rgba(70, 82, 60, 0.9);
}
.fp-orb-mark {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
}

/* ---- 宠物本体 ---- */
.fp-body {
  position: absolute;
  left: 0;
  top: 0;
  width: 96px;
  height: 96px;
  cursor: grab;
  touch-action: none;
  transform-origin: 50% 92%;
  animation: fp-float 3.4s ease-in-out infinite;
}
.fp-body.dragging {
  cursor: grabbing;
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .fp-body {
    animation: none;
  }
}

.fp-img {
  display: block;
  width: 96px;
  height: 96px;
  pointer-events: none;
  -webkit-user-drag: none;
  user-select: none;
}
/* 抠图贴纸：靠自己的轮廓悬浮，加一点柔和投影 */
.fp-cut {
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(48, 38, 28, 0.22));
}
/* 无抠图时的整张照片：圆角小卡 */
.fp-photo {
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 5px 13px rgba(48, 38, 28, 0.22);
}
.fp-generic {
  display: block;
  width: 96px;
  height: 96px;
  line-height: 96px;
  text-align: center;
  font-size: 54px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 10px rgba(48, 38, 28, 0.16);
}

/* 脚下影子 */
.fp-shadow {
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 56px;
  height: 9px;
  margin-left: -28px;
  border-radius: 50%;
  background: rgba(48, 38, 28, 0.18);
  pointer-events: none;
  animation: fp-shadow 3.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .fp-shadow {
    animation: none;
  }
}

/* 单击爱心 */
.fp-heart {
  position: absolute;
  left: 50%;
  top: 10px;
  font-size: 18px;
  line-height: 1;
  pointer-events: none;
  animation: fp-heart-pop 0.9s ease-out forwards;
}

/* 对话气泡 */
.fp-bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 10px;
  width: max-content;
  max-width: 180px;
  padding: 7px 12px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--line, #e4d9c4);
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink, #3d332a);
  box-shadow: 0 4px 12px rgba(48, 38, 28, 0.14);
  pointer-events: none;
  white-space: normal;
  word-break: break-all;
  animation: fp-pop 0.24s ease;
}
.fp-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.96);
  border-bottom: none;
}

/* 收起按钮 */
.fp-close {
  position: absolute;
  right: -6px;
  top: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--line, #e4d9c4);
  background: rgba(255, 252, 245, 0.94);
  color: var(--muted, #8a7d68);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.16s ease, transform 0.16s ease;
  pointer-events: auto;
}
.fp-root:hover .fp-close {
  opacity: 1;
}
.fp-close:hover {
  transform: scale(1.1);
  color: var(--olive-deep, #4a563f);
}

@keyframes fp-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes fp-shadow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.18;
  }
  50% {
    transform: scale(0.82);
    opacity: 0.12;
  }
}

@keyframes fp-heart-pop {
  0% {
    transform: translate(-50%, 0) scale(0.4);
    opacity: 0;
  }
  25% {
    transform: translate(-50%, -10px) scale(1.15);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -46px) scale(0.9);
    opacity: 0;
  }
}

@keyframes fp-pop {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
