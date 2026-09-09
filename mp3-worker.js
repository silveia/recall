/* ============================================================
   mp3-worker.js — turns raw audio samples into mp3 bytes
   ------------------------------------------------------------
   this runs on its own thread, so a long clip can encode without
   freezing the page. the main thread decodes the clip (only it can
   do that) and hands the samples over; this sends mp3 bytes back.
   ============================================================ */

importScripts('https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js');

function toInt16(samples) {
    const out = new Int16Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
        const clamped = Math.max(-1, Math.min(1, samples[index]));
        out[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    return out;
}

self.onmessage = (event) => {
    const { left, right, sampleRate } = event.data;

    try {
        const channels = right ? 2 : 1;
        const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
        const leftSamples = toInt16(new Float32Array(left));
        const rightSamples = right ? toInt16(new Float32Array(right)) : null;

        const parts = [];
        let total = 0;
        const frame = 1152;   // one mp3 frame's worth of samples
        for (let offset = 0; offset < leftSamples.length; offset += frame) {
            const encoded = encoder.encodeBuffer(
                leftSamples.subarray(offset, offset + frame),
                rightSamples ? rightSamples.subarray(offset, offset + frame) : undefined
            );
            if (encoded.length) {
                parts.push(new Uint8Array(encoded));
                total += encoded.length;
            }
        }
        const tail = encoder.flush();
        if (tail.length) {
            parts.push(new Uint8Array(tail));
            total += tail.length;
        }

        const mp3 = new Uint8Array(total);
        let at = 0;
        parts.forEach((part) => {
            mp3.set(part, at);
            at += part.length;
        });

        self.postMessage({ ok: true, mp3: mp3.buffer }, [mp3.buffer]);
    } catch (error) {
        self.postMessage({ ok: false, message: String(error) });
    }
};
