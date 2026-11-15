/**
 * 去白底 —— 从念念小程序 `utils/dewhite.js` 原样移植到 Web（ESM 版）。
 *
 * 只清「和画面四边连通的纸白」，被轮廓围住的白一律保留。
 * 为什么必须按连通性、而不是按颜色来分：白底配白色主体时（白猫、白瓷杯），
 * 主体和背景同色，颜色层面没有可分信息，真正能分开的是拓扑 —— 背景那层纸连着
 * 照片边缘，主体内部的纸被墨线/轮廓圈住了、够不到边缘。所以从四边泛洪，只吃够得着的白。
 */

// 判定「纸白」：够亮 + 不够艳（白纸可能偏暖，给 18 的色差余量）
const TONE = { lum: 226, chroma: 18 }

// 贴着主体的那圈浅灰不算白，但也不该实心，否则抠完主体边缘挂一圈毛边
const SOFT_LUM = 208
const SOFT_ALPHA = 96

// 边框上白色占比低于这个值，就认为不是白底图，直接不动
const MIN_BORDER_RATIO = 0.45

// 封口半径（像素）。手绘断口通常 1~3px，2 够用
const SEAL_RADIUS = 2

// 边缘细条清理
const EDGE_BAND_RATIO = 0.008
const EDGE_BAND_MAX = 3
const EDGE_COVER = 0.5
const EDGE_GAP = 0.35
const EDGE_VISIBLE = 40

function num(v, d) {
  return typeof v === 'number' && isFinite(v) ? v : d
}

export function isWhiteish(r, g, b, tone) {
  const t = tone || TONE
  const max = r > g ? (r > b ? r : b) : (g > b ? g : b)
  const min = r < g ? (r < b ? r : b) : (g < b ? g : b)
  return min >= t.lum && max - min <= t.chroma
}

export function borderWhiteRatio(rgba, w, h, tone, pred) {
  if (!rgba || !w || !h) return 0
  let white = 0
  let total = 0
  const test = (i) => {
    const p = i * 4
    total++
    if (rgba[p + 3] < 8) { white++; return }
    const hit = pred
      ? pred(rgba[p], rgba[p + 1], rgba[p + 2])
      : isWhiteish(rgba[p], rgba[p + 1], rgba[p + 2], tone)
    if (hit) white++
  }
  for (let x = 0; x < w; x++) {
    test(x)
    if (h > 1) test((h - 1) * w + x)
  }
  for (let y = 1; y < h - 1; y++) {
    test(y * w)
    if (w > 1) test(y * w + w - 1)
  }
  return total ? white / total : 0
}

function dilate(mask, w, h, r) {
  let cur = mask
  const total = w * h
  for (let s = 0; s < r; s++) {
    const next = new Uint8Array(total)
    for (let i = 0; i < total; i++) {
      if (cur[i]) { next[i] = 1; continue }
      const x = i % w
      const y = (i - x) / w
      if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1])
        || (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) next[i] = 1
    }
    cur = next
  }
  return cur
}

function growBg(bg, wall, w, h, steps) {
  let frontier = []
  for (let i = 0; i < bg.length; i++) {
    if (bg[i]) frontier.push(i)
  }
  for (let s = 0; s < steps && frontier.length; s++) {
    const next = []
    for (let n = 0; n < frontier.length; n++) {
      const i = frontier[n]
      const x = i % w
      const y = (i - x) / w
      if (x > 0 && !bg[i - 1] && !wall[i - 1]) { bg[i - 1] = 1; next.push(i - 1) }
      if (x < w - 1 && !bg[i + 1] && !wall[i + 1]) { bg[i + 1] = 1; next.push(i + 1) }
      if (y > 0 && !bg[i - w] && !wall[i - w]) { bg[i - w] = 1; next.push(i - w) }
      if (y < h - 1 && !bg[i + w] && !wall[i + w]) { bg[i + w] = 1; next.push(i + w) }
    }
    frontier = next
  }
}

function stripEdgeLines(alpha, w, h, opts) {
  if (!alpha || !w || !h) return 0
  const o = opts || {}
  const visible = num(o.edgeVisible, EDGE_VISIBLE)
  const band = Math.max(2, Math.min(
    Math.round(Math.min(w, h) * num(o.bandRatio, EDGE_BAND_RATIO)),
    num(o.bandMax, EDGE_BAND_MAX)
  ))
  const COVER = num(o.edgeCover, EDGE_COVER)
  const GAP = num(o.edgeGap, EDGE_GAP)

  const lineLen = (dir) => (dir < 2 ? w : h)
  const idxOf = (dir, i, k) => {
    if (dir === 0) return i * w + k
    if (dir === 1) return (h - 1 - i) * w + k
    if (dir === 2) return k * w + i
    return k * w + (w - 1 - i)
  }
  const cover = (dir, i) => {
    if (i >= (dir < 2 ? h : w)) return 1
    const n = lineLen(dir)
    let c = 0
    for (let k = 0; k < n; k++) if (alpha[idxOf(dir, i, k)] >= visible) c++
    return c / n
  }

  let cleared = 0
  for (let dir = 0; dir < 4; dir++) {
    let i = 0
    while (i < band && cover(dir, i) < COVER) i++
    if (i >= band) continue
    let j = i
    while (j + 1 < band && cover(dir, j + 1) >= COVER) j++
    if (cover(dir, j + 1) > GAP) continue
    const n = lineLen(dir)
    for (let r = i; r <= j; r++) {
      for (let k = 0; k < n; k++) {
        const idx = idxOf(dir, r, k)
        if (alpha[idx]) alpha[idx] = 0
      }
    }
    cleared += j - i + 1
  }
  return cleared
}

