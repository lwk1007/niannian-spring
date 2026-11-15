<template>
  <div class="panel">
    <el-skeleton v-if="!pet" :rows="4" animated />

    <template v-else>
      <div class="pet-card">
        <div class="avatar">
          <PetFigure :photo="pet.photo" :type="pet.type" :alt="pet.name" />
        </div>
        <div class="meta">
          <h3>{{ pet.name }}</h3>
          <p>{{ pet.ownerTitle }} · 第 {{ pet.days }} 天 · 从 {{ pet.sinceDate }} 开始</p>
          <p class="hint">{{ pet.storageMode === 'persistent' ? '长期保存' : '私密模式' }}</p>
        </div>
        <el-button size="small" plain @click="edit">修改资料</el-button>
      </div>

      <hr class="divider" />

      <h4 class="sub-title">分享这一页</h4>

      <div v-if="shareUrl" class="share-box">
        <code class="share-url">{{ shareUrl }}</code>
        <div class="share-actions">
          <el-button size="small" @click="copy">复制链接</el-button>
          <a class="btn btn-ghost btn-sm" :href="shareUrl" target="_blank" rel="noopener">打开看看</a>
          <el-button size="small" plain type="danger" @click="revoke">收回</el-button>
        </div>
        <div class="switch-row">
          <el-switch
            :model-value="pet.shareIncludePrivate"
            @change="togglePrivate"
          />
          <span>公开页也显示心情与一封信（默认不显示）</span>
        </div>
        <div class="switch-row">
          <el-switch
            :model-value="pet.shareAllowGuest !== false"
            @change="toggleAllowGuest"
          />
          <span>允许访客留言、献花、点灯</span>
        </div>
        <div class="switch-row">
          <el-switch
            :model-value="pet.shareModerate === true"
            @change="toggleModerate"
          />
          <span>访客留言需我审核后才显示</span>
        </div>
      </div>

      <div v-else>
        <p class="hint block-gap">
          生成一个只读链接，别人打开就能看到它的纪念页。心情、思念信默认不会出现在上面。
        </p>
        <el-button type="primary" @click="createShare">生成分享链接</el-button>
      </div>

      <hr class="divider" />

      <h4 class="sub-title">访客的留言与献花</h4>
      <div class="visitor-box">
        <p class="hint block-gap" v-if="!shareUrl">
          先在上面生成分享链接，别人打开后才能留言或献花。
        </p>
        <template v-else>
          <div class="visitor-stats">
            <span>🌸 {{ visitor.flowers }} 朵花</span>
            <span>🕯️ {{ visitor.candles }} 支烛</span>
            <span v-if="visitor.pending" class="visitor-pending">📩 {{ visitor.pending }} 条待审核</span>
          </div>
          <div v-if="visitor.items.length" class="visitor-list">
            <div
              v-for="it in visitor.items"
              :key="it.id"
              class="visitor-item"
              :class="{ 'is-pending': it.status === 0, 'is-hidden': it.status === 2 }"
            >
              <div class="visitor-item-meta">
                <span class="visitor-kind">{{ kindLabel(it.kind) }}</span>
                <span class="visitor-name">{{ it.name || '匿名访客' }}</span>
                <time class="visitor-time">{{ fmtDate(it.createdAt) }}</time>
                <span v-if="it.status === 0" class="visitor-tag">待审核</span>
                <span v-else-if="it.status === 2" class="visitor-tag muted">已隐藏</span>
              </div>
              <p v-if="it.content" class="visitor-content">{{ it.content }}</p>
              <div class="visitor-ops">
                <el-button v-if="it.status === 0" size="small" @click="approve(it)">通过</el-button>
                <el-button v-if="it.status === 0" size="small" plain @click="hide(it)">隐藏</el-button>
                <el-button size="small" plain type="danger" @click="del(it)">删除</el-button>
              </div>
            </div>
          </div>
          <p v-else class="hint">还没有访客留下什么。</p>
        </template>
      </div>

      <hr class="divider" />

      <h4 class="sub-title">我的数据</h4>
      <div class="data-row">
        <el-button size="small" plain @click="exportAll">导出全部数据</el-button>
        <el-button size="small" plain type="danger" @click="remove">删除它和全部记录</el-button>
      </div>
      <p class="hint">
        导出是一个 JSON 文件，包含档案、心情、信、思念信、胶囊与事件记录。删除不可恢复。
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from '../ui.js'
import { useRouter } from 'vue-router'
import PetFigure from '../components/PetFigure.vue'
import { pet, loadMe } from '../store.js'
import { api } from '../api.js'
import { todayStr, fmtDate } from '../format.js'

