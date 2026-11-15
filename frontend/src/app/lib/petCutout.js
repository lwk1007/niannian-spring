/**
 * 宠物抠图统一入口（纯前端，两级确定性通道 + 一个默认关闭的 AI 通道）：
 *  1. 纸白底 → 连通性泛洪；
 *  2. 任意纯色底 → 边框主色色键 + 同一套连通性算法。
 * 两者都失败时返回 null，调用方降级为整图平铺。
 *
 * 关于 ENABLE_AI：语义抠图（BiRefNet-lite / RMBG-1.4）在当前浏览器里跑不通，实测两类硬限制：
 *  - wasm：1024×1024 输入的激活超出 wasm32 内存，OrtRun 直接 std::bad_alloc（fp16/fp32/单线程都试过）；
 *  - WebGPU：ORT 把算子拼进一个 shader，超过设备的 maxStorageBuffersPerShaderStage=16（需要 17）。
 * 所以默认关掉，免得用户白等几分钟再看到「没识别出主体」。等 onnxruntime-web 修了这两条，
 * 把 ENABLE_AI 改回 true 即可，下面的模型/降级链路都是完整的。
 */
import { dewhiteCutout } from './cutout.js'
import { aiCutout } from './matting.js'

const ENABLE_AI = false

/**
 * @param {string} photo 照片 dataUrl（jpeg）
 * @param {(p:number)=>void} onProgress AI 模型下载进度（0~1）
 * @returns {Promise<{cutout: string|null, method: 'dewhite'|'chroma'|'ai'|'none'}>}
 */
export async function cutoutPet(photo, onProgress) {
  try {
    const fast = await dewhiteCutout(photo)
    if (fast.cutout) return { cutout: fast.cutout, method: fast.method }

    if (!ENABLE_AI) return { cutout: null, method: 'none' }

    const ai = await aiCutout(photo, onProgress)
    if (ai) return { cutout: ai, method: 'ai' }

    return { cutout: null, method: 'none' }
  } catch (e) {
    return { cutout: null, method: 'none' }
  }
}
