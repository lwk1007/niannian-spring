const pad = (n) => String(n).padStart(2, '0')

export function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
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
