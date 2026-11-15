import { createRouter, createWebHistory } from 'vue-router'
import { markRaw } from 'vue'
import { HomeFilled, Clock, Message, Sunny, Bell, Box, User, Picture, DataAnalysis } from '@element-plus/icons-vue'

import CompanionView from './views/CompanionView.vue'
import MemoryView from './views/MemoryView.vue'
import AlbumView from './views/AlbumView.vue'
import LetterView from './views/LetterView.vue'
import MoodView from './views/MoodView.vue'
import TributeView from './views/TributeView.vue'
import CapsuleView from './views/CapsuleView.vue'
import ProfileView from './views/ProfileView.vue'
import StatsView from './views/StatsView.vue'
import OnboardingView from './views/OnboardingView.vue'
import { state, hasPet, ensureMe } from './store.js'

export const NAV = [
  { name: 'companion', label: '陪伴', icon: markRaw(HomeFilled), tab: true, sub: '每天来看它一眼' },
  { name: 'memory', label: '回忆', icon: markRaw(Clock), tab: true, sub: '相遇、日子、心情与信' },
  { name: 'stats', label: '陪伴数据', icon: markRaw(DataAnalysis), tab: true, sub: '摸过、喂过、玩过的日子' },
  { name: 'album', label: '相册', icon: markRaw(Picture), tab: false, sub: '一张张照片，替它收好' },
  { name: 'letter', label: '一封信', icon: markRaw(Message), tab: true, sub: '以它的口吻，说几句真话' },
  { name: 'mood', label: '心情', icon: markRaw(Sunny), tab: true, sub: '不用每天都好' },
  { name: 'tribute', label: '思念信箱', icon: markRaw(Bell), tab: false, sub: '写下来，点一支灯' },
  { name: 'capsule', label: '时光胶囊', icon: markRaw(Box), tab: false, sub: '写给以后，到期才打开' },
  { name: 'profile', label: '我的', icon: markRaw(User), tab: true, sub: '资料、分享与数据' }
]

const routes = [
  { path: '/onboarding', name: 'onboarding', component: OnboardingView },
  { path: '/', redirect: '/companion' },
  { path: '/companion', name: 'companion', component: CompanionView },
  { path: '/memory', name: 'memory', component: MemoryView },
  { path: '/stats', name: 'stats', component: StatsView },
  { path: '/album', name: 'album', component: AlbumView },
  { path: '/letter', name: 'letter', component: LetterView },
  { path: '/mood', name: 'mood', component: MoodView },
  { path: '/tribute', name: 'tribute', component: TributeView },
  { path: '/capsule', name: 'capsule', component: CapsuleView },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/:pathMatch(.*)*', redirect: '/companion' }
]

export const router = createRouter({
  history: createWebHistory('/app/'),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 导航守卫：把「有没有宠物」的引导显式化 —— 无宠物先进领养页，而非全局拦截所有 tab
router.beforeEach(async (to) => {
  await ensureMe()

  // 接口出错时放行，交给页面展示错误态 + 重试，不要在错误上再跳来跳去
  if (state.error) return true

  const editing = to.query.edit === '1'

  if (to.name === 'onboarding') {
    // 编辑资料必须已有宠物；领养必须还没有宠物
    if (editing && !hasPet.value) return { name: 'onboarding' }
    if (!editing && hasPet.value) return { name: 'companion' }
    return true
  }

  // 其余页面：没有宠物时先去领养（「我的」页例外，可先看）
  if (!hasPet.value && to.name !== 'profile') {
    return { name: 'onboarding' }
  }
  return true
})
