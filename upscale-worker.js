/* the upscaler runs in here.

   it is the same model hugging face would run for you on their own
   machines — swin2sr, the weights straight off their hub — only it runs
   on this one instead. that is why there is no key and no account: the
   picture never leaves the laptop, so there is nobody to bill.

   a worker because upscaling is arithmetic by the million: on the main
   thread the page would sit still for the whole of it. */

/* the library is fetched rather than kept here, which is the one place
   this project breaks its own rule about vendoring. two reasons: the
   weights and the runtime's wasm come over the wire anyway, so nothing
   is gained offline — and github's secret scanner reads the string
   `Mistral3ForConditionalGeneration` in its model list as a mistral api
   key and refuses the push. the version is pinned, so it cannot change
   under us. */
import { pipeline, env, RawImage } from
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js';

// the runtime's own wasm, pinned to the version this library was built
// against, from the library's own cdn
env.backends.onnx.wasm.wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/';
env.allowLocalModels = false;   // the weights come from the hub

let worker = null;
let loadedAs = '';
let hasGpu = false;

async function lookForGpu() {
    if (!self.navigator || !self.navigator.gpu) return false;
    try {
        return Boolean(await self.navigator.gpu.requestAdapter());
    } catch (error) {
        return false;
    }
}

/* fp32 on purpose: the half-precision build of this model asks
   onnxruntime to re-use a buffer sized for the input on an output twice
   its size, and the run dies on the mismatch. measured — fp32 and q8
   both come out right, fp16 never does. */
function build(model, device, say) {
    return pipeline('image-to-image', model, {
        device,
        dtype: 'fp32',
        progress_callback: (report) => {
            if (report.status === 'progress' && report.total) {
                say({ kind: 'loading', done: report.loaded, total: report.total });
            } else if (report.status === 'done') {
                // the file is here; what follows is the long quiet bit
                say({ kind: 'building', device });
            }
        }
    });
}

/* the gpu does this many times faster than the cpu can, so it is tried
   first. but building the model for a gpu means compiling a shader for
   every piece of it, and on some machines that sits there for minutes
   with nothing to show — which reads exactly like a hang. so it is
   given a minute, and if it hasn't finished by then the cpu has a go
   instead, which is slower to run but starts straight away. */
const GPU_PATIENCE = 60000;

async function getPipe(model, say) {
    if (worker && loadedAs === model) return worker;
    if (worker) {
        // one model at a time: a second would sit in the browser's
        // store beside the first for no good reason
        await worker.dispose();
        worker = null;
    }

    if (hasGpu) {
        let timer = null;
        const patience = new Promise((resolve) => {
            timer = setTimeout(() => resolve('slow'), GPU_PATIENCE);
        });
        const built = build(model, 'webgpu', say).then((pipe) => ({ pipe }), (error) => ({ error }));
        const first = await Promise.race([built, patience]);
        clearTimeout(timer);

        if (first !== 'slow' && first.pipe) {
            worker = first.pipe;
            loadedAs = model;
            return worker;
        }
        say({
            kind: 'fellback',
            why: first === 'slow' ? 'the gpu is taking too long' : 'the gpu would not have it'
        });
    }

    worker = await build(model, 'wasm', say);
    loadedAs = model;
    return worker;
}

self.onmessage = async (event) => {
    const { pixels, width, height, model } = event.data;
    const say = (note) => self.postMessage(note);

    try {
        hasGpu = await lookForGpu();
        say({ kind: 'where', gpu: hasGpu });
        const pipe = await getPipe(model, say);
        say({ kind: 'working' });

        const image = new RawImage(new Uint8ClampedArray(pixels), width, height, 4);
        const bigger = await pipe(image.rgb());
        const rgba = bigger.rgba();

        self.postMessage({
            kind: 'done',
            pixels: rgba.data.buffer,
            width: rgba.width,
            height: rgba.height
        }, [rgba.data.buffer]);
    } catch (error) {
        self.postMessage({ kind: 'failed', message: error.message || String(error) });
    }
};
