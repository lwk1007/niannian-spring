<template>
  <div class="companion">
    <SceneStage
      ref="stage"
      :pet="pet"
      :greeting="greetingText"
      :mode="presence"
      :paused="paused"
      @interact="hit"
    />

    <!-- 存在强度：三档 + 一键暂停，呼应「安静而非黏人」 -->
    <div class="presence">
      <div class="presence-bar">
        <button
          v-for="m in MODES"
          :key="m.id"
          class="presence-chip"
          :class="{ on: presence === m.id }"
          @click="setMode(m.id)"
        >
          <span class="presence-ico">{{ m.icon }}</span>
          <span class="presence-name">{{ m.name }}</span>
        </button>
      </div>
      <button class="pause-btn" :class="{ on: paused }" @click="togglePause">
        {{ paused ? '已暂停 · 点此恢复' : '暂停动画' }}
      </button>
    </div>

    <div class="act-row">
      <button class="act" :disabled="busy" @click="hit('touch')">
        <b>摸摸</b><i>把手放上去</i>
      </button>
      <button class="act" :disabled="busy" @click="hit('feed')">
        <b>喂食</b><i>给它一点好吃的</i>
      </button>
      <button class="act" :disabled="busy" @click="hit('play')">
        <b>玩耍</b><i>陪它跑一会儿</i>
      </button>
    </div>

    <!-- 亲密度：经验全部由互动次数在服务端派生，这里只显示 -->
    <div v-if="intimacy" class="intimacy">
      <div class="intimacy-top">
        <span class="intimacy-lv">Lv.{{ intimacy.level }}</span>
        <span class="intimacy-title">{{ intimacy.title }}</span>
        <span class="intimacy-xp">{{ intimacy.xp }} / {{ intimacy.nextXp }}</span>
      </div>
      <div class="intimacy-bar"><i :style="{ width: intimacy.progress + '%' }"></i></div>
      <p class="intimacy-hint">
        {{ intimacy.toNext > 0 ? `再陪它 ${intimacy.toNext} 点，就更近一点` : '已经是最亲近的样子了' }}
      </p>
    </div>

    <!-- 纪念植物：一株随浇水慢慢长的花 -->
    <div v-if="plant" class="plant-bar">
      <div class="plant-info">
        <span class="plant-ico">{{ plantIcon }}</span>
        <div>
          <b class="plant-name">{{ plant.name }}</b>
          <p class="plant-hint">{{ plantDesc }}</p>
        </div>
      </div>
      <button class="water-btn" :disabled="!plant.canWater || watering" @click="water">
        {{ plant.canWater ? '浇一点水' : '今天浇过了' }}
      </button>
    </div>

    <div class="quick-grid">
      <router-link class="quick" to="/letter">
        <b>让它写封信</b><i>按你们真实的互动</i>
      </router-link>
      <router-link class="quick" to="/memory">
        <b>看看这段日子</b><i>时间轴与往年今日</i>
      </router-link>
      <router-link class="quick" to="/mood">
        <b>记一下今天</b><i>不想说也可以</i>
      </router-link>
      <router-link class="quick" to="/tribute">
        <b>点一支灯</b><i>写一句就够</i>
      </router-link>
    </div>

    <div class="stat-line">
      <span>摸过 {{ stats.touch || 0 }} 次</span>
      <span>喂过 {{ stats.feed || 0 }} 次</span>
      <span>玩过 {{ stats.play || 0 }} 次</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from '../ui.js'
import SceneStage from '../components/SceneStage.vue'
import { pet, loadMe } from '../store.js'
import { api } from '../api.js'

const stage = ref(null)
const busy = ref(false)
const watering = ref(false)

const stats = computed(() => pet.value.stats || {})
const intimacy = computed(() => pet.value.intimacy || null)
const plant = computed(() => pet.value.plant || null)

const PLANT_ICONS = { seed: '🫘', sprout: '🌱', seedling: '🌿', grown: '🌳', bloom: '🌸' }
const plantIcon = computed(() => PLANT_ICONS[plant.value?.key] || '🪴')
const plantDesc = computed(() => {
  if (!plant.value) return ''
  if (plant.value.toNext <= 0) return '它已经开花了，安静地。'
  return `再浇 ${plant.value.toNext} 次，就能长到下一个阶段`
})

const MODES = [
  { id: 'still', name: '静静留影', icon: '🕊️' },
  { id: 'gentle', name: '轻微陪伴', icon: '🌿' },
  { id: 'active', name: '熟悉互动', icon: '🐾' }
]

const presence = ref(loadPresence())
const paused = ref(loadPaused())

function loadPresence() {
  try {
    const v = localStorage.getItem('nn_presence')
    if (v && MODES.some((m) => m.id === v)) return v
  } catch (e) {
    /* ignore */
  }
  return 'active'
}

function loadPaused() {
  try {
    return localStorage.getItem('nn_paused') === '1'
  } catch (e) {
    return false
  }
}

function setMode(id) {
  presence.value = id
  try {
    localStorage.setItem('nn_presence', id)
  } catch (e) {
    /* ignore */
  }
  // 切到「静静留影」时自动解除暂停，两者叠加就分不清是谁在起作用
  if (id === 'still' && paused.value) {
    paused.value = false
    try {
      localStorage.setItem('nn_paused', '0')
    } catch (e) {
      /* ignore */
    }
  }
}

function togglePause() {
  paused.value = !paused.value
  try {
    localStorage.setItem('nn_paused', paused.value ? '1' : '0')
  } catch (e) {
    /* ignore */
  }
}

const greetingText = computed(() => {
  const n = pet.value?.name || '它'
  const h = new Date().getHours()
  if (h < 6) return `${n}还在等你呢，早点休息`
  if (h < 12) return `早上好，${n}已经等你很久啦`
  if (h < 18) return `下午好，陪${n}待一会儿吧`
  return `晚上好，${n}想你了`
})

async function hit(action) {
  if (busy.value) return
  busy.value = true
  try {
    const r = await api.interact(action)
    if (stage.value) stage.value.play(action, r.line)
    await loadMe()
    if (r.levelUp && r.intimacy) {
      // 升级单独庆祝一次：舞台气泡换成长文案，避免和互动台词互相覆盖
      setTimeout(() => {
        if (stage.value) {
          stage.value.celebrate(`亲密度 ${r.intimacy.level} 级 · ${r.intimacy.title} 🎉`)
        }
      }, 900)
    }
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    busy.value = false
  }
}

async function water() {
  if (watering.value || !plant.value?.canWater) return
  watering.value = true
  try {
    const r = await api.waterPlant()
    if (stage.value) stage.value.water(r.line)
    await loadMe()
    if (r.grew) {
      setTimeout(() => {
        if (stage.value) stage.value.celebrate('它长大了 🌱')
      }, 900)
    }
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    watering.value = false
  }
}
</script>
