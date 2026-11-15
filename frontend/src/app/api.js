/**
 * 后端统一响应信封：{ success, code, message, data }
 * 成功即拆包，失败直接抛出 message，页面里只处理一种错误形态。
 */
async function request(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  })

  const text = await res.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('返回格式异常，稍后再试')
  }

  if (typeof body.success === 'boolean') {
    if (!body.success) {
      const err = new Error(body.message || '请求失败')
      err.status = body.code
      throw err
    }
    return body.data ?? {}
  }
  if (!res.ok) {
    const err = new Error(body.message || body.error || '请求失败')
    err.status = res.status
    throw err
  }
  return body
}

export const api = {
  me: () => request('/api/me'),
  timeline: () => request('/api/timeline'),
  stats: () => request('/api/stats'),

  savePet: (payload) =>
    request('/api/pet', { method: 'POST', body: JSON.stringify(payload) }),
  deletePet: () => request('/api/pet', { method: 'DELETE' }),
  interact: (action) =>
    request('/api/pet/interact', { method: 'POST', body: JSON.stringify({ action }) }),
  waterPlant: () => request('/api/pet/plant/water', { method: 'POST', body: '{}' }),

  // 里程碑 / 生平故事（用户主动写的往事）
  addEvent: (title, body, occurredAt) =>
    request('/api/events', { method: 'POST', body: JSON.stringify({ title, body, occurredAt }) }),
  updateEvent: (id, title, body, occurredAt) =>
    request(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify({ title, body, occurredAt }) }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: 'DELETE' }),

  // 相册
  photos: () => request('/api/photos'),
  addPhotos: (photos) =>
    request('/api/photos', { method: 'POST', body: JSON.stringify({ photos }) }),
  updatePhotoNote: (id, note) =>
    request(`/api/photos/${id}`, { method: 'PUT', body: JSON.stringify({ note }) }),
  deletePhoto: (id) => request(`/api/photos/${id}`, { method: 'DELETE' }),

  moods: () => request('/api/moods'),
  addMood: (mood, note) =>
    request('/api/moods', { method: 'POST', body: JSON.stringify({ mood, note }) }),

  letters: () => request('/api/letters'),
  writeLetter: () => request('/api/letters', { method: 'POST', body: '{}' }),
  aiLetter: () => request('/api/letters/ai', { method: 'POST', body: '{}' }),
  aiLetterStatus: () => request('/api/letters/ai'),

  tributes: () => request('/api/tributes'),
  addTribute: (content) =>
    request('/api/tributes', { method: 'POST', body: JSON.stringify({ content }) }),

  capsules: () => request('/api/capsules'),
  addCapsule: (content, days) =>
    request('/api/capsules', { method: 'POST', body: JSON.stringify({ content, days }) }),
  openCapsule: (id) =>
    request(`/api/capsules/${id}/open`, { method: 'POST', body: '{}' }),

  share: (includePrivate) =>
    request('/api/share', { method: 'POST', body: JSON.stringify({ includePrivate }) }),
  unshare: () => request('/api/share/off', { method: 'POST', body: '{}' }),
  setGuest: (allowGuest, moderate) =>
    request('/api/share/guest', { method: 'POST', body: JSON.stringify({ allowGuest, moderate }) }),

  // 访客留言 / 献花 / 点灯（主人侧管理与审核）
  visitorTributes: () => request('/api/visitor-tributes'),
  approveVisitorTribute: (id) =>
    request(`/api/visitor-tributes/${id}`, { method: 'PUT', body: JSON.stringify({ hide: false }) }),
  hideVisitorTribute: (id) =>
    request(`/api/visitor-tributes/${id}`, { method: 'PUT', body: JSON.stringify({ hide: true }) }),
  deleteVisitorTribute: (id) =>
    request(`/api/visitor-tributes/${id}`, { method: 'DELETE' }),

  exportAll: () => request('/api/export')
}
