<template>
  <div class="panel">
    <div class="panel-head">
      <h3>今天怎么样</h3>
      <p>不用挑好听的说法，选最接近的那个就行。</p>
    </div>

    <div class="mood-row">
      <button
        v-for="m in options.moods"
        :key="m.key"
        class="mood-orb"
        :class="{ on: picked === m.key }"
        :style="{ '--mc': m.color }"
        @click="pick(m.key)"
      >
        <i></i>
        <span>{{ m.label }}</span>
      </button>
    </div>

    <transition name="slide">
      <div v-if="picked" class="mood-note">
        <label class="field-label">想说的话（可以空着）</label>
        <el-input
          v-model="note"
          type="textarea"
          :rows="3"
          maxlength="300"
          show-word-limit
          placeholder="今天……"
        />
        <div class="mood-note-foot">
          <el-button type="primary" :loading="saving" @click="save">记下来</el-button>
        </div>
      </div>
    </transition>

    <div v-if="soothe" class="soothe">{{ soothe }}</div>

    <hr class="divider" />

    <h4 class="sub-title">这些天</h4>

    <el-skeleton v-if="loading" :rows="4" animated />

    <el-empty v-else-if="!list.length" description="还没有记录。今天可以是第一天。" />

    <ul v-else class="mood-list">
      <li v-for="item in list" :key="item.id">
        <i :style="{ background: meta(item.mood).color }"></i>
        <div>
          <b>{{ meta(item.mood).label }}</b>
          <time>{{ fmtDate(item.createdAt) }}</time>
          <p v-if="item.note">{{ item.note }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from '../ui.js'
import { options, moodMeta } from '../store.js'
import { api } from '../api.js'
import { fmtDate, todayStr } from '../format.js'

const list = ref([])
const loading = ref(true)
const saving = ref(false)
const picked = ref('')
const note = ref('')
const soothe = ref('')

const meta = moodMeta

function pick(key) {
  picked.value = key
}

async function load() {
  try {
    const data = await api.moods()
    list.value = (data.items || []).slice().reverse()
    const today = list.value.find(
      (m) => new Date(m.createdAt).toISOString().slice(0, 10) === todayStr()
    )
    if (today) picked.value = today.mood
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!picked.value) {
    ElMessage.warning('先选一个心情')
    return
  }
  saving.value = true
  try {
    const r = await api.addMood(picked.value, note.value)
    soothe.value = r.soothe || ''
    ElMessage.success('记下了')
    note.value = ''
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
