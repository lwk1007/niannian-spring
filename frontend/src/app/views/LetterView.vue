<template>
  <div class="panel">
    <div class="panel-head">
      <p>按你们真实发生过的互动来写，不用假装的语气。写坏了也没关系，它不会怪你。</p>
    </div>

    <el-skeleton v-if="loading" :rows="5" animated />

    <template v-else>
      <article v-if="latest" class="letter-paper">
        <div class="letter-meta" :title="fmtFull(latest.createdAt)">{{ fmtRelative(latest.createdAt) }}</div>
        <div class="letter-body serif">{{ latest.content }}</div>
      </article>

      <div v-else class="letter-empty serif">
        它还没有给你写过信。<br />写第一封的时候，它会说说这段时间。
      </div>

      <div class="panel-actions">
        <el-button type="primary" :loading="writing" @click="write">
          {{ writing ? '正在写…' : latest ? '再写一封' : '让它写一封' }}
        </el-button>
        <el-button v-if="aiAvailable" plain :loading="aiWriting" @click="writeAI">
          {{ aiWriting ? '它正在想…' : '用 AI 写一封' }}
        </el-button>
        <span class="hint">一分钟内最多一封</span>
      </div>

      <div v-if="older.length" class="letter-list">
        <h4>之前的信</h4>
        <el-collapse accordion>
          <el-collapse-item v-for="item in older" :key="item.id" :name="item.id">
            <template #title>
              <span class="letter-summary">
                <time :title="fmtFull(item.createdAt)">{{ fmtRelative(item.createdAt) }}</time>
                <i>{{ firstLine(item.content) }}</i>
              </span>
            </template>
            <div class="letter-old serif">{{ item.content }}</div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from '../ui.js'
import { api } from '../api.js'
import { fmtRelative, fmtFull } from '../format.js'

const list = ref([])
const loading = ref(true)
const writing = ref(false)
const aiWriting = ref(false)
const aiAvailable = ref(false)

const latest = computed(() => list.value[0])
const older = computed(() => list.value.slice(1))

const firstLine = (text) => (String(text || '').split('\n').filter(Boolean)[0] || '').slice(0, 48)

async function load() {
  try {
    const data = await api.letters()
    list.value = data.items || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function checkAi() {
  try {
    const d = await api.aiLetterStatus()
    aiAvailable.value = !!d.available
  } catch (e) {
    aiAvailable.value = false
  }
}

async function write() {
  writing.value = true
  try {
    await api.writeLetter()
    await load()
    ElMessage.success('写好了')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    writing.value = false
  }
}

async function writeAI() {
  aiWriting.value = true
  try {
    await api.aiLetter()
    await load()
    ElMessage.success('写好了')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    aiWriting.value = false
  }
}

onMounted(() => {
  load()
  checkAi()
})
</script>
