/**
 * 语义抠图 Worker：在独立线程里加载背景移除模型并跑主体分割，
 * 避免 100MB 级模型加载与推理卡住主界面。
 *
 * 不能直连外网：huggingface.co 国内超时；hf-mirror 在浏览器里对带 Range 头的跨域请求
 * 一律 net::ERR_FAILED（transformers.js 取元数据必带 Range: bytes=0-0），curl 能过、浏览器过不了。
 * 所以统一走同源后端代理 /api/model/**：无跨域、Range 由服务端实现、模型在服务端只拉一次。
 *
 * 模型按代价从低到高排：RMBG-1.4 的 int8 只要 44MB，BiRefNet-lite 的 fp16 要 114MB，
 * 且 BiRefNet 在 wasm 上推理会 std::bad_alloc（1024 输入激活太大），实测跑不通，
 * 所以它只作兜底候选：真的加载成功但推理炸了，会自动换下一个，不会卡住用户。
 */
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
// 必须是绝对地址：relative 会相对 worker 脚本所在目录解析，落到 /assets/api/... 上
env.remoteHost = self.location.origin + '/api/model/'
env.remotePathTemplate = '{model}/resolve/{revision}/'

/**
 * 尝试顺序：先 GPU 后 CPU。
 * BiRefNet 输入 1024×1024，wasm 单实例内存顶不住（OrtRun 直接 std::bad_alloc，实测 fp16/fp32/
 * 单线程都炸），但同一份 fp16 权重放 WebGPU 上只要一两秒；没有 WebGPU 的设备才落到 wasm，
 * 那时优先换体积更小的 RMBG-1.4。
 */
const PLANS = [
  { id: 'onnx-community/BiRefNet_lite-ONNX', device: 'webgpu', dtype: 'fp16' },
  { id: 'onnx-community/BiRefNet_lite-ONNX', device: 'webgpu', dtype: 'fp32' },
  { id: 'briaai/RMBG-1.4', device: 'webgpu', dtype: 'q8' },
  { id: 'onnx-community/BiRefNet_lite-ONNX', device: 'wasm', dtype: 'fp16' }
]

// 多线程 wasm 每个线程一份独立内存，1024 输入的激活容易把内存顶爆，单线程稳一点。
try {
  env.backends.onnx.wasm.numThreads = 1
} catch (e) {
  /* 老版本没有这个字段就跳过 */
}

const state = { pipe: null, key: '', bad: new Set(), loading: null }

function reportProgress(p) {
  if (p && typeof p.progress === 'number') {
    self.postMessage({
      type: 'progress',
      progress: p.progress,
      file: p.file || '',
      model: p.model || '',
      dtype: p.dtype || ''
    })
  }
}

/** 按尝试顺序建 pipeline；建不起来（无 WebGPU / 加载失败）的进黑名单，下次跳过。 */
async function ensurePipe() {
  if (state.pipe) return state.pipe
  if (state.loading) return state.loading

  state.loading = (async () => {
    for (const plan of PLANS) {
      const key = `${plan.id}@${plan.device}@${plan.dtype}`
      if (state.bad.has(key)) continue
      try {
        const p = await pipeline('background-removal', plan.id, {
          device: plan.device,
          dtype: plan.dtype,
          // ORT WebGPU 默认把多个算子拼进一个 shader，BiRefNet 会超过设备 16 个 storage buffer 的上限；
          // NHWC 布局少一层转置，能把需要的 buffer 数压下来。
          session_options: plan.device === 'webgpu' ? { preferredLayout: 'NHWC' } : undefined,
          progress_callback: (x) => reportProgress({ ...x, model: plan.id, dtype: plan.dtype })
        })
        state.pipe = p
        state.key = key
        self.postMessage({ type: 'ready', model: plan.id, device: plan.device, dtype: plan.dtype })
        return p
      } catch (err) {
        state.bad.add(key)
        self.postMessage({
          type: 'progress',
          progress: 0,
          retry: true,
          model: plan.id,
          dtype: plan.dtype,
          note: (err && err.message) || 'load failed'
        })
      }
    }
    throw new Error('没有可用的抠图模型')
  })()

  try {
    return await state.loading
  } finally {
    state.loading = null
  }
}

/** background-removal 的返回是 RawImage[]（每个输入一张），也可能被实现成单个对象，两种都接。 */
function toDataUrl(out) {
  const one = Array.isArray(out) ? out[0] : out
  if (!one) return null
  if (typeof one.toDataURL === 'function') return one.toDataURL('image/png')
  return null
}

self.onmessage = async (e) => {
  const { type, dataUrl } = e.data || {}

  if (type === 'init') {
    try {
      await ensurePipe()
      self.postMessage({ type: 'ready', model: state.key })
    } catch (err) {
      self.postMessage({ type: 'error', error: (err && err.message) || '模型加载失败' })
    }
    return
  }

  if (type === 'cutout') {
    // 加载成功但推理炸掉的模型（wasm 内存不够）当场拉黑，换下一个再试
    for (let attempt = 0; attempt < 6; attempt++) {
      let p
      try {
        p = await ensurePipe()
      } catch (err) {
        self.postMessage({ type: 'error', error: (err && err.message) || '模型加载失败' })
        return
      }
      try {
        const out = await p(dataUrl)
        const result = toDataUrl(out)
        if (!result) {
          self.postMessage({ type: 'error', error: '抠图结果无法读取' })
          return
        }
        self.postMessage({ type: 'result', dataUrl: result })
        return
      } catch (err) {
        state.bad.add(state.key)
        state.pipe = null
        state.key = ''
        self.postMessage({
          type: 'progress',
          progress: 0,
          retry: true,
          note: (err && err.message) || 'inference failed'
        })
      }
    }
    self.postMessage({ type: 'error', error: '这台设备跑不动抠图模型' })
  }
}
