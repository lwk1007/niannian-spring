/**
 * 照片抠图编排（纯前端，两级）：
 *  1. 纸白底 → dewhite 连通性泛洪，秒出透明贴纸；
 *  2. 任意纯色底（摄影棚布、浅灰、黑底）→ 先取边框主色，再用同一套连通性算法抠，
 *     只是把「是不是白」换成「是不是这个背景色」。
 *  都不成 → needAI=true，交给语义抠图（matting.js）。
 */

import { removeWhite, applyAlpha, borderWhiteRatio, removedRatio } from './dewhite.js'

/** base64 图片 → ImageData（画到离屏 canvas 再取像素）。 */
export function dataUrlToImageData(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('这张图读不出来'))
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!w || !h) return reject(new Error('图片尺寸异常'))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      let data
      try {
        data = ctx.getImageData(0, 0, w, h)
      } catch (e) {
        return reject(new Error('读不到这张图的像素'))
      }
      resolve({ data, w, h })
    }
    img.src = dataUrl
  })
}

/** ImageData → 透明 PNG dataUrl。 */
export function imageDataToPng(imageData, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/** 边框像素的主色：按 16 级量化找众数箱，再取该箱平均色。 */
export function edgeDominant(rgba, w, h) {
  const bins = new Map()
  const push = (i) => {
    const p = i * 4
    if (rgba[p + 3] < 8) return
    const key = ((rgba[p] >> 4) << 8) | ((rgba[p + 1] >> 4) << 4) | (rgba[p + 2] >> 4)
    let b = bins.get(key)
    if (!b) {
      b = { n: 0, r: 0, g: 0, b: 0 }
      bins.set(key, b)
    }
    b.n++
    b.r += rgba[p]
    b.g += rgba[p + 1]
    b.b += rgba[p + 2]
  }
  const step = Math.max(1, Math.round(Math.min(w, h) / 240))
  for (let x = 0; x < w; x += step) {
    push(x)
    if (h > 1) push((h - 1) * w + x)
  }
  for (let y = step; y < h - 1; y += step) {
    push(y * w)
    if (w > 1) push(y * w + w - 1)
  }
  let best = null
  for (const b of bins.values()) if (!best || b.n > best.n) best = b
  if (!best) return null
  return {
    color: [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)],
    count: best.n
  }
}

/** 边框上有多少比例的像素接近给定色（判断「是不是纯色底」）。 */
export function edgeMatchRatio(rgba, w, h, ref, tol) {
  const tol2 = tol * tol
  let hit = 0
  let total = 0
  const test = (i) => {
    const p = i * 4
    total++
    if (rgba[p + 3] < 8) {
      hit++
      return
    }
    const dr = rgba[p] - ref[0]
    const dg = rgba[p + 1] - ref[1]
    const db = rgba[p + 2] - ref[2]
    if (dr * dr + dg * dg + db * db < tol2) hit++
  }
  const step = Math.max(1, Math.round(Math.min(w, h) / 240))
  for (let x = 0; x < w; x += step) {
    test(x)
    if (h > 1) test((h - 1) * w + x)
  }
  for (let y = step; y < h - 1; y += step) {
    test(y * w)
    if (w > 1) test(y * w + w - 1)
  }
  return total ? hit / total : 0
}

/**
 * 对一张照片做抠图。
 * @returns {{ cutout: string|null, method: 'dewhite'|'chroma'|'none', needAI: boolean }}
 */
export async function dewhiteCutout(dataUrl) {
  const { data, w, h } = await dataUrlToImageData(dataUrl)
  const rgba = data.data

  // 第一级：纸白底
  const whiteRatio = borderWhiteRatio(rgba, w, h)
  if (whiteRatio >= 0.45) {
    const res = removeWhite(rgba, w, h)
    if (res.applied) {
      const removed = removedRatio(res)
      if (removed >= 0.02 && removed < 0.96) {
        applyAlpha(rgba, res.alpha)
        return { cutout: imageDataToPng(data, w, h), method: 'dewhite', needAI: false }
      }
    }
  }

  // 第二级：任意纯色底
  const dom = edgeDominant(rgba, w, h)
  if (dom) {
    const ref = dom.color
    const ratio = edgeMatchRatio(rgba, w, h, ref, 46)
    if (ratio >= 0.5) {
      const tol2 = 46 * 46
      const res = removeWhite(rgba, w, h, {
        isBg: (r, g, b) => {
          const dr = r - ref[0]
          const dg = g - ref[1]
          const db = b - ref[2]
          return dr * dr + dg * dg + db * db < tol2
        },
        bgRef: ref,
        bgTol: 46,
        minBorderRatio: 0.45
      })
      if (res.applied) {
        const removed = removedRatio(res)
        // 去掉太少（几乎没动）或太多（把主体也吃了）都不可信
        if (removed >= 0.04 && removed < 0.95) {
          applyAlpha(rgba, res.alpha)
          return { cutout: imageDataToPng(data, w, h), method: 'chroma', needAI: false }
        }
      }
    }
  }

  return { cutout: null, method: 'none', needAI: true, borderRatio: whiteRatio }
}
