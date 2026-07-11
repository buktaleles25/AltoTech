/// <reference lib="webworker" />
import { AutoModel, AutoProcessor, env, RawImage } from '@huggingface/transformers'

const ctx = self as unknown as DedicatedWorkerGlobalScope

// โหลดโมเดลจาก HF CDN เท่านั้น (ไม่มีโมเดล local)
env.allowLocalModels = false
// single-thread wasm → ไม่ต้องใช้ cross-origin isolation (GitHub Pages ตั้งไม่ได้)
if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1

// BiRefNet_lite (MIT) — ลอง id สำรองเผื่อชื่อ repo ต่างกัน
const MODEL_IDS = ['onnx-community/BiRefNet_lite-ONNX', 'onnx-community/BiRefNet_lite']

type Loaded = { model: unknown; processor: unknown }
let loadPromise: Promise<Loaded> | null = null

async function detectDevice(): Promise<'webgpu' | 'wasm'> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu
  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter()
      if (adapter) return 'webgpu'
    } catch {
      /* fall through */
    }
  }
  return 'wasm'
}

function post(msg: Record<string, unknown>, transfer?: Transferable[]) {
  if (transfer) ctx.postMessage(msg, transfer)
  else ctx.postMessage(msg)
}

async function loadModel(): Promise<Loaded> {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const device = await detectDevice()
    const dtypes = device === 'webgpu' ? ['fp32'] : ['q8', 'fp32']
    const progress_callback = (p: unknown) => post({ type: 'progress', progress: p })

    let lastErr: unknown
    for (const id of MODEL_IDS) {
      for (const dtype of dtypes) {
        try {
          const model = await AutoModel.from_pretrained(id, {
            device,
            // @ts-expect-error dtype string accepted at runtime
            dtype,
            progress_callback,
          })
          const processor = await AutoProcessor.from_pretrained(id)
          return { model, processor }
        } catch (e) {
          lastErr = e
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('โหลดโมเดลไม่สำเร็จ')
  })()
  return loadPromise
}

ctx.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  try {
    if (msg.type === 'init') {
      await loadModel()
      post({ type: 'ready' })
      return
    }

    if (msg.type === 'remove') {
      const { id, data, width, height } = msg as {
        id: number
        data: ArrayBuffer
        width: number
        height: number
      }
      const { model, processor } = await loadModel()

      const src = new Uint8ClampedArray(data)
      const image = new RawImage(src, width, height, 4)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { pixel_values } = await (processor as any)(image)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out = await (model as any)({ input_image: pixel_values })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maskTensor = (out.output_image ?? out.output ?? Object.values(out)[0]) as any
      const mask = await RawImage.fromTensor(
        maskTensor[0].sigmoid().mul(255).to('uint8'),
      ).resize(width, height)

      // ใส่ mask เป็น alpha channel ของรูปต้นฉบับ
      const result = new Uint8ClampedArray(src) // คัดลอก RGB, จะทับ alpha
      const m = mask.data as Uint8Array
      for (let i = 0; i < width * height; i++) result[i * 4 + 3] = m[i]

      post({ type: 'result', id, data: result.buffer, width, height }, [result.buffer])
      return
    }
  } catch (err) {
    post({
      type: 'error',
      id: (msg && msg.id) ?? null,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
