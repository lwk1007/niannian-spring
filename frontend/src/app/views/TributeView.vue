<template>
  <div class="panel">
    <div class="panel-head">
      <p>写给它的信，不给任何人看。写完后可以点一支灯。</p>
    </div>

    <div class="candle-box">
      <div class="candle-halo">
        <div class="candle" :class="{ lit: lit }">
          <span class="flame"></span>
          <span class="wick"></span>
          <span class="wax"></span>
        </div>
      </div>
      <p class="candle-count">已经点亮 <b>{{ count }}</b> 次</p>
    </div>

    <label class="field-label">想对它说的话</label>
    <el-input
      v-model="text"
      type="textarea"
      :rows="4"
      maxlength="2000"
      show-word-limit
      placeholder="今天路过你常趴的那块地板……"
    />

    <div class="panel-actions">
      <el-button type="primary" :loading="saving" @click="submit">写下并点灯</el-button>
    </div>

    <hr class="divider" />

    <el-skeleton v-if="loading" :rows="4" animated />

    <el-empty v-else-if="!list.length" description="还没有写过。第一句往往最难，也最值得。" />

    <ul v-else class="tribute-list">
      <li v-for="item in list" :key="item.id">
        <time>{{ fmtDate(item.createdAt) }}</time>
        <p class="serif">{{ item.content }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from '../ui.js'
import { api } from '../api.js'
import { fmtDate } from '../format.js'

const list = ref([])
const count = ref(0)
const loading = ref(true)
const saving = ref(false)
const text = ref('')
const lit = ref(false)

async function load() {
  try {
    const data = await api.tributes()
    list.value = data.items || []
    count.value = data.lit || 0
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function submit() {
  const value = text.value.trim()
  if (!value) {
    ElMessage.warning('写一句也好')
    return
  }
  saving.value = true
  try {
    await api.addTribute(value)
    lit.value = true
    ElMessage.success('灯亮了')
    text.value = ''
    await load()
    setTimeout(() => (lit.value = true), 50)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
