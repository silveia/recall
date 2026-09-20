/* the upscaler.

   it runs a small trained network — the sub-pixel cnn, 240kb of it,
   kept in this repo — over the picture's brightness, three times bigger,
   a tile at a time. the colour is stretched separately and more
   cheaply, which is what every upscaler of this family does: the eye
   reads detail in brightness and barely notices it in colour.

   it replaced swin2sr, which is a far better network and unusable
   here: measured on this machine, 18 seconds for a 128px tile against
   this one's 7 milliseconds, and fourteen seconds of building before
   either. a picture is thirty tiles. that was the eternity. */

import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/ort.webgpu.bundle.min.mjs';

const MODEL = './upscaler/subpixel-x3.onnx';
const TILE = 224;          // what the network takes, and only this
const GROWN = TILE * 3;    // what it gives back
const EDGE = 8;            // tiles overlap by this, so seams don't show

let session = null;
let ranOn = '';

async function ready(say) {
    if (session) return session;
    // the gpu if there is one; the processor is thirty times slower but
    // still counted in milliseconds, which is the whole point of a
    // network this size
    for (const providers of [['webgpu', 'wasm'], ['wasm']]) {
        try {
            session = await ort.InferenceSession.create(MODEL, { executionProviders: providers });
            ranOn = providers[0];
            say({ kind: 'where', on: ranOn });
            return session;
        } catch (error) {
            session = null;
        }
    }
    throw new Error('the model would not start');
}

/* brightness and colour, kept apart. the network only ever sees the
   first; the other two are stretched by hand further down. */
function pull(pixels, width, height) {
    const y = new Float32Array(width * height);
    const cb = new Float32Array(width * height);
    const cr = new Float32Array(width * height);
    for (let at = 0, p = 0; at < pixels.length; at += 4, p += 1) {
        const r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
        y[p] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        cb[p] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        cr[p] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }
    return { y, cb, cr };
}

// the colour, stretched smoothly — no network, nobody would see one
function stretch(plane, width, height, times) {
    const wide = width * times;
    const tall = height * times;
    const out = new Float32Array(wide * tall);
    for (let row = 0; row < tall; row += 1) {
        const fromY = Math.min(height - 1, row / times);
        const y0 = Math.floor(fromY), y1 = Math.min(height - 1, y0 + 1), dy = fromY - y0;
        for (let col = 0; col < wide; col += 1) {
            const fromX = Math.min(width - 1, col / times);
            const x0 = Math.floor(fromX), x1 = Math.min(width - 1, x0 + 1), dx = fromX - x0;
            const top = plane[y0 * width + x0] * (1 - dx) + plane[y0 * width + x1] * dx;
            const bottom = plane[y1 * width + x0] * (1 - dx) + plane[y1 * width + x1] * dx;
            out[row * wide + col] = top * (1 - dy) + bottom * dy;
        }
    }
    return out;
}

/* one tile of brightness, always exactly the size the network expects.
   where the picture runs out, its edge pixels are repeated to fill the
   tile — a constant shape is what lets the machinery be built once and
   used for every tile after. */
function cutTile(y, width, height, left, top) {
    const tile = new Float32Array(TILE * TILE);
    for (let row = 0; row < TILE; row += 1) {
        const fromY = Math.min(height - 1, Math.max(0, top + row));
        for (let col = 0; col < TILE; col += 1) {
            const fromX = Math.min(width - 1, Math.max(0, left + col));
            tile[row * TILE + col] = y[fromY * width + fromX];
        }
    }
    return tile;
}

self.onmessage = async (event) => {
    const { pixels, width, height } = event.data;
    const say = (note) => self.postMessage(note);

    try {
        const net = await ready(say);
        const parts = pull(new Uint8ClampedArray(pixels), width, height);

        const wide = width * 3;
        const tall = height * 3;
        const grownY = new Float32Array(wide * tall);

        // the tiles step by less than their width, so each one overlaps
        // its neighbour and the join has no line down it
        const step = TILE - EDGE * 2;
        const across = Math.max(1, Math.ceil(width / step));
        const down = Math.max(1, Math.ceil(height / step));
        say({ kind: 'tiles', total: across * down });

        let done = 0;
        for (let ty = 0; ty < down; ty += 1) {
            for (let tx = 0; tx < across; tx += 1) {
                const left = tx * step - EDGE;
                const top = ty * step - EDGE;
                const tile = cutTile(parts.y, width, height, left, top);

                const answer = await net.run({
                    [net.inputNames[0]]: new ort.Tensor('float32', tile, [1, 1, TILE, TILE])
                });
                const big = answer[net.outputNames[0]].data;

                // only the middle of each tile is kept: the overlap was
                // there to give the edges something to look at
                for (let row = EDGE * 3; row < GROWN - EDGE * 3; row += 1) {
                    const intoRow = (top + row / 3) * 3;
                    if (intoRow < 0 || intoRow >= tall) continue;
                    for (let col = EDGE * 3; col < GROWN - EDGE * 3; col += 1) {
                        const intoCol = (left + col / 3) * 3;
                        if (intoCol < 0 || intoCol >= wide) continue;
                        grownY[Math.round(intoRow) * wide + Math.round(intoCol)] = big[row * GROWN + col];
                    }
                }

                done += 1;
                say({ kind: 'tile', done, total: across * down });
            }
        }

        const grownCb = stretch(parts.cb, width, height, 3);
        const grownCr = stretch(parts.cr, width, height, 3);

        const out = new Uint8ClampedArray(wide * tall * 4);
        for (let p = 0, at = 0; p < grownY.length; p += 1, at += 4) {
            const light = grownY[p] * 255;
            const blue = grownCb[p] - 128;
            const red = grownCr[p] - 128;
            out[at] = light + 1.402 * red;
            out[at + 1] = light - 0.344136 * blue - 0.714136 * red;
            out[at + 2] = light + 1.772 * blue;
            out[at + 3] = 255;
        }

        self.postMessage({ kind: 'done', pixels: out.buffer, width: wide, height: tall, on: ranOn },
                         [out.buffer]);
    } catch (error) {
        self.postMessage({ kind: 'failed', message: error.message || String(error) });
    }
};
