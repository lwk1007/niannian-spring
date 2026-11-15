/**
 * 语义抠图主线程入口：管理 BiRefNet worker 的生命周期。
 * 首次调用会触发模型下载（fp16 114MB，走 hf-mirror），之后由浏览器缓存；失败返回 null 让调用方降级。
 */

let worker = null
let readyPromise = null
let lastError = ''

const LOAD_TIMEOUT = 300000 // 首次下载最大 224MB，窄带宽下要几分钟
const INFER_TIMEOUT = 240000 // 推理失败会自动换模型，留足重新加载下一个的时间

export function getMattingError() {
  return lastError
}

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./matting.worker.js', import.meta.url), { type: 'module' })
  worker.onerror = (e) => {
    lastError = (e && e.message) || 'worker 启动失败'
    readyPromise = null
  }
  return worker
}

/** 初始化模型（幂等）。resolve=true 时模型已就绪。 */
function initWorker(onProgress) {
  if (readyPromise) return readyPromise
  const w = ensureWorker()
  readyPromise = new Promise((resolve, reject) => {
    let timer = null
    const done = (fn, arg) => {
      clearTimeout(timer)
      w.removeEventListener('message', onMsg)
      fn(arg)
    }
    const onMsg = (e) => {
      const d = e.data || {}
      if (d.type === 'ready') {
        done(resolve, true)
      } else if (d.type === 'progress') {
        if (onProgress) onProgress(d.progress || 0)
      } else if (d.type === 'error') {
        lastError = d.error || '模型加载失败'
        readyPromise = null
        done(reject, new Error(lastError))
      }
    }
    timer = setTimeout(() => {
      lastError = '模型下载超时'
      readyPromise = null
      done(reject, new Error(lastError))
    }, LOAD_TIMEOUT)
    w.addEventListener('message', onMsg)
    w.postMessage({ type: 'init' })
  })
  return readyPromise
}

/**
 * 对一张 base64 图片做语义抠图。
 * @param {string} dataUrl
 * @param {(p:number)=>void} onProgress 模型下载进度回调（0~1）
 * @returns {Promise<string|null>} 透明 PNG dataUrl，失败返回 null
 */
export async function aiCutout(dataUrl, onProgress) {
  try {
    const w = ensureWorker()
    await initWorker(onProgress)

    return await new Promise((resolve) => {
      const timer = setTimeout(() => {
        lastError = '抠图超时'
        w.removeEventListener('message', onMsg)
        resolve(null)
      }, INFER_TIMEOUT)

      const onMsg = (e) => {
        const d = e.data || {}
        if (d.type === 'result') {
          clearTimeout(timer)
          w.removeEventListener('message', onMsg)
          resolve(d.dataUrl)
        } else if (d.type === 'error') {
          clearTimeout(timer)
          lastError = d.error || '抠图失败'
          w.removeEventListener('message', onMsg)
          resolve(null)
        }
      }
      w.addEventListener('message', onMsg)
      w.postMessage({ type: 'cutout', dataUrl })
    })
  } catch (e) {
    lastError = (e && e.message) || '抠图不可用'
    return null
  }
}
