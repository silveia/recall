// turns raw samples into mp3 bytes off the main thread; the page decodes, this encodes
importScripts('lame.min.js');

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
        const encoder = new lamejs.Mp3Encoder(right ? 2 : 1, sampleRate, 128);
        const leftSamples = toInt16(new Float32Array(left));
        const rightSamples = right ? toInt16(new Float32Array(right)) : null;
        const parts = [];
        const frame = 1152;   // one mp3 frame's worth of samples
        for (let offset = 0; offset < leftSamples.length; offset += frame) {
            parts.push(encoder.encodeBuffer(
                leftSamples.subarray(offset, offset + frame),
                rightSamples ? rightSamples.subarray(offset, offset + frame) : undefined
            ));
        }
        parts.push(encoder.flush());

        const mp3 = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
        let at = 0;
        parts.forEach((part) => {
            mp3.set(part, at);
            at += part.length;
        });
        self.postMessage({ ok: true, mp3: mp3.buffer }, [mp3.buffer]);
    } catch (error) {
        self.postMessage({ ok: false, message: error && error.message ? error.message : String(error) });
    }
};
