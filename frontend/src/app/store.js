import { reactive, computed } from 'vue'
import { api } from './api.js'

/** 全局只有一份身份与选项，页面之间共享，避免每个页面重复拉 /api/me。 */
export const state = reactive({
  me: null,
  loading: true,
  error: ''
})

export const hasPet = computed(() => !!(state.me && state.me.hasPet))
export const pet = computed(() => (state.me ? state.me.pet : null))
export const options = computed(() =>
  state.me ? state.me.options : { personas: [], types: [], moods: [], titles: [] }
)

export async function loadMe() {
  try {
    state.me = await api.me()
    state.error = ''
  } catch (e) {
    state.error = e.message || '连不上服务器'
  } finally {
    state.loading = false
  }
}

let mePromise = null
/** 幂等加载：只发一次 /api/me，供路由守卫与页面复用，避免重复请求。 */
export function ensureMe() {
  if (!state.loading) return Promise.resolve()
  if (!mePromise) {
    mePromise = loadMe().finally(() => {
      mePromise = null
    })
  }
  return mePromise
}

export function personaLabel(key) {
  const hit = options.value.personas.find((p) => p.key === key)
  return hit ? hit.label : ''
}

export function typeLabel(key) {
  const hit = options.value.types.find((t) => t.key === key)
  return hit ? hit.label : ''
}

export function moodMeta(key) {
  return options.value.moods.find((m) => m.key === key) || { label: key, color: '#c9c0b0' }
}
