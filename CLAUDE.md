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

Then open `http://localhost:8000`. Never open `index.html` by double-clicking
it. On `file://` two things break: screen capture is blocked, and Chrome
refuses to load `mp3-worker.js` at all ("cannot be accessed from origin
'null'"), so downloads fail with a worker error.

## Look and feel

- Strictly black and white. **No gray anywhere** — not for borders, disabled
  states, placeholders, or shadows. Use black, white, or an outline.
- Everything is white with a 1px black outline. Active and live states invert
  to solid black.
- Fonts: Amiko for body text, Bitcount Prop Double for the `h1`, the section
  tabs and any big number, Matrix Sans Print for every heading over a panel.
  Bitcount is never set bold — its letters are dots, and the bold weight fills
  the gaps between them. Matrix Sans is capitals only; lowercase copy comes out
  as capitals, which is the point.
- Copy is playful and lowercase. Tiles carry kaomoji faces.

The no-gray rule is why the clip players are hand-built instead of native
`<audio>` controls — those can't be recolored off gray.

## Notes into cards (the left bar)

The black left bar holds the study tool: notes in, a deck out. The panel
moves into a window when the bar is too narrow to type in — it *moves*,
so there is one panel and one set of state, never two to keep in step.

**One button: make flashcards**, and it works with nothing set up. It
takes whatever is in the panel —
prose, an essay, a transcript, a chapter, a photo of a handwritten page,
a slide, a PDF, or any mix — and comes back with cards. The material
never has to be laid out as pairs; reading it and deciding what is worth
a card is the model's job.

Every photo and every PDF gets a call of its own, and long text is cut
into pieces, because one call holding six photos gives each a sixth of
the attention. Results merge, deduped by question.

**Nothing needs an account.** With no key saved, the panel reads photos
with Tesseract and then writes the cards with a model that runs in this
browser — web-llm under `llm/`, driving Qwen2.5 1.5B on WebGPU. The
weights (~1.1GB) come down once from the MLC CDN and the browser keeps
them; after that it is instant and offline. Nothing typed or dropped
leaves the machine. The model is small, so the cards are plainer than
the API's — its answer is forced through the same JSON schema, so it
can only fill in questions and answers.

It runs in `llm-worker.js`, a module worker: the arithmetic is heavy
enough to stiffen the page if it ran on it. No WebGPU (older browser,
no adapter) falls back to the list reader and says so. A full browser
store throws `QuotaExceededError`, which is named plainly rather than
passed through.

**The OCR half.** Tesseract — an OCR engine
that runs in the browser, vendored under `ocr/` — reads the words off
the picture and puts them in the box, where they can be corrected; the
list reader then makes what it can of them. It is loaded the first time
a picture is read and never on a plain page load (~9.6MB). It reads
printed text well, handwriting poorly, and it cannot tell what matters
in a paragraph — that is the line the AI buys, and the panel says so
rather than leaving the reader guessing.

Behind a quieter second button, **read the list myself** turns a
glossary that is *already* in pairs into cards locally, with no key and
no network: `term — meaning`, `term: meaning`, `term = meaning`, a tab
between the two, `Q:`/`A:` pairs, and blank-line-separated blocks. With
no key saved that reader becomes the main button, since it is all that
can happen.

What the API call needs, and why:

- the user's own API key, kept in `localStorage` under `claude-api-key`
  and never in the repo. The ask button stays hidden until one is saved.
- the header `anthropic-dangerous-direct-browser-access: true` — without
  it the API refuses a call made from a browser.
- `output_config.format` with a JSON schema (`deck_name` + `cards`), so
  what comes back either parses or the call fails.
- `stream: true`, parsed as SSE, so a long deck can't run into a timeout
  and the card count can climb while it writes.
- `claude-opus-5` at the default effort. Card-writing is the part worth
  paying for; a cheap setting here, plus a brief that said "one card per
  idea", is what made it return one card for a whole page. The brief now
  says at length that the work is to cover the material, not sum it up.

Long text is cut at blank lines into ~6000-character pieces and sent a
piece at a time, merged by question so nothing repeats. Attachments are
never chunked — a document is read whole.

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
- A clip can be cropped, but nothing is ever cut: the crop is a
  `{ start, end }` pair stored on the record beside the whole blob.
  Playback, the duration shown and the mp3 export all read it, so
  dragging the marks back out undoes it.
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
- `lame.min.js` — the mp3 encoder itself (lamejs 1.2.1), vendored rather than
  loaded from a CDN so downloads work offline. Only the worker loads it.
- `matrix-sans-print.woff2` — the heading face (Matrix Sans Print by Brad Neil),
  vendored for the same reason. `style.css` loads it with `@font-face`.
- `matrix-sans-OFL.txt` — that font's licence. It travels with the font.
- `ocr/` — tesseract.js and its english data, for reading the words off a
  photo without a key. Vendored for the same reason as the rest. Nothing
  in here is fetched until a picture is actually read.
- `llm/` + `llm-worker.js` — web-llm, which runs the small model in the
  browser. Also lazy: nothing here loads until someone presses make
  flashcards without a key saved.

All of these need to be uploaded to GitHub Pages. Missing `mp3-worker.js` or
`lame.min.js` breaks downloads with a worker error that looks like a code bug;
missing the woff2 quietly drops every heading back to a monospace fallback.
