const pad = (n) => String(n).padStart(2, '0')

export function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/** 完整时刻「2026.11.15 23:40」，用于悬停提示精确时间。 */
export function fmtFull(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 两个时间点的「自然日」差（日历语义，非 24h 近似），b 相对 a 的天数。 */
function calendarDayDiff(a, b) {
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((d2 - d1) / 86400000)
}

/**
 * 智能相对时间：近期显示「刚刚 / X 分钟前 / X 小时前 / 昨天 / 前天 / X 天前」，
 * 超过 30 天回落绝对日期（与 GitHub relative-time-element 的默认阈值一致）。
 * 未来时间（如胶囊解锁日）直接回绝对日期，不硬凑相对词。
 */
export function fmtRelative(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  const diff = Date.now() - d.getTime()
  if (diff < 0) return fmtDate(ts)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const dayDiff = calendarDayDiff(d, new Date())
  if (dayDiff === 0) return `${Math.floor(min / 60)} 小时前`
  if (dayDiff === 1) return '昨天'
  if (dayDiff === 2) return '前天'
  if (dayDiff < 30) return `${dayDiff} 天前`
  return fmtDate(ts)
}

export function fmtMonth(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysLeft(ts) {
  return Math.max(0, Math.ceil((ts - Date.now()) / 86400000))
}

/** 相遇后的第几天（相遇当天算第 1 天），返回 >=1 的整数。 */
export function daysSince(sinceStr) {
  if (!sinceStr) return 1
  const since = new Date(sinceStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(1, Math.round((today - since) / 86400000) + 1)
}

/** 周年信息：若今天是相遇周年返回「相遇 N 周年」；否则返回空串。 */
export function anniversaryText(sinceStr) {
  if (!sinceStr) return ''
  const s = new Date(sinceStr + 'T00:00:00')
  const now = new Date()
  const sameDay = s.getMonth() === now.getMonth() && s.getDate() === now.getDate()
  const years = now.getFullYear() - s.getFullYear()
  if (sameDay && years >= 1) return '相遇 ' + years + ' 周年'
  return ''
}

/** 距下一个里程碑（第 7/30/100/365 天）还有几天；已全部达标返回 null。 */
export function nextMilestone(days) {
  const marks = [7, 30, 100, 365]
  const next = marks.find((m) => days < m)
  if (!next) return null
  return { days: next, left: next - days }
}

/** 把图片读进 canvas 压到 640px 内，减小传输体积；失败时抛错让页面提示换图。 */
export function shrinkImage(file, max = 640, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = reject
    fr.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const cv = document.createElement('canvas')
        cv.width = Math.round(img.width * scale)
        cv.height = Math.round(img.height * scale)
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
        resolve(cv.toDataURL('image/jpeg', quality))
      }
      img.src = fr.result
    }
    fr.readAsDataURL(file)
  })
}
