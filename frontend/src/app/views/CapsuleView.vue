<template>
  <div class="panel">
    <div class="panel-head">
      <p>写给以后。没到期之前，连你自己也看不到内容。</p>
    </div>

    <div class="capsule-form">
      <label class="field-label">写给以后的自己</label>
      <el-input
        v-model="text"
        type="textarea"
        :rows="4"
        maxlength="3000"
        show-word-limit
        placeholder="等你读到这封信的时候……"
      />

      <div class="cap-row">
        <el-select v-model="days" class="cap-select" placeholder="什么时候打开">
          <el-option :value="7" label="7 天后" />
          <el-option :value="30" label="30 天后" />
          <el-option :value="90" label="3 个月后" />
          <el-option :value="365" label="1 年后" />
          <el-option :value="1095" label="3 年后" />
        </el-select>
        <el-button type="primary" :loading="saving" @click="seal">封起来</el-button>
      </div>
    </div>

    <hr class="divider" />

    <el-skeleton v-if="loading" :rows="4" animated />

    <el-empty v-else-if="!list.length" description="还没有封存任何东西。" />

    <ul v-else class="cap-list">
      <li v-for="cap in list" :key="cap.id" class="cap" :class="cap.locked ? 'locked' : 'open'">
        <div class="cap-badge">{{ cap.locked ? '封' : '启' }}</div>
        <div style="flex: 1; min-width: 0">
          <template v-if="cap.locked">
            <b>未到开启的时候</b>
            <p>还有 {{ daysLeft(cap.unlockAt) }} 天 · {{ fmtDate(cap.unlockAt) }} 解锁</p>
          </template>
          <template v-else>
            <b>{{ cap.openedAt ? '已开启' : '可以打开了' }}</b>
            <p>{{ fmtDate(cap.unlockAt) }} 到期</p>
            <div v-if="cap.content" class="cap-content serif">{{ cap.content }}</div>
            <el-button v-else class="cap-open-btn" size="small" plain @click="open(cap.id)">
              打开它
            </el-button>
          </template>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from '../ui.js'
import { api } from '../api.js'
import { daysLeft, fmtDate } from '../format.js'

const list = ref([])
const loading = ref(true)
const saving = ref(false)
const text = ref('')
const days = ref(30)

async function load() {
  try {
    const data = await api.capsules()
    list.value = data.items || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function seal() {
  const value = text.value.trim()
  if (!value) {
    ElMessage.warning('还没写内容')
    return
  }
  saving.value = true
  try {
    await api.addCapsule(value, days.value)
    ElMessage.success('封好了')
    text.value = ''
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

async function open(id) {
  try {
    await api.openCapsule(id)
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>
