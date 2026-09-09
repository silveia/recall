# flahcard

A personal flashcard + audio site. Plain HTML/CSS/JS — no framework, no build
step. Lives on GitHub Pages.

## Working with me

I don't code. Apply edits directly to the files — don't hand me blocks of code
to paste, I won't paste them. Keep replies short and skip explanations of your
approach unless I ask.

If I describe something visual and it's ambiguous, ask instead of guessing.
Expect several rounds of small nudges on any spacing or sizing change; values
land by iteration, not on the first try.

## Testing

Must be served over http, not opened as a file:

    python3 -m http.server 8000

Then open `http://localhost:8000`. On `file://` the screen capture is blocked
and the audio section won't work at all.

## Look and feel

- Strictly black and white. **No gray anywhere** — not for borders, disabled
  states, placeholders, or shadows. Use black, white, or an outline.
- Everything is white with a 1px black outline. Active and live states invert
  to solid black.
- Fonts: Amiko for body text, Bitcount Prop Double for headings and the `h1`.
- Copy is playful and lowercase. Tiles carry kaomoji faces.

The no-gray rule is why the clip players are hand-built instead of native
`<audio>` controls — those can't be recolored off gray.

## The two sections

Switched by the `>` arrow next to the heading.

**cards** — the original flashcard app. Decks with drag-reorder, right-click
rename and delete, undo with Ctrl+Z, a create screen, and a practice screen
with four multiple-choice answers mapped to keyboard quadrants.

**audio** — a Chrome tab recorder that splits clips by speaker. This is the
part under active work.

## How the audio section works

Records a Chrome tab with `getDisplayMedia`. Tab audio only comes through if
the user ticks **"Also share tab audio"** in the share dialog.

A hidden canvas samples a small region of the video 16 times a second,
downscaled to 48x48, and diffs consecutive frames. That region sits over the
speaker's username on a call site — when the name changes, the speaker changed,
so the recorder stops and immediately starts a new one. Each clip is one
person's turn.

- Clips under 2 seconds are discarded, which filters out interruptions.
- Clips persist in IndexedDB until discarded.
- Only the audio track goes into a clip; the video track stays live purely for
  the pixel sampling.
- Region defaults: left 4%, bottom 4%, width 25%, height 4%, threshold 2. The
  low threshold matters — a short username in a wide box dilutes the change
  score.
- Download re-encodes to a real mp3 via lamejs in `mp3-worker.js`, off the main
  thread so the page doesn't freeze. Decoding stays on the main thread because
  a worker has no `AudioContext`.

## Known limits — accepted, don't re-raise

- A speaker's interrupted turns can't be stitched back together.
- WebM seeking is approximate; there's no seek index.
- Chrome focuses the captured tab once when recording starts, and that can't be
  prevented.

## Files

- `index.html` — all three screens
- `style.css` — numbered sections, see the table of contents at the top
- `script.js` — numbered sections, see the table of contents at the top
- `mp3-worker.js` — mp3 encoding, kept off the main thread