/**
 * 主体去掉白底之后的 alpha 通道。
 * 返回 applied=false 时 alpha 全是 255，调用方按「没处理」对待。
 */
export function removeWhite(rgba, w, h, opts) {
  const o = opts || {}
  const tone = Object.assign({}, TONE, o.tone)
  // 除了纸白，还可以传自己的「背景谓词」（纯色底：摄影棚布、浅灰、黑底都能用），
  // 连通的拓扑判据不变，所以白猫站在白底上依旧不会被吃穿。
  const pred = typeof o.isBg === 'function' ? o.isBg : null
  const total = w * h
  const alpha = new Uint8ClampedArray(total)
  alpha.fill(255)
  if (!rgba || !w || !h) {
    return { alpha, removed: 0, kept: 0, total: 0, borderRatio: 0, applied: false }
  }

  const borderRatio = borderWhiteRatio(rgba, w, h, tone, pred)
  if (borderRatio < num(o.minBorderRatio, MIN_BORDER_RATIO)) {
    return { alpha, removed: 0, kept: 0, total, borderRatio, applied: false }
  }

  const wall = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    const p = i * 4
    if (rgba[p + 3] < 8) continue
    const hit = pred
      ? pred(rgba[p], rgba[p + 1], rgba[p + 2])
      : isWhiteish(rgba[p], rgba[p + 1], rgba[p + 2], tone)
    if (!hit) wall[i] = 1
  }

  const seal = Math.max(0, Math.round(num(o.seal, SEAL_RADIUS)))
  const blocked = seal > 0 ? dilate(wall, w, h, seal) : wall

  const bg = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0
  const seed = (i) => {
    if (bg[i] || blocked[i]) return
    bg[i] = 1
    queue[tail++] = i
  }
  for (let x = 0; x < w; x++) {
    seed(x)
    if (h > 1) seed((h - 1) * w + x)
  }
  for (let y = 1; y < h - 1; y++) {
    seed(y * w)
    if (w > 1) seed(y * w + w - 1)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    const y = (i - x) / w
    if (x > 0) seed(i - 1)
    if (x < w - 1) seed(i + 1)
    if (y > 0) seed(i - w)
    if (y < h - 1) seed(i + w)
  }

  if (seal > 0) growBg(bg, wall, w, h, seal)

  let removed = 0
  let kept = 0
  for (let i = 0; i < total; i++) {
    if (bg[i]) { alpha[i] = 0; removed++ }
    else if (!wall[i]) kept++
  }

  const softLum = num(o.softLum, SOFT_LUM)
  const softAlpha = num(o.softAlpha, SOFT_ALPHA)
  const ref = o.bgRef
  const refTol = num(o.bgTol, 48)
  for (let i = 0; i < total; i++) {
    if (bg[i]) continue
    const x = i % w
    const y = (i - x) / w
    const nearBg = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1])
      || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w])
    if (!nearBg) continue
    const p = i * 4
    if (ref) {
      // 纯色底：按与背景色的距离做软边，深色底也能有过渡
      const d = Math.sqrt((rgba[p] - ref[0]) ** 2 + (rgba[p + 1] - ref[1]) ** 2 + (rgba[p + 2] - ref[2]) ** 2)
      if (d < refTol * 1.8) {
        const t = (d - refTol) / Math.max(1, refTol * 0.8)
        alpha[i] = Math.round(softAlpha + (255 - softAlpha) * Math.min(1, Math.max(0, t)))
      }
      continue
    }
    const lum = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]
    if (lum >= softLum) alpha[i] = softAlpha
  }

  if (o.edgeClean !== false) stripEdgeLines(alpha, w, h, o)

  return { alpha, removed, kept, total, borderRatio, applied: true }
}

/** 把算好的 alpha 写回 ImageData 的 A 通道。 */
export function applyAlpha(rgba, alpha) {
  if (!rgba || !alpha) return rgba
  const n = Math.min(alpha.length, rgba.length / 4)
  for (let i = 0; i < n; i++) rgba[i * 4 + 3] = alpha[i]
  return rgba
}

export function removedRatio(res) {
  if (!res || !res.total) return 0
  return res.removed / res.total
}

export function keptRatio(res) {
  if (!res || !res.total) return 0
  return res.kept / res.total
}
