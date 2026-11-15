<template>
  <div class="shell" :class="{ solo: isOnboarding }">
    <aside v-if="!isOnboarding" class="side">
      <a class="side-brand" href="/">
        <span class="brand-mark">念</span>
        <span>念念</span>
      </a>
      <nav class="side-nav">
        <router-link
          v-for="item in NAV"
          :key="item.name"
          :to="'/' + item.name"
          class="nav-item"
          :class="{ on: isActive(item.name) }"
        >
          <span class="glyph"><component :is="item.icon" /></span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="side-foot">
        <p>数据存在这台服务器上<br />重要内容请自己导一份</p>
        <a href="/">← 回到首页</a>
      </div>
    </aside>

    <div class="main-wrap">
      <div class="main-inner">
        <header class="topbar">
          <div>
            <h2>{{ title }}</h2>
            <span class="topbar-sub">{{ sub }}</span>
          </div>
          <div class="topbar-actions">
            <el-button v-if="hasPet && !isOnboarding" size="small" plain @click="share">
              分享这一页
            </el-button>
            <a v-else-if="!hasPet && !isOnboarding" class="btn btn-ghost btn-sm" href="/">回到首页</a>
          </div>
        </header>

        <div v-if="state.loading" class="state-loading">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else-if="state.error" class="state-error">
          <p>{{ state.error }}</p>
          <el-button class="retry" size="small" plain @click="reload">再试一次</el-button>
        </div>

        <router-view v-else v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>
    </div>

    <nav v-if="!isOnboarding" class="tabbar">
      <router-link
        v-for="item in tabs"
        :key="item.name"
        :to="'/' + item.name"
        class="tab"
        :class="{ on: isActive(item.name) }"
      >
        <i><component :is="item.icon" /></i>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from './ui.js'
import { NAV } from './router.js'
import { state, hasPet, pet, loadMe } from './store.js'
import { api } from './api.js'

const route = useRoute()
const tabs = NAV.filter((i) => i.tab)

const isActive = (name) => route.name === name
const isOnboarding = computed(() => route.name === 'onboarding')

const current = computed(() => {
  if (route.name === 'onboarding') {
    const editing = route.query.edit === '1'
    return {
      label: editing ? '修改资料' : '欢迎',
      sub: editing ? '改完记得保存' : '先认识你的 TA'
    }
  }
  return NAV.find((i) => i.name === route.name) || NAV[0]
})
const title = computed(() => current.value.label)
const sub = computed(() => current.value.sub)

watch(
  () => [title.value, state.loading],
  () => {
    if (!state.loading) document.title = '念念 · ' + title.value
  },
  { immediate: true }
)

function reload() {
  state.loading = true
  state.error = ''
  loadMe()
}

async function share() {
  try {
    if (!pet.value.shareId) {
      await api.share(false)
      await loadMe()
    }
    const url = location.origin + '/s/' + pet.value.shareId
    try {
      await navigator.clipboard.writeText(url)
      ElMessage.success('分享链接已复制')
    } catch {
      window.prompt('复制这个链接发给别人：', url)
    }
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>
