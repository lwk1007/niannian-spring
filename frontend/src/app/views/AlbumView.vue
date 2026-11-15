<template>
  <div class="panel">
    <div class="panel-head">
      <h3>纪念相册</h3>
      <p>{{ photos.length ? photos.length + ' 张照片，替它把样子收好。' : '还没有照片。传几张上来，给这段陪伴多留一点画面。' }}</p>
    </div>

    <div class="album-actions">
      <label class="btn btn-soft">
        上传照片
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFiles" />
      </label>
      <span v-if="uploading" class="hint">{{ uploadingText }}</span>
    </div>

    <el-skeleton v-if="loading" :rows="4" animated />

    <el-empty v-else-if="!photos.length" description="还没有照片" />

    <div v-else class="album-grid">
      <figure v-for="p in photos" :key="p.id" class="album-cell">
        <img :src="p.data" :alt="p.note || '照片'" loading="lazy" />
        <figcaption v-if="p.note">{{ p.note }}</figcaption>
        <time>{{ fmtDate(p.createdAt) }}</time>
        <div class="album-tools">
          <button class="album-tool" title="写一句备注" @click="editNote(p)">✎</button>
          <button class="album-tool" title="删除这张" @click="remove(p)">×</button>
        </div>
      </figure>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from '../ui.js'
import { api } from '../api.js'
import { shrinkImage, fmtDate } from '../format.js'

const photos = ref([])
const loading = ref(true)
const uploading = ref(false)
const uploadingText = ref('')
const fileInput = ref(null)

async function load() {
  try {
    photos.value = await api.photos()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function onFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return
  uploading.value = true
  uploadingText.value = '正在整理 ' + files.length + ' 张…'
  try {
    const items = []
    for (const f of files) {
      const data = await shrinkImage(f, 640, 0.84)
      items.push({ data, note: '' })
    }
    const added = await api.addPhotos(items)
    photos.value = [...added, ...photos.value]
    ElMessage.success('已经收进相册')
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    uploading.value = false
    uploadingText.value = ''
  }
}

async function editNote(p) {
  let value
  try {
    const res = await ElMessageBox.prompt('给这张照片写一句备注（可留空）', '备注', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: p.note || ''
    })
    value = (res.value || '').trim()
  } catch {
    return
  }
  try {
    await api.updatePhotoNote(p.id, value)
    p.note = value
    ElMessage.success(value ? '备注已保存' : '备注已清空')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function remove(p) {
  try {
    await ElMessageBox.confirm('删掉这张照片吗？', '提示', {
      confirmButtonText: '删掉',
      cancelButtonText: '留着',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await api.deletePhoto(p.id)
    photos.value = photos.value.filter((x) => x.id !== p.id)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>