const router = useRouter()

function edit() {
  router.push('/onboarding?edit=1')
}

const shareUrl = computed(() =>
  pet.value && pet.value.shareId ? location.origin + '/s/' + pet.value.shareId : ''
)

async function createShare() {
  try {
    await api.share(false)
    await loadMe()
    ElMessage.success('链接已生成')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    ElMessage.success('已复制')
  } catch {
    window.prompt('复制这个链接发给别人：', shareUrl.value)
  }
}

async function revoke() {
  try {
    await api.unshare()
    await loadMe()
    ElMessage.success('已收回')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function togglePrivate(value) {
  try {
    await api.share(!!value)
    await loadMe()
    ElMessage.success(value ? '公开页会显示心情与信' : '已隐藏私密内容')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function toggleAllowGuest(value) {
  try {
    await api.setGuest(!!value, pet.value.shareModerate === true)
    await loadMe()
    ElMessage.success(value ? '访客可以留言与献花了' : '已关闭访客留言与献花')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function toggleModerate(value) {
  try {
    await api.setGuest(pet.value.shareAllowGuest !== false, !!value)
    await loadMe()
    ElMessage.success(value ? '访客留言将先由你审核' : '访客留言即时显示')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

const visitor = ref({ items: [], pending: 0, flowers: 0, candles: 0 })

async function loadVisitor() {
  try {
    const d = await api.visitorTributes()
    visitor.value = {
      items: d.items || [],
      pending: d.pending || 0,
      flowers: d.flowers || 0,
      candles: d.candles || 0
    }
  } catch (e) {
    /* 静默：没有分享时后端可能返回空，不影响主流程 */
  }
}

function kindLabel(kind) {
  if (kind === 'flower') return '🌸 献花'
  if (kind === 'candle') return '🕯️ 点灯'
  return '💬 留言'
}

async function approve(it) {
  try {
    await api.approveVisitorTribute(it.id)
    it.status = 1
    visitor.value.pending = Math.max(0, visitor.value.pending - 1)
    ElMessage.success('已通过')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function hide(it) {
  try {
    await api.hideVisitorTribute(it.id)
    if (it.status === 0) visitor.value.pending = Math.max(0, visitor.value.pending - 1)
    it.status = 2
    ElMessage.success('已隐藏')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function del(it) {
  try {
    await ElMessageBox.confirm('删除这条访客留言？', '删除', {
      confirmButtonText: '删除',
      cancelButtonText: '再想想',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await api.deleteVisitorTribute(it.id)
    if (it.status === 0) visitor.value.pending = Math.max(0, visitor.value.pending - 1)
    visitor.value.items = visitor.value.items.filter((x) => x.id !== it.id)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(loadVisitor)

async function exportAll() {
  try {
    const data = await api.exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `念念-${pet.value.name || 'data'}-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function remove() {
  try {
    await ElMessageBox.confirm(
      `确定删除「${pet.value.name}」和它的全部记录吗？这个操作不可恢复。`,
      '删除后将无法找回',
      { confirmButtonText: '删除', cancelButtonText: '再想想', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await api.deletePet()
    await loadMe()
    ElMessage.success('已经清空了')
    router.push('/companion')
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>
