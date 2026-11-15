<template>
  <div class="panel">
    <div class="panel-head mem-head">
      <div>
        <h3>第 {{ pet.days }} 天</h3>
        <p v-if="anniv" class="mem-anniv">{{ anniv }} · 从 {{ pet.sinceDate }} 走到今天。</p>
        <p v-else>从 {{ pet.sinceDate }} 走到今天，这里有 {{ items.length }} 条记录。</p>
        <p v-if="next" class="mem-next">再 {{ next.left }} 天，就是相遇第 {{ next.days }} 天。</p>
      </div>
      <div class="mem-head-actions">
        <router-link class="btn btn-ghost btn-sm" to="/album">相册</router-link>
        <button class="btn btn-soft btn-sm" @click="openEditor()">写下一件往事</button>
      </div>
    </div>

    <section v-if="pastToday.length" class="mem-today">
      <h4>往年今日</h4>
      <p v-for="it in pastToday" :key="it.id" class="mem-today-row">
        <span class="tl-icon">{{ glyph(it.type) }}</span>
        <span>{{ it.title }}</span>
      </p>
    </section>

    <el-skeleton v-if="loading" :rows="5" animated />

    <el-empty v-else-if="!items.length" description="还没有记录。去陪它一会儿，或者记一下今天的心情。" />

    <div v-else>
      <section v-for="g in groups" :key="g.key" class="tl-group">
        <h4 class="tl-month">{{ g.key }}</h4>
        <ul class="tl">
          <li v-for="item in g.list" :key="item.id" class="tl-row" :class="'t-' + item.type">
            <span class="tl-icon">{{ glyph(item.type) }}</span>
            <div class="tl-body">
              <div class="tl-top">
                <b>{{ item.title }}</b>
                <time :title="fmtFull(item.at)">{{ fmtRelative(item.at) }}</time>
              </div>
              <p>{{ item.text }}</p>
              <div v-if="isEditable(item)" class="tl-ops">
                <button class="tl-op" @click="openEditor(item)">编辑</button>
                <button class="tl-op" @click="removeItem(item)">删除</button>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <el-dialog v-model="editor.open" :title="editor.id ? '编辑这段往事' : '写下一件往事'" width="min(480px, 92vw)">
      <label class="field-label">标题</label>
      <el-input v-model="editor.title" maxlength="40" placeholder="例如：第一次见面" class="block-gap" />
      <label class="field-label">发生在哪天</label>
      <input v-model="editor.date" type="date" class="input" />
      <label class="field-label">想记下的话</label>
      <el-input
        v-model="editor.body"
        type="textarea"
        :rows="4"
        maxlength="2000"
        placeholder="写点什么，哪怕只是一句。"
      />
      <template #footer>
        <button class="btn btn-ghost" @click="editor.open = false">取消</button>
        <button class="btn btn-primary" :disabled="editor.saving" @click="saveEditor">保存</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from '../ui.js'
import { pet } from '../store.js'
import { api } from '../api.js'
import { fmtRelative, fmtFull, fmtMonth, anniversaryText, nextMilestone, todayStr } from '../format.js'

const items = ref([])
const loading = ref(true)

const GLYPH = {
  meet: '始',
  mood: '心',
  letter: '信',
  tribute: '灯',
  capsule: '匣',
  footprint: '迹',
  milestone: '碑',
  photo: '照',
  intimacy: '近'
}
const glyph = (t) => GLYPH[t] || '·'

const anniv = computed(() => anniversaryText(pet.value?.sinceDate))
const next = computed(() => nextMilestone(pet.value?.days || 0))

const groups = computed(() => {
  const out = []
  for (const it of items.value) {
    const key = fmtMonth(it.at)
    let g = out.find((x) => x.key === key)
    if (!g) {
      g = { key, list: [] }
      out.push(g)
    }
    g.list.push(it)
  }
  return out
})

// 往年今日：同样的月日，但年份更早
const pastToday = computed(() => {
  const now = new Date()
  const m = now.getMonth()
  const d = now.getDate()
  return items.value.filter((it) => {
    const t = new Date(it.at)
    return t.getMonth() === m && t.getDate() === d && t.getFullYear() < now.getFullYear()
  })
})

// 用户写的里程碑：id 以 evt- 开头（自动合成的「第 N 天」用 ms- 前缀，不可编辑）
const isEditable = (item) => item.type === 'milestone' && item.id.startsWith('evt-')

const editor = reactive({ open: false, id: null, title: '', body: '', date: '', saving: false })

function toDateStr(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function openEditor(item) {
  if (item) {
    editor.id = Number(item.id.replace('evt-', ''))
    editor.title = item.title
    editor.body = item.text
    editor.date = toDateStr(item.at)
  } else {
    editor.id = null
    editor.title = ''
    editor.body = ''
    editor.date = todayStr()
  }
  editor.open = true
}

async function saveEditor() {
  if (!editor.title.trim()) {
    ElMessage.warning('先给它起个标题')
    return
  }
  editor.saving = true
  try {
    if (editor.id) await api.updateEvent(editor.id, editor.title.trim(), editor.body.trim(), editor.date)
    else await api.addEvent(editor.title.trim(), editor.body.trim(), editor.date)
    editor.open = false
    ElMessage.success(editor.id ? '已经更新' : '已经记下')
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    editor.saving = false
  }
}

async function removeItem(item) {
  const id = Number(item.id.replace('evt-', ''))
  try {
    await ElMessageBox.confirm('删掉这段往事吗？', '提示', {
      confirmButtonText: '删掉',
      cancelButtonText: '留着',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await api.deleteEvent(id)
    ElMessage.success('已经删掉')
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function load() {
  const data = await api.timeline()
  items.value = data.items || []
}

onMounted(async () => {
  try {
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
})
</script>
