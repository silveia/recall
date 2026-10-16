# flahcard

A personal flashcard + audio site. Plain HTML/CSS/JS — no framework, no build
step. Lives on GitHub Pages.

## Working with me

I don't code. Apply edits directly to the files — don't hand me blocks of code
to paste, I won't paste them. Keep replies short and skip explanations of your
approach unless I ask.

Don't rewrite the sentences in the function box. Add to them when there's
something new, but leave the wording I wrote alone.

Never ask me questions — I'm almost always away from the keyboard. If something visual is
ambiguous, make the likeliest reading, build it, and say in one line what you assumed.
Expect several rounds of small nudges on any spacing or sizing change; values
land by iteration, not on the first try.

## Testing

Must be served over http, not opened as a file:

    python3 -m http.server 8000

Then open `http://localhost:8000/home` — the root is a page of its own and
is blank. Never open the html by double-clicking it. On `file://` two things break: screen capture is blocked, and Chrome
refuses to load `mp3-worker.js` at all ("cannot be accessed from origin
'null'"), so downloads fail with a worker error.

## Look and feel

- Strictly black and white. **No gray anywhere** — not for borders, disabled
  states, placeholders, or shadows. Use black, white, or an outline.
- Everything is white with a 1px black outline. Active and live states invert
  to solid black.
- Fonts: Amiko for body text, Bitcount Prop Double for the `h1` and the section
  tabs, **VT323 for every number**, Pixelify Sans for every heading over a
  panel (from Google Fonts, the same face as the drawing app; it replaced Matrix
  Sans Print entirely, by request — that font and its files are gone). Bitcount fills the gaps between its dots at bold, so it is set bold in
  exactly one place — the section tabs, by request — and nowhere else.

  **Numbers never get Bitcount.** It draws a `1` as two dense columns of dots
  and a `0` as an open ring — 60 units wide against 50 — so any figure with a
  zero in it reads as two different fonts side by side, at every size. VT323 is
  the same kind of screen face and its digits are all one weight and one width,
  so columns of figures line up. It is `--num-font`, and it draws lighter and
  smaller than Bitcount: everything that moved over went up by about a quarter.
- Copy is playful and lowercase. Tiles carry kaomoji faces.

The no-gray rule is why the clip players are hand-built instead of native
`<audio>` controls — those can't be recolored off gray.

## Notes into cards (the cards page)

The study tool sits on the cards page, **under** the deck it writes
into, with a grip between them — so it is the far pane and `wireSplit`
takes `fromRight` as well as `down`. It used to live in the black left
bar, which is now empty. The panel moves into a window when there is
more to read than the column holds — it *moves*, so there is one panel
and one set of state, never two to keep in step. `#notesHome` is the
slot it returns to.

**One button: make flashcards**, and it works with nothing set up. **While it works, the button says what is happening and nothing is written under the box**: `making flashcards...` (with the count as cards arrive), and while the in-browser reader is downloading it turns white with `312 mb / 1.1 gb` on it and a black bar filling along its foot (`goSay`, `goSayLocal`). **Nothing is written under the buttons at all** (`.notes-note` and the `read the list myself` link are hidden, by request): an empty box shakes the box, a failure shakes the button. **`sharper reading` sits straight under `make flashcards`** as the same pill in white. It
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

The download starts on intent rather than on the press — a photo
attached, the panel opened wide, or 200 characters typed — so by the
time anyone presses the button it is usually already there. Nothing is
fetched on a plain visit, or ever when a key is saved. If the button is
pressed while it is still coming, whatever is already written as a pair
goes up immediately and the model's cards replace them.

Only ever load `LOCAL_MODEL`. Loading a second model stacks another
copy in the browser's store and hits `QuotaExceededError` around 3GB —
that is what the "don't stack up downloads" rule protects against.
Qwen2.5 0.5B was measured as the smaller alternative and is not usable:
it copies whole sentences as answers, and once returned a line of the
brief itself as a card.

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

## The sections

Switched by the tabs in the top strip. The cards and audio pages are **named** `card` and `clip` (by request) — their sliding names and search say so — while their ids, folders and links stay `cards` and `audio`.

**cards** — the original flashcard app. The share window has `this code` / `copy` on top and `paste code` / `load` under it (swapped, by request), the two pills 3.8rem wide. Its two code boxes are exactly the height of `copy` / `load` beside them, can't be resized, and scroll on a 1px line (by request). **Never set `scrollbar-width` where a `::-webkit-scrollbar` is drawn**: chrome then ignores the drawing and shows its own 'thin', which is far wider. And give the track a vertical `margin` in a rounded box, or the bar runs out over the corners. **There is one scrollbar for the whole site**, set once at the top of the stylesheet (`::-webkit-scrollbar`): a 1px ink line — exactly the boxes' outline — held 4px in off the edge (a 6px scrollbar whose thumb has transparent side borders and `background-clip: padding-box`), its track kept 8px clear of the rounded corners. Boxes that hide their bar still do so with their own rules. In create, the `+` on the answer opens a small white window (`#optionsPanel`, `select other answer options for this question`) under the answer field, its right edge on the field's and one `--tight` below it. A small spaced-out capitals label sits right over the `new deck` field, as a bit of motivation: `WE LOVE STUDYING !!!`. Decks with drag-reorder, right-click
rename and delete, undo with Ctrl+Z (and redo with Ctrl+Shift+Z or Ctrl+Y), a create screen, and a practice screen
with four multiple-choice answers mapped to keyboard quadrants. **Create and practice are big windows** (82% of the window each way, up to 76rem wide — by request, still windows rather than full screen): create's card list fills what is left and scrolls; practice's question takes about two fifths of the height and the four answers the rest.

**audio** — a Chrome tab recorder that splits clips by speaker. There is no separate record button: the long box across the top is it — black with `record` in the middle; **round at both ends, and on hover its letters float — freely, slowly (5–7s a round) and steadily, each on its own drift, tilt and clock set in app.html — from the moment the pointer arrives, while they draw a little apart (the parting is `translate`, the float `transform`), and on leaving each glides back from wherever it is** (`.floaty`, script.js; by request, in place of fading to white — an even sway was too neat, waiting for the parting before floating too stiff, and a snap home too abrupt; kept for the big one-of-a-kind buttons like this); while recording it is the live meter, and a press on it stops. This is the
part under active work.

**chat** — sealed messages between people who add each other.

The page marks down the bar run home, card, clip, draw, chat — chat last, by request.

**draw is built into the page now (14 Oct, by request — this replaces the framing described below).** It
was framed, a page of its own inside the page, with its own stylesheet, fonts, lights (sent by message),
its own report of what to cut out of the colour layer, and a different entrance — which is why it always
looked a little off. Now its toolbar, sheet and two little windows are ordinary markup in `#drawPanel`, its
rules are one section at the foot of `style.css` (every one scoped to `.draw-panel`, in the site's own
tokens and fills), and its code is **`draw.js`** — the old game.js, script.js and the menus script, whole,
inside one function (`window.startDrawing`, run the first time the page is shown, so none of its names can
meet the site's). Its keys only work on the draw page (`drawHere`), and the site's ctrl/cmd shortcuts stand
aside there. Its little windows, sprites and fish are placed inside the page, not the whole window. Its
holes are `window.drawHoles()`, read straight by `tintHoles`. Its loop for sprites and fish only runs while
there is something to move. **Anything the site floats over the sheet or a chat picture** (the strip's lists, the search's results, a
window, the confirm chip) puts the layer back where it covers it (square-cut), **for as long as it is on
screen at all** — judged by its visibility and opacity, not by whether it is open: a list fades for a moment
after it shuts, and that moment over a hole was the black flash on every close. **No holes are
cut while a refresh holds the page back** (`booting`): the shell is see-through then, and the sheet's hole
showed the black behind it — the black flash on refresh; they are cut the moment the page comes in. `drawing/` now holds only its pictures; `pages.sh` fingerprints `draw.js`.

**draw** — the drawing app from `silveia.github.io/drawing-app`, brought in by
request under a pen mark. It lives in `drawing/` with its own html, script and
styles, and the section frames it (`#drawFrame`) — framed, its keys (space to
pan, ctrl+z, wasd for the game, t for fish, shift to stamp) stay its own and
cannot fight the site's. Its functions are unchanged; its look is the site's —
black and white, 1px outlines, pills, solid black when pressed — while the
canvas, the game and the stamps keep their colours, since they are the content.
The frame is **only loaded the first time the page is shown** (`data-src`):
loaded hidden, its canvas measured as nothing and kept that size. It follows
the lights the way the dino run does. `game.js` never declared
`visualHitboxEl`, so starting the game threw; it is declared now. The tool is one bare mark (by request, replacing a dropdown): the pen or the eraser, and a press
swaps them at once with a spin over it — one quick turn, easing out — clockwise to the eraser, anticlockwise back to the pen (`#toolSwap`; swapping the face
part way through the turn read as the swap lagging). The colour picker is the site's own menu (`.pick`); the real
`<select>` and colour field, which stay underneath for `script.js`; the colour opens a real
adjuster, laid exactly on the canvas's top-left corner (by request) (by request — swatches were refused): a square for shade and brightness, a rainbow strip
for hue, and the hex code to type; the rings riding them are white with a black edge so they show on
any colour. The toolbar
reads, left to right: the colour (just its dot, no outline or arrow, sitting in the toolbar's round end exactly 12px off
the outline to the left, above and below — measured; `clear` sits the same way in the right end, 8px off
the outline on its three sides), the pen/eraser mark, the size, then undo
and redo as bare marks — all by request; it has no word labels. Spawning with
no sprite drops a small chip under the button pointing at `upload sprite`, instead of an
alert. Coins land with their middle 60px inside the fence, so every one can be reached.
**Fixed 14 Oct:** undo and redo put a snapshot back at its own size (stretched over a sheet that had grown, it blurred); the drawing is now **kept in this browser** (`mySavedArt`, written 600ms after a change — it was read on load but never written); a pen's tip draws with the toolbar's tool, the eraser included; held shift stamps once, not once per key repeat; ctrl+shift+z is redo; nothing on the canvas or in the game answers keys typed in the colour code; keys held when the frame loses focus are let go; `clear` caps undo and empties redo; shutting `yams` stops its loop (`stopCustomGame`), and opening it again carries on (`resumeCustomGame`); the coins' gif is no longer re-fetched every 45 frames. The game window is called `yams` and has no full-screen button. Both little windows have a black head bar with white words and marks, and **cannot be dragged off the page** (`keepInside`): dragging, coming back from storage, opening, and the page shrinking all hold them inside its edges. **The sheet is pixel art** (by request): the canvas holds one pixel per art pixel
(`PIXEL` = 1 screen pixel across — the sheet doubled again by request; 8 was far too blocky, then 2) and is shown big with `image-rendering: pixelated`.
The brush paints whole art pixels — a round block `size` across, each row one
`fillRect`, gaps between pointer events filled in with a line walk — so nothing is
ever blended. A stroke takes **every pointer position the browser recorded** (`getCoalescedEvents`),
not one a frame, and runs through them as a smooth curve through the midpoints — a quick round stroke
used to break into straight pieces. Sizes count art pixels (1–64), and the readout beside the size pill
(`5px`) is exactly the brush's width in them. Stamps land hard-edged too. The size
is a slider with `−` and `+` at its two ends and no outline round them (by request) (by request — a fill-up pill and a
stepper were both tried): a hairline with a solid round thumb — the stretch behind the thumb 3px, bolder than the 1px ahead, by request — dragged or pressed anywhere; held,
the marks keep stepping; the wheel and arrow keys nudge it. The `#px` count sits beside the pill. Menu rows show an outline on hover, never gray.
The colour adjuster **grows out of the colour dot** as a widening circle (460ms) while the square,
the hue strip and the code slide in one after another, and shrinks back into the dot to close (300ms).
Other menus unroll down out of their button (a clip revealing them top to bottom, 240ms) and roll
back up quicker (170ms); nothing is scaled — a spring with a scale and staggered rows made the
1px outline and the words shimmer, which read as a glitch. Either turns round mid-way. Every button's hover fades over 0.2s. The two round marks in the canvas's corner wiggle on hover, exactly as the face under create and practice does (by request — a whole spin was not it).

The **player** section (songs off your own disk) was deleted by request:
its tab, page, folder, script, styles and the bar's mini player are all
gone. Songs binned before that are skipped if put back.

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
- Region defaults: left 4%, bottom 4%, width 25%, height 4%, threshold 1. The
  low threshold matters — a short username in a wide box dilutes the change
  score.
- The sliders show their numbers **rounded**. Dragging the box itself
  writes wherever the pointer was, which is a fraction of a percent with
  a tail of decimals on it; the number kept is the exact one, since
  nudging the box a hair must not move it, but nobody is reading the
  sixth decimal place of 4.0833333333333%.
- The preview zooms (100–500%) so the box can be placed precisely without
  zooming the whole site. The picture and the box ride on one stage that
  scales together; the wrap around it scrolls, and dragging the picture
  pushes it about. The zoom is its own setting on its own key
  (`sense-zoom`) — it survives a refresh and only the reader's hand
  changes it, since it is about seeing, not about what gets sampled.
  It **travels rather than arriving**: a wheel notch was a jump of a
  tenth, and a jump is the one thing a picture you are aiming at
  shouldn't do. The point being held still is worked out once, when the
  gesture starts, and the scroll is written from it on every frame, so
  the picture grows around the cursor the whole way; taken again
  mid-flight it would be read off a half-grown picture and the anchor
  would wander. Notches add off where the zoom is *heading*, so they add
  up instead of fighting the glide already running. The slider's own
  thumb is left alone while it is the thing being dragged.
- Download re-encodes to a real mp3 via lamejs in `mp3-worker.js`, off the main
  thread so the page doesn't freeze. Decoding stays on the main thread because
  a worker has no `AudioContext`.

## The playlist box (beside the clips)

**It reads `playlist` on the page**; everything in the code still says
`scratch` — `SCRATCH_WAYS`, `.scratch-song`, `saySc()`, `scratchSongs`.
One is what it is called, the other is what it is named, and renaming
forty identifiers to match buys nothing.

The audio page's clip list has a box to its right, sized by the grip
between them. It takes a Spotify link — playlist, album or track, in
any of the forms Spotify hands out — and lists every song in the
playlist's own order, each row a button that copies `title — artist`.
`copy all` takes the lot.

**Spotify will not let a page read its site**, and there is no server
here to ask on its behalf, so the page has to come through something
else. `SCRATCH_WAYS` holds two *kinds* of source, tried in turn, and
the second kind exists because the first is unreliable:

- **CORS relays** hand back Spotify's own HTML; `songsFromPage` reads
  the songs out of the JSON inside it. Best fidelity, worst uptime.
- **`r.jina.ai`** hands back the page *already read*, as plain text;
  `songsFromReading` reads the songs off the numbered list (strip the
  lone `E`, it's the explicit badge, and the artists come back run
  together on the commas). Slower, less exact, far more dependable.

Free relays come and go **within hours**. Of the four that answered on
first write, three had stopped by the same evening: `cors.eu.org` and
`api.cors.lol` began refusing the origin, `allorigins` timed out, and
`corsproxy.io` now demands an API key. Only `proxy.corsfix.com` was
still up — and its free tier is origin-restricted, so it may work from
localhost and not from GitHub Pages. **Do not build this on relays
alone again.** If the box stops listing songs, the reader path is the
one that should still be working; check it before touching anything
else.

Nothing of the user's goes through any of them — the playlist link is
public, and no Spotify account is involved at any point.

The arrow that reads the link sits inside the field, the same move the
notes box makes with its picture button. The box's side padding is a
`--group` rather than a `--tight` — every row in it is full width, and
against a rounded outline a row starting eight pixels in reads as
touching it. `--skin`'s ramp divisor in `wireSplit` is twice that
padding plus the outline, so it must change if the padding does.

On the relay path, the tracklist is parsed out of the embed page's
`__NEXT_DATA__` blob.
Spotify has reshaped that blob before, so `songsIn()` does **not** walk
a path into it — it searches the whole thing for the longest array of
objects that look like songs. Leave it that way; a rename in the middle
of their JSON then costs nothing.

## Every playlist you bring in is kept

One import per playlist, and then never again. Each one is kept under
its own name (`scratch-lists`, newest first, one entry per name — the
same playlist again is a longer version of it, not a second copy), and
the window lists them all. Pressing one **swaps the songs on the spot**:
nothing is fetched, nothing is signed into, and the exporter is only
wanted the first time a playlist comes in. The name comes off the file's
own name, without its extension and with the underscores opened out.

**`copy all` and `match clips` are outlined, not solid** (by request: they stood out too much), and spring up a little on hover as create and practice do.

**Exportify itself runs in the window.** Measured with `curl -I`: it
sends no `x-frame-options` and no `frame-ancestors`, so it can be
framed. `accounts.spotify.com` sends `x-frame-options: deny`, so the
**sign-in cannot be** — that once happens in a tab of its own, and
afterwards the frame knows you.

**The frame is not allowed to wander.** Press the wrong thing in there
and it used to go off to Spotify or to a dead link, with no way back
short of reloading the page — a page cannot ask a frame it does not own
where it went. So it is stopped from going: a `<meta>` CSP naming
`frame-src 'self' https://exportify.net` refuses any navigation out of
exportify and the frame stays where it is. Only `frame-src` is named, so
nothing else on the page is under a policy it wasn't under before.
Measured with `securitypolicyviolation`: same origin loads, another
origin is refused.

**Reloading on every refusal is a loop, not a fix.** What the frame is
usually trying to reach is spotify's sign-in, and that page is
mid-login, so it bounces straight out again — three goes later the
frame was dead anyway and nothing on screen said why. That is the grey
square with a torn-page icon in it.

Spotify's sign-in **refuses to be framed at all** (`x-frame-options:
deny`), so there is nothing in here that can fix it. A line goes up on
the first refusal saying so and offering a tab; sign in there and come
back, and the frame shares the cookies and knows you. The line lies
over their page, so pressing it puts it away. The frame is still put
back, up to three times, so it usually recovers as well as explaining.

**A refused navigation leaves a dead frame, so it is put back.** The
policy stops the frame wandering off, which is what it is for — but a
refusal is not a no-op: chrome abandons the page that was there and
draws its own blocked-content square, and a page cannot reach into a
frame it does not own to undo that. So the refusal is listened for
instead: the browser reports it to whichever document set the policy,
which is ours, and the frame is sent back to exportify. Capped at
three goes, or a site that bounced straight out again would be
reloaded forever.

**A page cannot reach inside a frame it does not own.** So the layout,
the type and the colours in there are not ours to set — only scale is.
A `grayscale(1)` filter was tried and taken off again: it looks better
with its colour.

**Their page is always given `--site-wide` (1100px) and nothing else.**
Scaling a *share* of the pane handed them a narrower viewport on a
smaller screen, and a responsive layout answers a narrow viewport by
drawing everything bigger — which was the "zoomed in on a small screen"
of it. What changes with the window is only how far down that fixed
1100px is drawn to fit, which `fitSite()` works out on open and on
resize. Measured at 1400 / 1050 / 820px windows: their viewport stays
1100px at all three.

The site takes the window; a line of copy, the steps and the kept
playlists sit in a column beside it, starting at the top.

**The frame is cropped on the left, and on the right only by the
scrollbar.** `--site-clip` (24px) comes off the left to take their own
margin off; the right is over by `--site-bar` alone, which carries their
scrollbar out past the pane where the `overflow: hidden` eats it. Taking
the same slice off both edges ate the export button, which lives against
their right-hand wall. Their page still
scrolls on the wheel; the bar is simply not in sight. None of this
reaches inside the frame — it is all the frame's own geometry, which is
the only handle a page has on one it does not own.

Measured: 678px of pane, 24px cropped left, 16px right, and **997 css
pixels** handed to their layout — a desktop width, with nothing for it
to scroll sideways for.

**A turning smiley holds the pane while it starts**, and the site fades
in over it on its `load`. It is **drawn, not typed**: as a glyph it was
whatever the body face made of it, and a glyph does not sit in the
middle of its own box — it has side bearings and stands on a baseline,
so turning the box turned the face around a point that wasn't its
middle and it wobbled. Drawn, the circle is centred by construction and
the turn is true. The ring is `non-scaling-stroke` at 1, the same hair
as every outline here; the mouth is 1.7 and the eyes are round and
set wide, which is where they landed after being held against the ☺ it
copies.

It turns **once and then waits** — 360° over the first 62% of 1.5s on an
ease, then a beat — rather than going round and round at one speed. Blank white for a second and a half reads as broken
rather than as loading. After eight seconds it is shown either way:
dots spinning forever say less than an empty page does. The step's
circle is centred on its **first line**, not on the block — centred on
the block it drifted down the side of a step that wrapped. Measured:
0.16px off the first line's middle at `margin-top: 0.03rem`.

**The finder is shared.** One window lists what this page can read out
of a folder — `.call` bundles for the clips, `.csv` exports for the
playlists — with `bundleKind` saying which it is looking for this time.
Closing the picker means no: it used to fall through to the browser's
own file window, so shutting one opened another straight after it.

Its export still arrives as a file — but it need not be carried by
hand. **`bring exports in by itself` hands the page the folder the
download lands in**, and then it simply looks: every 1.5s while the
window is open, for a `.csv` written since the looking started. What
exportify drops is picked up where it falls and the songs are in the box
a moment later.

A page cannot read inside a frame it does not own or catch what that
frame downloads — but it can be given the folder, which is the way round
it. **And the file is taken off the disk once it is in.** The songs are in
the box and kept under their name, so the export has done its job;
leaving it in downloads to be wondered about later is worse than
removing it. That is why the grant is `readwrite` rather than `read` —
and if the removal is refused, the songs are in either way and the chip
simply doesn't claim it tidied up.

Only `.csv`, only newer than the watch, only while the window is
open, and each file taken once (`name@lastModified`). Pressing the line
again stops it. The browser forgets the grant between visits, so on a
later visit it is offered rather than resumed. The
frame is loaded 380ms after the window opens — starting somebody else's
whole site in the same breath as the window's arrival made that arrival
stutter. **Not `requestIdleCallback`**: a busy page may never go idle,
and it never fired at all in testing.

This is what was asked for instead of the live Spotify picker, and why:
**the sign-in worked and the reading did not.** Spotify answered 403 —
a fine key, and it is not allowed this — and three rounds went into that
before the whole flow was taken out on 21 Sep. Spotify's own editorial
playlists are permanently out of reach for an app whose owner doesn't
pay; a reader's own playlists may not be, but that path has already cost
three rounds and cannot be tested from here.

**`closeModal()` hid every window but this one.** It was written before
`listScreen` existed and never grew the line — so the playlist window
was only ever hidden by the next window opening over it. Both now work
off one list read from the page (`WINDOWS`, every `.modal-panel` in the
veil), so a new window needs nothing adding anywhere.

## A folder without asking for one

**A page cannot make a folder on the disk.** The only door is the folder
picker, and that door is a permission prompt about Downloads or the
Desktop for someone who only wanted a folder of their own songs. There
is no API for "make a folder in Downloads"; the picker *is* the consent.

So the ordinary way out is a **zip**: everything into one file, which is
an ordinary download — nothing asked, nothing granted, no picker. Double
-clicked it becomes a folder named after the zip, which is the folder
that was wanted in the first place. Type a name, press once, and
`Danganronpa.zip` lands in downloads.

Stored, not deflated — these are mp3s and already packed, so squeezing
them again costs seconds and saves nothing. The name goes in as utf-8
with the flag that says so, or anything but ascii comes out as mojibake
on the other side. Verified by unzipping what it writes: three entries,
right names, right sizes, every CRC good, and `unzip -t` clean.

The folder picker is still there, folded away under *or write them
straight to a folder*, for when writing onto the disk is actually
wanted.

## Every clip into a folder

`download every clip` writes the mp3s straight into a folder — not
sixty-four downloads one after another, and not a zip nobody asked to
unpack.

**The asking is a window of this site's own**: a name, a strip of
places, and a press. `where to` opens on the download button; the press
inside it is what opens the picker, since a browser only opens one off a
press.

**`startIn` is the whole of what a page may say about where on the disk
it means.** The bubbles set it — `downloads`, `desktop`, `documents` —
and it opens the picker on that shelf. The yes itself is the browser's
to take, and only once per place.

**The folder is made, not chosen.** You hand over the shelf; the page
calls `getDirectoryHandle(name, { create: true })` and makes the named
folder inside it. That is not obvious from a name box and a row of
places, so the window says it in words: *makes a folder called
Danganronpa in your desktop*.

**The place is remembered per place.** Under one key, picking
`downloads` and later switching the bubble to `desktop` went on using
downloads — the bubble looked like it did nothing.

**A page cannot make a folder anywhere it likes, and cannot be told one
by name — it has to be handed one.** So it is handed one *once*: the
first download opens the picker, that place is remembered
(`folderHome()`, the handle itself in its own tiny IndexedDB — a path is
a string a page has no right to open), and every download after that
makes its own folder inside it from whatever is typed in the box at the
top of the clips. Nothing is asked again unless the browser has
forgotten the permission, which it does between visits — one press to
say yes, and `stillAllowed()` only asks when it has to.

The folder is settled **before anything is read**: a picker and a
permission prompt only open while the press is still a press, and
reading the clips takes longer than that. Picking the folder *is* the
asking, so the confirm is skipped on that path; it is only the downloads
that have to be agreed to first, because sixty-four files arriving one
after another is not something anyone should meet by surprise.

`tidyFolder()` takes the slashes, colons and leading dots out of what
was typed, since a folder name can't hold them. The field centres its
name: a short one left-aligned in a full-width box reads as something
forgotten in the corner of it. Nothing typed at all
means straight into the place itself.

**The whole row turns over while it is packing, marks and all.** The
grip, the play mark, the crop, the arrow and the cross each name
`--ink` themselves rather than inheriting it, so the row going black
left them black on black — buttons you could only find by remembering
where they were.

**A folder is sorted by name, so the name has to carry the order.** The
files go in bottom-first — which is the order they were recorded, and
the order the numbers down the list read — but Finder shows a folder
alphabetically all the same, so `01 `, `02 ` at the front is what makes
the two agree. Padded, so 2 sorts before 10. The tag inside carries the
same number (`TRCK`), so a music player plays them in order too, and the
title and artist in the tag stay clean either way. Verified on twelve
clips: written 01–12 bottom-first, and sorting those names gives the
same list back.

Two clips can carry the same name — the same song twice on a playlist,
or two turns of one speaker — and a folder holds one of each, so
`freeName()` numbers the second `name (2).mp3` rather than writing it
over the first. Downloads keep the 400ms breath between them, because
Chrome drops a burst; writing into a folder is not a download and needs
none. A browser without the picker falls back to the downloads
unchanged.

## Carrying the clips to another address

**The browser's store belongs to one address.** Clips recorded with the
page opened as a file (`file://`) are not there at `localhost:8000`, and
neither lot is there on the site — the page is identical, the store is
not, and nothing on screen says so until the list comes up empty. This
has already cost one set of 64 recordings, which is why the two quiet
lines under the clip list exist: every clip out as one file, and that
file back in anywhere else. They are wanted once in a blue moon, so they
sit under the list they act on rather than taking a place in the bar —
which is also why `.clip-column` wraps the list now, and why the grip
sizes *that* rather than `#recordingList`.

The recordings are copied **byte for byte** — not re-encoded, not
decoded, not even read into memory, only pointed at — so this works
where the mp3 export cannot, which is exactly the corner it is for (on
`file://` the mp3 worker won't load at all).

The file is named `.call` — macOS has no idea what that is (`mdls`
reports a `dyn.…` type), which is the point: nothing else claims it and
nothing tries to open it. **The mark inside is `RECALLCLIPS1` and does
not follow the extension.** What is read is the mark, never the name, so
the `.recall` bundles already saved still come in, and a file renamed to
anything at all still comes in.

The file is a short header and then the recordings end to end:

    RECALLCLIPS1\n
    <how many bytes of header>\n
    <the header, as json: everything but the sound>
    <clip><clip><clip>...

**The picker is ours.** The browser's own file window is somebody
else's furniture and shows every kind of thing on the disk; given a
folder, this page can list what it can actually read — the `.call`
bundles, newest first, with their sizes — in a window of its own, and
one press brings one in. `look somewhere else` points it at a different
folder. Where the browser won't hand over a folder at all, it falls back
to the browser's own window.

Coming back in, each recording is a `slice` of the file on disk, which
the browser keeps as a file until something asks for the bytes — so a
200MB bundle never becomes 200MB of memory. A clip whose id is already
in the list is skipped rather than written over, so the same file can be
brought in twice without doubling anything.

**The asking is the site's own, not the system's.** The save picker
brought up Chrome's own window — its typeface, its wording, and a
warning about editing files. That warning **cannot be reworded from
here**, and shouldn't be: a page rewording a permission prompt is the
whole trick the prompt exists to stop. So there is no picker on this
path. The confirm chip asks, and the file goes to downloads like
anything else that leaves the page.

The folder picker for the mp3s is a different matter and stays — that
one buys a folder to write sixty-four files into, which nothing else
can do.

Verified end to end: three clips out and back with their exact byte
counts, first and last bytes, types, names (`؁` and all), crops and
durations intact; a second import adding nothing; and a file that isn't
a bundle being turned away rather than half-read.

## Aiming the sensing box is a window, not the page

Pressing the gear used to hide the clip list, the playlist box and the
grip between them and give the whole page over to a picture **three and
a quarter rems tall** — the thing you were aiming, in a strip, in an
otherwise empty room. It is a window under the gear now: `position:
fixed`, `z-index: 60`, half the screen wide, the picture on top and the
sliders as their own block under it.

**A `fixed` popup must not sit under a transformed ancestor.** Inside
the panel it inherited one from the section's entrance animation, and
`fixed` then measures from that ancestor instead of the screen — its own
`left/top` said 8px and its rect said 328px, off by exactly the page's
own corner. It lives beside the other pop panels at the top of `<body>`
now, which is why they all do.

And because it lives outside every panel, **hiding the page does not
take it with it** — `showSection` closes it by hand when the audio page
is left. Escape closes it too.

**It sits dead centre of the screen, and nowhere else.** Hung off the
gear it landed wherever the gear happened to be that day — a different
place at every window width, which reads as random. `top/left: 50%` and
a translate do it in the stylesheet, so there is nothing to recompute on
a resize and no frame where it is in the wrong place. Measured: 330px of
air either side, 328px above and below.

## The picture zooms like a picture

Two fingers **push it about**; a pinch **zooms**. It used to zoom on any
wheel at all, a fixed eighth per event — and a trackpad sends a burst of
events for one flick, so a nudge meant to shift the picture an inch threw
the zoom from 100 to 300. A pinch arrives as a wheel with `ctrlKey`
held, which is the only thing that tells the two apart; option or
command does the same for a mouse.

The step is taken from the size of the delta rather than fixed, so a
pinch moves it as far as the fingers did — capped to 0.85–1.18 per
event, since one notch of a mouse wheel arrives as a hundred at once.
Measured: a twelve-event pinch opens 100% → 205%, and one ctrl-notch of
a mouse moves 100% → 118% instead of leaping.

At full frame a two-finger scroll is left alone, so it scrolls whatever
is under it rather than swallowing the gesture.

## Clips laid against a playlist

The clips are recorded while the playlist plays, so the two lists are
the same list twice. **`match the clips`** in the scratch box walks them
together: the bottom clip is song 1, and each one above it is the next.
What tells them apart is length — a clip is the song it is as long as,
to within **one second**, measured on the *cropped* length, so trimming
can bring one into line.

The walk only ever goes forwards, and no further than **twelve songs
ahead** — without a limit, a stray clip that happened to be the length
of something near the end leapt there and took half the playlist with
it. Within that reach it takes the **closest** in length, not the first
that fits: two songs a second apart both answer a clip between them, and
the earlier one is not the better answer. A clip that answers nothing in
reach is marked `!` and the playlist **stays where it is**, so one stray
recording can't throw everything above it out of step; a song nobody
recorded is stepped over on the way to the next one that fits.

**A skip costs something.** Among the songs that fit, one further along
than the walk has reached is paid for at `MATCH_STEP` (0.6s of fit) per
song stepped over, so a song half a second better answered four along
doesn't pull the whole walk with it. And a skip is looked at twice: if
the clip above would then find nothing, and would have found something
had this one stayed put, the skip is declined and *this* clip is the one
marked. That is one lookahead, not a search.

**Then a second look for the ones left over.** A clip that fits nothing
on the way past is often a clip whose song was taken by something before
it — an advert, a false start, a turn recorded twice. It is allowed
anywhere between the songs its neighbours took, so the order still
holds, and only where nobody else has claimed it.

Between them these are what "the ones with the right timing are marked
too" was: one clip that wasn't a song at all took whatever it happened
to be the length of further down the playlist, and every clip above it
then looked for its own song behind where the walk had already got to.

**The `!` says why**, in its `title` — hold option over it. Either
nothing came within a second (and by how much the nearest missed), or
the only song it fits is out of its turn.

**A clip that already has a name is asked about it.** `titleAgrees()`
strips the `(feat. …)`, the `- remastered 2011` and the punctuation off
both names and compares what is left as a bag of words, at 60% overlap.
Where the name answers something in reach, only the songs it agrees with
are considered, and the length is allowed two seconds instead of one.
Where it agrees with *nothing* in reach it is ignored entirely — a name
you typed yourself agrees with nothing, and a name that agrees with
nothing must never be allowed to veto everything. That guard is the
whole reason the check is safe to leave on.
Matched clips take `title؁artist` — but only clips still going by the
number they were given. A name you typed is yours.

Every row carries its number, counting up **from the bottom**, worked
out from the rows themselves rather than stored, so binning one in the
middle renumbers the rest.

**And the same answer read the other way.** After a match the song list
says both halves outright: a song a clip answered to wears the black on
its number, the way every live thing here does, and a song with nothing
recorded of it goes **dashed, with a ring at the end of its row** — the
same dashed outline a slot on the home board wears while it is only a
place something could go. Leaving those plain said it too, but only to
someone who already knew that plain meant anything. The chip counts them
(`… · 3 not here yet`). A song that is
in the playlist more than once is marked `×2` as the list is drawn,
before any matching: two clips will answer to the one name, and that is
worth being told rather than discovering in the file names. The mark
comes off the playlist alone, so it is there whether or not anything has
been recorded.

This needs the songs' lengths, which is why all three sources now carry
`ms`: `duration` in the embed blob, `duration_ms` off the Web API, and
the `03:22` under each name on the reader path. A playlist saved before
that was added has no lengths and the button says so rather than
matching everything to nothing.

## One bar, on the left, and everything in it

There were two: a black one down the left with nothing in it since the
notes tool moved out, and a white one down the right behind a column
of dots, holding the clock, the function box, what the storage is
costing, the player and what was last binned. Two bars to hold one
bar's worth of things.

It is all in the black one now, and the right bar and its dotted edge
are gone. The page gets that width back.

**The bar is black, so everything in it is drawn the other way round
— by swapping the two colour tokens for its subtree, not by restating
a colour on every box inside it.** `html:not(.inverted) .rail-left`
redefines `--paper`, `--ink`, `--line`, `--hover` and `--veil` to the
values `html.inverted` uses, and every rule in the stylesheet follows
on its own, including the ones that invert on hover — they were
written in terms of those same two names, so they come out right
without being touched.

Only while the page is light. In the dark the page is already this way
round and the bar is the same black as everything else, so an override
there would put it back to front.

The clock is the exception, and deliberately: it was the one filled
thing in a white bar, and it keeps that job by being filled the other
way — a white tile in a black column, on both sides of the swap.

**The bar is always 19rem.** Nothing re-arranges at any width — see "one
layout, shrunk to fit".

**The wave is one size, in three tokens.** `--wave-w`, `--wave-h` and
`--wave-out` in `:root` are the whole of it: the tile is drawn at
26×44 in its own viewBox and scaled to the first two, and everything
that has to line up with the wave is worked out from them — where the
carve and the outline sit, how far the strip reaches back under it,
how far the bar's boxes stay off it, and where the line under the
strip starts. Changing the size is changing those three numbers.
`--wave-out` is how far a crest reaches past `--rail`, which is
4/26ths of the width.

**The boxes have to clear the trough, not sit in it.** The scallop's
wave bites 13px back inside the bar's nominal edge, so a plain
`--rail-pad` on the right left them 0.6px off the bumps and reading as
touching them. The right padding is `--rail-pad + 13px`; the other
three stay as they are.

**The bar does not wait for the strip.** Over the page the strip is a
visible header — tabs on it, white page below — so a page starting
under it reads right. Over the bar it is black on black with no line
between them, so reserving its height left 52px of unbroken nothing
above the clock. The bar starts at the top of the window instead and
fills that space with the clock.

Running the strip the whole width was tried first and does not work:
the bar paints *under* it (z-index 2 against 4), so the clock was
simply hidden down to the strip's edge. The bar cannot be raised above
it either — the scallop that carves its edge sits between the two, and
the bar over that would paint the wave out. The strip keeps to the
page.

Two one-pixel things, both of the kind you see without being able to
name:

- **The line under the strip has to end exactly on the bump**, and
  there are two ways to get it wrong. Reaching back further than the
  bump it crosses it, and being white on a white page it shows there
  and nowhere else — a nick in the top corner. Starting past the whole
  scallop instead leaves a gap between the line and the wave, which
  shows in the dark where both are white. The strip's underside falls
  on a crest, so the x is `--rail + --wave-out`.
- **The dark outline sat *on* the bump's edge**, and a stroke is
  centred on its path, so half of it ate into the black and the shape
  came out a hair different with the lights off. The arc is nudged
  half a pixel out. Measured down a whole tile: the edge now matches
  between light and dark to within 1px at every row, against a
  consistent 1px before.

**And the outline does not fade on its own.** The swap is one picture
the compositor crosses over, and a half-second opacity transition
running underneath it is a second, slower swap of the one edge
everybody is looking at. Only the no-view-transition path fades it,
where it is the only thing moving.

Measured on all five pages at 1400px: the bar's first box and the
page's first box both at y=68.0 — **0.0px apart** — and the page
column starting at x=320.0 on every one. At 1400/1100/1000/820/700 no
page scrolls sideways.

## The home board

**The search bar lives in the top strip now**, at its left beside `hi`, on every page (`#pageSearch`, a pill with
a magnifier, 34px tall and 34rem wide there, at the left, 64px off `hi`'s letters (centring it between hi and the bin was tried and put back), its words 0.88rem, and its go a bare `>` with no circle, by request — placed without a transform (a press's boing wrote over the centring translate and the arrow dropped), nudging 2px right on hover and doing nothing on a press; its results **slide down out of the bar** and back up into it (`showFound()`, a script animation of the box's clip — 260ms down, 190ms up — so it plays every time and turns round from wherever it is; the bar keeps its open corners until the box is back up); they have no page mark in front of the name and a plain flush highlight on the word (no padding, no rounding), and speak at the bar's own size (names 0.88rem, the line they were found in 0.8rem, the count in VT323) with menu-tight rows; it was across the top of home). The strip rises over the page while its results are open. It searches every page: a page answers to its name and to
any words on it — its text, placeholders, titles, button labels and its
`function` note (`pageWords()`, walked live from `PAGE_ROOTS`, so a new
page only needs adding there). One result per page, most matches first:
the name, the first place the word appears with it marked, and a count.
A round black go button with a white arrow sits at the bar's far right. Pressing a result (or Enter, or the go button, for the first) switches to that page and outlines
where the word is for a moment if it is on show.

**Under the board (14 Oct, my own pass):** the empty half of home is two boxes on the board's own columns
— **notes** under the first three (a ruled pad, kept in this browser under `home-jot` as it is typed, its
word count in VT323 in the corner; it was called `jot`, renamed by request) and **flip** under the last two
(replacing a list of the pages, by request): a card from your decks, the question on white; a press turns
it over like a real card (`rotateY`, on the `--spring`) to the answer in black; the arrow deals another
(turning it back first, so the next answer is never seen), with the deck it came from beside it. It keeps
its card until that card is gone (`paintFlip`, redrawn with the tiles and whenever home is shown). **A `today`
tile** joins the board's choices: the date big, the weekday, and when wide the month and how far
through the year. **The page marks have a little more character** (same plain hairlines): a house with an
arched door, two cards fanned, a five-bar waveform, a bubble that is typing; the pencil is untouched.

**15 Oct, by request:** **no two tiles are ever the same**, and none is the time (the fixed tile is): `fillBoard`
drops a repeat and fills from the widgets not yet on the board, and the picker only offers those. **New widgets**,
plainly named: `week` (the seven days, today filled), `best run` (the dino's record), `bin` (what is waiting
in it) and `friends` (the chat's count, or `log in to chat`). **The pen is gone**: arranging starts by **holding any
tile for half a second** (`holdToArrange`, like arranging apps on a phone — the pen took a place of its own in
the time tile and pushed the alignment about); while arranging every tile sways a hair (`tile-sway`), and a press
off the board finishes. **The bin moved into the strip, right after the search** (finding a thing and getting
one back together; in the bar's bumps it was the wrong home), its list opening from its top-left corner.

**The movable board is exactly three tiles** (by request; `fillBoard()`):
one wide and two small, filling the four columns, packed in order. None
can be added or removed — no cross, no resize corner, no bin, no
right-click — a board saved with more or fewer is made three again. **The
pen on the time tile turns arranging on and off** (the menu it used to open
is gone). While arranging, a press on a tile opens the widget list to change
what it shows (`openSwapPicks`), and a drag moves it along the row; a press
that travels less than 6px is a press, not a drag.

**Everything the board used to be able to do and can't any more is gone from the code** (13 Oct, by
request): adding a tile, the cross that removed one, the resize corner, the bin a tile was dragged onto,
the key menu, and the hidden pen and plus under the board. `loadWidgets` reads what is saved and
`fillBoard` makes it the three tiles on every render; `slideTiles` is the one slide for the board, used
by the drop and by the room made while carrying. The notes further down about growing, shoving,
resizing, the bin and a board many rows deep describe those older layouts.

**Five tiles across, and the first is fixed** (by request). The leftmost
tile (`#homeKey`) is always the time and can't be moved or removed. The tile
itself does nothing on hover or press; **the round pen in its bottom-right
corner** (`#keyEdit`) turns arranging on and off. The movable board beside it is the other
four columns (`BOARD_COLS = 4`); `--tile` on `.home-panel` is a fifth of
the width less the gaps, and both the fixed tile and the board's rows use
it.

**Over the search bar, first thing on home, is the front door's dino run** (12.5rem tall), the same page framed
(`.home-run` → `index.html?embed`). Framed it hides the enter pill
and the search, centres what shows (score down to the ground line) in the
frame so it sits midway between the strip and the search bar, and follows
the page's lights. Framed, **the ground runs the frame's whole width** (the search bar's length; `sizeCanvas()` on resize, and the fit is by height only), and **the dino starts at the left and runs forward** to 28% of the width with the world holding still before the view keeps up with it (`followAt()`). The front door keeps its 480px run with the dino fixed. **Space and up reach it from home** without clicking it
first — home calls the frame's `window.dinoJump()` outright (a capturing listener on the window, matching by `code`, `key` or `keyCode` so an input method can't hide the key) rather than sending it a made-up key event — the page hands them to the frame unless a box you type in has focus (a button keeping focus after a click — the home tab — must not block it; that was why space did nothing).


**As many tiles as you like, and as many of a kind as you like.** Every
entry carries a `key` of its own (`nextWidgetKey`) — the `id` says what
kind of widget it is, the `key` says which one. Every lookup on the
board goes by `key`; using `id` silently ties duplicates together.

The carried tile **trails the cursor** rather than being nailed to it
(`carryOn`, closing 28% of the gap each frame) — pinned exactly to the
pointer it has no weight. The slot it would drop into is read off the
tile, not the cursor, so the ghost matches what you see.

**Dragging a tile onto the bar at the foot of the board removes it.**
It only exists while something is in the air, it fills in when the tile
is over it, and the tile shrinks in your hand so you can see what
letting go would do. Nothing shuffles while it is over the bin.

Widget names carry no kaomoji: they read as a list, not a jumble. The
add list has no panel around it at all — a box around a box — and its
bottom lines up with the plus so it never covers the pen beside it.

Three ways to resize: the chip opens a list of the three shapes, the
corner grip is dragged, and both grow into the new shape with
`growInto()` — width and height animated, never a scale, which would
stretch the words and the corners. The chip and the grip sit on one
row in the bottom corner, level to 0.0px.

**`grid-template-columns` must be `minmax(0, 1fr)`, never plain `1fr`.**
A `1fr` track still grows to fit an item too big for it — and while a
tile animates from a wide shape to a narrow one it *is* too big for it.
The columns stretched to hold it and every tile in them jumped **129px
sideways and back**. That was the "snap" on every resize, and it looked
for all the world like an animation-timing problem; it was the grid.

**Cancel a card's running animations before starting another.** Two
growths write width and height at once and the loser snaps back — which
is what hauling the resize corner about did, since every shape it
passed through started one. `stopGrowth()` leaves CSS transitions
alone; they are not the ones fighting.

**A panel must be on screen before anything can fly into it.** Measured
while hidden, the far end of the flight is zero and there is no flight
— which is why `openNotesWide` shows the window *then* moves the panel.

**Measure a popup with `offsetWidth/Height`, not `getBoundingClientRect`.**
Panels arrive on a small scale, and measured mid-animation they read a
few pixels short — enough to miss the edge they are being lined up
with.

**Use `makeRoom`, not `untangle`, when something changes shape.**
`untangle` re-places every tile in row order, so tiles that were
perfectly fine get lifted and put back — that is the flicker. Measured
after the change: 0 of 4 neighbours stirred.


**One row, four columns, and that is the whole board.** The page below
it is free for whatever else goes there, which is the point. Nothing can
be shoved out of the row — `shove` only ever goes sideways, and when
both walls are there a tile takes the first place along the row that is
clear of what pushed it. `untangle` walks along rather than down.

Two shapes, not three: a `large` was two rows tall and has nowhere to
be. A board saved when it was deeper comes back to row 0, and a tile
that no longer fits is dropped rather than stacked.

**One inset on all four sides of the page, and it has to stay that
way.** Half a step over the first box was tried, on the grounds that
the strip above is already a margin of sorts — and it reads as a
mistake, because every other edge is a `--group` and the eye compares
them. `#homeScreen` is the one screen element behind all five pages,
so this is a single line.

**The left edge is the exception, asked for.** The bumps already reach
`--wave-out` into the page, so a full `--group` past them read as a
white strip between the bar and the boxes. The left inset is
`--wave-out + 12px` — the boxes sit 12px off the crests. 4px read as
jammed against them, 10px still tight, 16px too far. Under 760px,
where the bar lies down and there are no bumps, it goes back to
`--group`.

**Everything starts 16px under the black strip** — every page and the
bar both. It was three different numbers: the pages at 16, the
bar at 13.6 (it was using `--rail-pad`, which is its *side* inset), and
the board at 12, because the tiles are lifted 4px and that came off the
top. The board gives those 4px back in its own negative margin
(`-4px -8px -8px`), and the bar's top is `--group` like everything else.
Measured after: 16.0 on all five.

**The board's two marks sit on a row under it**, not pinned to the foot
of the panel. With the board one row tall at the top of the page, the
foot of the panel is most of a screen away from the thing they work on.

**One row means no spare row.** Two places still wrote `--board-rows`
with a `+ 1` for a row to drop into below — `paintBoardDepth` and
`showRoom` — which made the board's box twice as tall as the row and
pushed those marks down with it.

**Growing takes its room from a neighbour.** A tile that needs another
column gets it from the one it is growing into — a wide neighbour
becomes small, which is the natural reading of pushing into it — then
from the neighbour on the other side. With four small ones there is
nothing to shorten, so the last tile along goes instead. The row is then
packed left to right in the order it reads: growing is the one move
where a gap cannot be kept, because the columns have to come from
somewhere.

**The corner drag takes the same road.** It used to build its own
layout with `makeRoom` and show the board shuffling as you pulled — on
one row that answer can be "a neighbour is shortened" or "a tile goes",
and a preview that shows one thing and does another is worse than none.
Only the tile in your hand changes while you pull; the row settles on
the drop, through `setWidgetSize` like everything else.

There is **no size chip**. The corner is the way to resize.

**Nothing may sit on anything else.** `settleBoard()` runs on every
render — added, dropped, resized, or read back out of storage — and
gives every tile a place of its own: where it is if that is clear, else
the first clear place along the row, else the small shape if only a
single column is free. What cannot be placed at any size is **taken
off**, because the board cannot hold it. Never while a tile is in the
air: the carried one is allowed to be over another until it is let go.

Verified: five tiles saved on top of each other come back as the two
that fit, with none overlapping and the cleaned board saved; an ordinary
board is left exactly as it was.

**A full row refuses.** `freeSlot` answers with nothing when there is no
room, where it used to answer with the near end regardless and the tile
went down on top of whatever was already there — six tiles, fourteen
overlaps. Adding tries the wide shape, then the small one, then says the
row is full. Measured after: 4 columns exactly filled, 0 overlaps.

Four columns of slots. Every widget keeps its own `col`/`row`, so it
stays exactly where it was put and the board does **not** close up gaps
behind it — that is the whole difference between arranging a board and
sorting a list, and the reason "you can't move anything down or right"
was true before. `untangle(anchor)` gives the anchor what it was
dropped on and pushes anything under it down; nothing is ever pulled
back up, because a gap you left is a gap you meant.

**The tiles follow Apple's widgets** (by request; this replaces the
lift and hard shadow): a small tile is square — a row is exactly as
tall as a column is wide, worked out from the panel's own width
(`container-type`, `100cqw`) — a wide one is two squares, corners are
1.4rem, and every tile has one even inset (`--widget-pad`). By later
request the words are **centred and larger** (the names in Amiko, by a later request still) rather than Apple's
top-left/bottom-left: the name centred at the top, the reading centred
in the tile (numbers 3.4rem, the clock 4rem, tallies 2.8rem). The tiles
start **the same 16px under the strip as they sit apart** — the board's
negative top margin is −8px to cancel its own 8px padding, now that the
old 4px lift is gone. The tile in your hand still lifts with a hard
shadow while it is carried.

**The lift and the hard shadow are how a tile sits all the time**, not
only while the board is being arranged (older layout). Edit still changes what a tile
*does* — the handles, the grab cursor, the body going quiet — but not
how it looks.

**Nothing is shoved past the foot of the board.** A shoved tile had no
floor at all: pushed down far enough it slid under the bin, which is how
a tile could be binned by *another tile* rather than by being carried
there. `shoveFloor` is set for the length of a drop — the board may grow
for the tile in your hand, which is what the spare row is for, but not
for the ones it pushes. Over the floor a hemmed-in tile takes the first
free slot on the board instead, and if there is none it stays put rather
than being pushed out of the world. Measured: a column of three, the top
one dropped on the bottom one — the displaced tile went to row 3 before
and moves sideways now, with nothing past the depth.

**On one row the board is read like a list (this replaces `shove`
and `makeRoom`, which are gone).** `boardIfDropped` is the whole rule:
dropped into a gap, nothing else moves. Dropped onto a tile, the carried
one slots into the row's order by its middle — at the far left or far
wall it goes to that end — and then one pass forward (nobody starts
before the one ahead ends) and one pass back (nobody runs past the
wall) move only the tiles actually in the way; gaps elsewhere are kept.
The old pushing was written for a board many rows deep and bounced
neighbours about on a single row depending on the exact pixel of the
drag — that was the "odd shuffle". Checked by running every tile to
every column on four boards: 0 overlaps, 0 tiles off the row, and four
small tiles each land in exactly the column they are dropped on.

The note below about direction hints is the older layout.

**Tiles get out of the way in the direction they were pushed.** `shove`
takes the drag's own travel as the hint — come at a tile from the left
and it moves right, from above and it moves down; at the wall it goes
down instead. Two tiles on the same slot have nothing in their
positions to tell you which way, which is why the hint matters. The
board shows all of this **while you carry**, not after: `boardIfDropped`
builds the layout the drop would make and `showRoom` slides everything
into it, at 320ms — at 200 they bolted, which reads as the board being
startled rather than making room.

Dragging: the tile is taken out of the board and pinned to the window
at the size it was, so nothing can crop it and no reflow can move it
mid-flight. A dashed ghost stays in the slot it would land in, and
**nothing is moved until you let go**. Showing the move as it happened
— reordering on every pass — is what made it snap about: the board
re-laid itself under the cursor, which moved the thing the cursor was
pointing at, which changed the answer.

`.widget-list` scrolls, so it crops; it is inset 8px with the same back
as negative margin, which is what gives the edit-mode lift and shadow
room. Any "clipping at the edge" on this board is that.

**A press is not a carry.** A tile only moves in edit mode, so a plain
click anywhere else is free to mean something: it opens the tile's
`looks` list, if it has one. The clock's are `numbers` and `a face`,
kept per tile in its own entry. The face carries no second hand — the
board repaints on the minute, and a second hand that moved once a
minute is a clock visibly telling the wrong time.

## A card's edit is kept the moment you leave it

Typed changes used to live only in the field until Enter: a click
elsewhere, a tab out or a refresh lost them, and a redraw of the list
rebuilt the box with the old words — which the next save then wrote back
over the new ones. `keepStageEdit()` writes the open box's words into the
deck and saves on blur (straight away, not on a timer), before every
`renderStage()`, and on `pagehide` / `beforeunload` / the tab hiding. An
editor that has been replaced by a redraw never commits (`wrap.isConnected`).

## Practice leans, a little, towards what you find hard

Each card keeps `stats` with the deck: how many times it has been asked,
how long it takes you (`ms`, a running average, capped at a minute) and
how often you miss it lately (`miss`, a running average so getting better
counts). The draw is weighted by `cardWeight()` — `1 + 1.3 × miss + 0.6 ×
slow`, slow being how far past the deck's typical time it runs, both
capped — so a hard card is at most about three times as likely. **Every
card is still asked**: a round is the deck once over, and once a round has
run as long as the deck, whatever hasn't come up comes next; the half-deck
cooldown stays. Simulated over 800 questions on eight cards, one missed
and slow: it came up 122 times against ~96 for the rest, and no card went
more than 17 questions without coming up.

## Practice holds its question

After a wrong answer, pressing a key moves on to the next question — but
`Tab`, `Shift`, `Meta`, `Alt`, `Control` and `CapsLock` don't. Any key used
to, so tabbing away for a second (or cmd/alt-tabbing to another window)
threw the question away.

## Switching which card is being edited

Opening a second card while one is open closes the first **where it stands**
(`stageCloser`, its own commit) rather than drawing the whole list again —
the redraw put the first card's cross back with no movement and made the
second card's cross vanish, since a row added to the page and given
`editing` in the same instant has nothing to transition from. The row
being opened is also read once (`offsetWidth`) before it takes `editing`.
Measured: both crosses now fade over ~200ms, the old one in, the new one out.

## The mark lands in the middle, and the word holds still

**The answer you pressed turns white and shows only its mark** — the word is hidden (kept in place, so the box keeps its size) and the tick or cross is a touch bigger (1.75rem). **After a wrong pick, the right answer turns solid black** (`.correct:not(.is-right)`), so it is obvious which one it was.

A tick or a cross on the tile you pressed. The word used to **slide down
14px** to make room overhead and the mark came in above it — so the
answer you were reading walked off its line at the exact moment you were
told whether it was right. The word does not move now; the mark grows in
at the centre of the tile, over it.

The trade is that the mark is drawn across the letters. At a short
answer (`6`, `42`) that reads fine; over a long one it is busier. If it
ever needs solving, fade the word rather than moving it — the point of
this change is that nothing on the tile shifts.

## Coming in

A hard refresh showed the page in pieces — the columns blank, then the
clips arriving out of storage a beat later. It is held back now until
what it draws is there, then faded in as one thing, with the same
turning smiley holding the place meanwhile.

**The face only shows if the wait is a wait.** On a quick load the page
was ready before the eye had settled and it flashed up in the middle of
the screen for a frame, which is worse than no face at all — so it is
held at nothing for the first 0.34s and fades in after. Write that
delay's easing out in full: a `var()` inside a two-animation shorthand
takes the whole declaration down with it if it doesn't resolve, and
then **neither** animation runs.

**The page no longer fades in when it is let go** — it is just there, and its boxes unfold (see "one
entrance for every section").

**The holding-back is set in the head, not the stylesheet**, so a page
whose script never runs is never left hidden. The same inline snippet
takes the class off after 2.5s whatever happens; `loadStoredClips()`
takes it off sooner when the store answers.

## One entrance for every section

**This replaces the fade below (14 Oct, by request — fades read as dull, and the question mark rising
in on every refresh stood out).** Nothing fades in any more: not the shell after the boot, not the
screen, not the section panels, not the strip. The frame — the bar, the strip and its marks — is simply
there, and **the whole page slides a short way in** (`unfoldSection()` on `#homeScreen`, the same on
every page): 40px, fading in as it travels, 420ms eased out, **from the side of the bar its mark is on**
— switching to a page whose mark is lower in the bar brings it up from below, a higher one down from
above. **A refresh does not move or flash at all** — it just appears (by request); only switching
pages slides. (A wipe down each box, a box-by-box bubble and a whole-page
bubble were all tried and refused; a fade is allowed, a full-page slide was not wanted.) It plays on a
refresh once the boot lets go, and on
switching pages; not again for the page already shown.


One rule, one animation per section: `panel-in`, 0.34s, a 6px rise and
a fade. Before this the list was uneven — the cards page carried a
delay with no animation to delay, and the
audio page faded its panel and then faded the bar and the list inside
it again. Three fades over each other is what makes an entrance look
muddy rather than quick. **One element per section animates.** The
rail's help box follows a beat behind.

The `function` drawer is 0.34s open / 0.26s shut on `--drawer`, and the
words inside only fade — they used to slide up as the box grew, which
is two movements at once, and the fade waited 160ms before starting,
which is the wait you could feel. Measured: 37% open at 100ms, 87% at
200ms, settled by 300ms.

## Candy motion

By request, the plain and odd animations move like candy edits — a spring that runs a hair past where it
is going and settles. **`--spring`** in `:root` is that curve (a damped spring, 1 − e^(−6t)·cos(8t), as a
`linear()` easing); use it for anything new that pops. **Help's note and the bin's list** spring out of
their mark from small and a little turned, coming into focus out of a soft blur, and shrink and blur away
quicker. **The colour list** opens exactly as they do, colours and all (by request — a dot-growing circle, a page
flip, a turned spring and colours popping in after were all tried and refused). **It lies above the colour
layer**: moved to the foot of `<body>`, `position: fixed` under its dot (`placeTintList`), z-index over
`body::after`, and it paints its own back in the layer's colour or gradient (`--tint-layer`, fixed, so it is
the same part the strip shows) with the strip's white words. So nothing in it is cut out of the layer and
nothing in it can ever show black. **The page switch keeps its old slide** (a springy blur-in was tried and refused).

## What sits over what

One order for everything that floats, so nothing slips behind what it is
meant to cover: the page's own boxes (the home search 20), the share and
confirm chips 40, **the pushed-out page name 45 and the page marks 46** (the
name was 5 and went behind the home search), every window's veil 50, the
pop panels, menus and the sensing window 60, the strip's open dropdowns 70
(the strip itself rises to 75 while one is open), a tile being carried and
the loading face 90, and the option-key label 200. Anything new that floats
takes its place in this list.

## Nothing behind a window changes

**A window's cross (`.modal-close`) does nothing on hover or press**, by request — no fill, no movement, no boing. It sits as far off the right edge as off the top (measured: 15.0 / 15.1px).

The veil behind every window is see-through (`background: none`). It was a
72% wash of the page colour, which turned the black bar and every outline
grey behind the log-in window and read as the whole page changing.

## A window must not close on a drag that ends outside it

`click` fires on whatever the press and the release have in common —
so pressing inside a window and letting go anywhere outside it counts
as a click on the backdrop. Selecting text in a field and overshooting
the edge therefore shut the window and lost what had been typed.

The press has to have landed on the backdrop too: `pointerdown` records
whether it did, and the `click` handler checks both. This is on the one
veil, so it covers create, practice, notes and the chat's sign-in
together.

## The windows that ask you for something

Spotify's sign-in and the sharper reader share one shape (`.ask-body`,
`.ask-why`, `.ask-steps`, `.ask-go`): a line on why, numbered steps, a
field, one button. Both were drawers in the corner of a panel before,
and a wall of text in a column is not a thing anyone reads — the
reader's had no way out of it at all. A window has a cross, Escape and
a press away.

The help paragraph is justified, and its side padding is `0.35rem` so
its edges land on the ends of the rule above it — `.panel-head` holds
itself off the walls with a margin, so the rule starts there and the
words have to as well. Measured: **0.0px / 0.0px**. Careful measuring
this: the paragraph's *box* spans the full width and its padding is
inside, so compare the rule against a line's own rect, not the
element's.

## One head for every panel

`.panel-head` — the deck, the notes tool and the playlist box. They were
1.5rem, 1rem and 1.05rem with three different paddings, which is
exactly the sort of thing that is visible without being nameable. One
rule now; the notes head centres its title with a three-column grid
because it carries a button.

## The ؁ between a song and its artist

`BY_MARK` is U+0601, an Arabic sign no song title has ever contained,
set tight against both halves. Copying a row from the scratch box gives
`title؁artist`. A clip named that way downloads with the artist already
in the file: `splitName()` splits it, `id3Tag()` writes a real ID3v2.3
tag (UTF-16, so any alphabet survives) in front of the audio, and the
file lands as `title - artist.mp3`. Verified by parsing the tag back.

## Signing in to Spotify

The embed page hands over 100 songs and stops. Asking Spotify properly
lifts that, and PKCE is what lets a page with no server do it: the
client id is public, the proof is generated in the browser and only its
hash is sent, and the token lives in this browser alone.

Nothing about it is touched until a playlist actually runs past a
hundred — under that the box works signed in or not, which is the whole
point. When the wall is hit, the chip says so and the quiet `sign in to
spotify` line under the field is set bold.

**Spotify does not accept `localhost` in a redirect address** — https,
or the loopback number, and nothing else. A page served at
`http://localhost:8000` therefore cannot sign in at all, however
correct everything else is, and it fails at Spotify's end where there
is nothing to catch. The drawer checks the hostname and says so before
the press, with the `127.0.0.1` address to use instead.

The reader has to register the **exact** redirect address in their own
Spotify app; the drawer prints it (`spotReturn()` — origin plus
pathname, nothing after it) and copies it on a press. Tokens last an
hour and `spotToken()` trades a stale one for a fresh one rather than
sending anybody back through the sign-in.

Verified end to end against a mocked token endpoint: the handoff sends
a 43-character S256 challenge with the right scopes, the return leg
exchanges a 64-character verifier, the code is stripped from the url,
and the playlist link you were on survives the redirect and re-submits
itself.

**Spotify hands over 100 tracks and no more** through the embed page,
whatever the playlist's length. The page does carry an `accessToken`,
and `theRest()` uses it against `api.spotify.com` for the rest — but
that token returned `429 QUOTA_EXCEEDED` on every attempt here, so it
may simply not be allowed on the Web API. The attempt is cheap and
harmless; when the list comes back a round hundred, the box says so at
the end of the list rather than pretending.

## Turning the lights off costs one picture

The swap was a transition on **every element on the page at once** —
four properties each, and colour is not something the compositor can do
on its own, so every frame was the main thread walking the whole
document. With a board of tiles, a deck and a list of clips up, that is
thousands of animations for four tenths of a second, and it stuttered.

`document.startViewTransition` does the whole thing as one picture
instead: the browser copies the page before and after and fades one into
the other on the compositor — one paint, then nothing. The moon is
lifted into a picture of its own (`view-transition-name` on
`html.theming`) so it can still turn over, drawn as two snapshots
passing rather than as an animation on the button.

The blanket transition is kept under `html.fading`, for a browser with
no view transitions, and that path still turns the moon by hand. **Don't
put the two on at once** — that is paying for both.

`finished` doesn't always report back (a tab put in the background
mid-swap), so a 900ms timer writes the theme again and takes the classes
off. Writing it twice can only agree with itself.

## The confirm chip stays on the page

The chip is wider than most of the buttons that raise it, and
`placeUnder` lines their **right** edges up — so a button near the left
of the page threw the chip out over the black bar, which is not part of
the page and reads as the chip having fallen off it. `placeConfirm` now
holds it inside `.app-content`'s own column, and lines it up on its
**left** edge when the button sits in the left half. Measured: the page
starts at x=304 and the chip at 328.

## One weight

Nothing here is set bold. The words in the top strip are the titles and
carry themselves on their face and their size; everywhere else bold was
saying the same thing twice. One rule at the end of the stylesheet, with
`!important`, because thirty class rules set 600 or 700 and each would
otherwise win.

**The section tabs are the exception**, asked for twice and knowingly:
Bitcount fills its own gaps at 700, and the strip is meant to shout
anyway. Everywhere else the no-bold rule stands.

## The site never scrolls sideways

`overflow-x: hidden` on `html, body`. Every pane here narrows to
nothing and every strip of words in one ellipsizes, so nothing should
ever push the page wider — but a single overlooked `min-width` would,
and this is the belt.

## A pill never wraps

`.basic-button` is a fixed height, so a label allowed to wrap drops its
second line straight out of the bottom — dragging a pane narrow cut
every one of these through the middle of the words. They keep to one
line, ellipsize, and their side padding is `min(1.5rem, 10%)` so the air
gives way before the words do. Every pane on this site narrows to
nothing; anything with words in it has to survive that.

## Holding option has a character limit

`whatItDoes()` cuts at 90 characters, and a tooltip that has to be read
is a tooltip nobody reads. Every `title` on this site is a **name for
the thing**, not a sentence about it: `clips out to one file`, `every
clip to a folder`, `in the playlist twice`, `no song near 3:09 —
nearest 14.6s off`. Fourteen to twenty-two characters is the range the
existing ones sit in. Anything that needs explaining belongs in the
`function` box, not in a `title`.

## Never name a custom property after a common word

`--bar` is the black bar's colour. A cursor token also called `--bar`
replaced it, and `background: var(--bar)` became a picture — which is
an invalid background, and an invalid background is **no** background.
The top strip and the rail clock painted as nothing on every page, and
nothing in the console said a word about it.

Every cursor token is prefixed `--cur-*` now. Prefix anything new, and
when something loses its colour for no reason, check the tokens before
the rules: `getComputedStyle(document.documentElement).getPropertyValue('--bar')`
told the whole story in one line.

## The pointer, and holding option

They are **drawn at 22 in a 26 box**: the viewBox is untouched so every
mark keeps its proportions, and the hotspot came down with the box so
the point is still the middle of it.

Every cursor on the site is drawn here as an SVG data URI in `:root`
(`--dot`, `--tap`, `--bar`, `--wide`, `--tall`, `--grab`, `--held`,
`--move`, `--menu`, `--no`) and every `cursor:` declaration names one
of those tokens rather than a system keyword. Each token ends in the
keyword it stands in for, so nothing is lost if the drawing fails.

The plain pointer is a thick black dot, and so is the one for something
you can press. It was that dot inverted — white on black — and read as
**one dot changing size** as the background under it changed rather than
as two marks; the halo has to be there, so the fill cannot also carry
meaning. The rest say what they do rather than what they are. Every mark needs a
**white halo, 0.6px, drawn as its own pass underneath** — as an attribute on
the same shape it gets overwritten, and `--grab` and `--no` were
invisible on the black bar until that was fixed. Check any new cursor
on both backgrounds.

**Holding option** (alt on windows and linux — `isOptionKey` takes `Alt` and `AltGraph`, and the keydown/keyup are `preventDefault`ed so a lone alt on windows doesn't hand focus to the browser's menu) names whatever is under the pointer, beside it, in
the site's own colours (`whatItDoes()` → `title`, then `data-said`, then
`aria-label`, then the text). Nothing new has to be registered: anything
named properly is covered.

**Only things you can press.** It used to climb to any `[aria-label]`,
and those sit on whole regions as well as on buttons — so holding option
over an empty stretch of the board named the page itself, an answer to a
question nobody asked. And a box you type in is not a button: its
placeholder is already on screen, and saying it again beside the pointer
is the same word twice. `input`, `textarea` and `select` say nothing
now, and nothing without a `title`, a `button`, a link or a
`role="button"` is climbed to at all.

**And the browser's own tooltip gets out of the way while it is held.**
Resting on the same thing for a second and a half brought the system's
box up underneath, saying the same words again in another typeface
somewhere else — two answers to one question. A `title` cannot be told
not to do that, so it is taken off the one element under the pointer
while option is down (kept in `data-said`, which is why `whatItDoes()`
reads that too) and put back the moment the key is up, the window loses
focus, or the pointer moves to something else. Only ever one element,
and it is the one being looked at. Which also means a stale `title` is
now visible — "oldest first" on the download button outlived the change
to bottom-to-top.

## Level the big tab off the pixels, not the metrics

The active tab sat **0.75px low** — 16.00px of air over its ink against
14.50 under. Small on paper, plain to see at 36px. A quarter-pixel at a
time, measured off a 4× screenshot each time, lands it at
`top: -3.75px`: 15.25 above, 15.25 below, dead level, and it holds on
every section's word.

**A fractional `top` does move type.** A note used to sit here saying it
couldn't — that type snaps to whole pixels so a sub-pixel nudge lands
further off than it started — and it was wrong. It was written from the
font's own metrics rather than from the rendered pixels. Screenshot at
4×, find the first and last row with ink in it, and count.

`audio` measures high and `player` low against the others because `d`
climbs over the capitals and `p` and `y` hang under the line. That is
the letters doing what letters do; correcting it would push the capitals
off the middle to flatter the tails. Measure a word with neither.

## Keeping animations smooth

Measured with Chrome's performance counters (style recalculations, layouts, script time) while each
animation runs, since headless frame timing can't show a stutter. Three rules came out of it:

- **Nothing may animate forever on the main thread.** An endless animation has to be a `transform` or
  `opacity` on an ordinary element, so the graphics card runs it; otherwise the page is restyled every
  frame for as long as it is open. An idle page should cost almost nothing (about 2 style recalcs in 2s).
- **Read sizes before writing styles** in anything that runs per frame — a read after a write forces the
  browser to redo the page's layout mid-frame. The page names' slide reads its size once a slide.
- **Never animate an inherited custom property on a big box.** Write the property the animation is
  actually about, on the element it is about.

## One thing the renderer will not do

**A cursor cannot fade.** `cursor` is not animatable; the OS swaps the
image outright. The only way is to hide the real pointer and draw a
fake one, which costs a frame of lag, breaks over scrollbars and native
menus, and vanishes outside the window.

## Where the words sit in a box

A line of text is centred on the font's ascent-to-descent band, but the
eye centres on the capitals — and every face here hangs further below
the baseline than it rises above the caps, so centred text comes out
sitting high. Measured off the fonts themselves: **Amiko 0.088em,
Bitcount 0.060em, Matrix Sans 0.000em**. Those are `--drop` and
`--drop-title`.

A box moves its line down by **half** the difference between its two
paddings, so the correction is either added above and taken off below,
or — where a fixed-height pill already pins both to nothing — put on
the top alone at twice the size. An element that is *centred* rather
than stretched (the section tabs) can't be corrected with padding at
all, since the box and the word move together; those are shifted with
`top` instead.

Every text pill carries it now. Measured after: the labels land within
a quarter-pixel of the middle. Left alone on purpose: the `function`
heading (its rule sits inside its own box by design) and `sharper
reading` (a text button whose underline is part of its box).

## The scratch box's sources are raced, not queued

`SCRATCH_WAYS` all fire at once and `Promise.any` takes the first back
with songs; each carries a 14s abort. Tried in turn, the whole thing
moved at the speed of whichever source was ill that day — one of them
takes twenty seconds to admit it is down, and nothing else could start
until it had. Measured after: **0.77s** to a full list.

Everything the box says goes in one chip in its bottom corner
(`saySc()`), over the copy button. As a line under the field it shoved
the list down every time it changed, and it was the first thing you saw
in a box whose point is the songs.

## The top strip runs the whole width

By request, the black strip across the top now covers the bar as well
as the page. That reverses "the bar does not wait for the strip" and
"running the strip the whole width … does not work" above: the bar's
top padding is now `--topbar + --group`, so the clock starts under the
strip, level with the page's first box, instead of being hidden by it.
The tabs use the whole strip, from the window's edge. The line under
the strip is solid over the page, from the dip where the bar's edge is
on that row, and a row of the bar's own divider dots over the bar. The bumps' first tile sits behind the strip, and
the wave comes out from under it at a dip.

## The bar runs to the top again (this replaces the two sections around it)

By request the bar runs to the top of the window and the black strip
covers the page, reaching in behind the first bump (`--rail -
--wave-w / 2`) so no white shows round it — the top row is solid black.
**A semi-dotted line hugs the first bump** across the menu's own row: the
same arc the outline traces down the bumps below, drawn in white dashes
(`.topbar::before`, `pathLength` 85 with `5 5` dashes so it starts and ends
on a dash). A straight dotted line down the crests was tried first and was
not what was meant.
The line under the strip starts at the dip below the first bump. A
version with the strip starting at the crest left a white notch round the
first bump that cut into the strip, and was taken out.

## The bars swapped round (a layout test, not pushed)

By request the **pages are down the black bar on the left** (`#sectionTabs`
moved into `.rail-left`, stacked, the one you are on large) and **the clock,
the function note, storage and the bin sit in one row along the top strip**
(moved into `.topbar`, which takes the bar's inverted colour tokens). The
clock lies down as a white pill (time, moon, half of the day, date); the
function note is a pill that opens below the strip and starts folded; the
bin is a pill whose list drops below it (`#binnedHead`). A click anywhere
else folds both, and the strip is raised over the page while one is open.
The top-left corner is left empty, for a title later.

**All of the top strip's styles are in one place, section 22 of the stylesheet** (13 Oct): it used to be a base layer for the old left bar with three layers of overrides on top, including a `.topbar *` rule forcing every word to 1rem. The page marks are plain `.section-tab` rules; the old word-tab styles are gone. Things that open from the strip (help's note, the bin's list, the search results) raise it with one rule, `.topbar:has(.is-open)`.

**Help (the turning question mark) sits at the strip's left beside `hi`**, 28px off it, its note hanging from its left edge; the colour dot takes its old place right of the time; **the bin sits right up against the search** (4px). **The date sits right under the time in figures, `MM . DD`** (Amiko, bold, small — the one number not in VT323, by request (Pixelify was tried); the worded date is hidden). **The date is hidden from the strip, and the half of the day sits right over the time**, small, in
capitals (`.time-stack`, by request). **The colour dropdown is icons only** (by request): a solid dot on
the left and a gradient dot on the right (the one in use ringed), and under them the drawing page's
adjuster — a square for shade and brightness, a hue strip, the code; in a gradient both ends' codes
share that bottom row (by request — they fit), the top's on the left, and pressing one is choosing
which end the adjuster changes (ringed). A gradient chosen for the first time starts as
makoto. Its colours are cut out of the colour layer while it is open, so they show as themselves.
**The strip, rearranged (14 Oct, by request; this replaces the placements below):** the **time sits
on the strip's exact centre** — the half of the day, the date and the moon to its left (the moon still
halfway between the date and the time), help and the colour dot to its right; the two sides share the
leftover room equally, which is what centres the time (`.strip-middle`, laid over the whole strip). The
**bin and the search sit at the right end**, the search narrowed to 20rem so the middle keeps its room.

**The strip in three groups (14 Oct, by request; this replaces the placements above):** the
**search on the left beside `hi`** (24rem), **the time alone in the middle** (the half of the day over
it, the date under it), and **the controls together at the right end** (`.strip-right`): help, the
colour, the moon, then the bin, bare marks evenly apart. **Help takes the time's place** (by request): hover the time for half a second and the time, the half of the day and the date fade out while the question mark fades in on the same spot (`.help-peek`); hover away and they swap back, unless help's note is open. The note hangs centred under it, on the strip's middle. There it reads as a button: a round outline, filled on hover and while its note is open. The colour list (which grows out of its dot as a circle, its colours cut only where the circle has reached — the circle drawn by the script frame by frame together with the holes, since animated by the browser it ran ahead of them and a black rim showed; its rings white only, no black rim, by request) and the bin's list
hang from their right edges there, so they stay on the window (centred, the colour list ran off it).

**The site's name is `hi`**, in that corner (`#siteName`, a link to `home/` that switches to home in place): Bitcount, bold, 1.6rem, centred over the marks' column in the black strip. It is italic, by request (bitcount has no italic of its own, so the browser slants it). By request it and the pages' names that slide out of the bumps (`.tab-tip`) are bold too, alongside the section tabs. Everything else on the strip (clock, function, storage, bin) sits at its **right** end, by request. Nothing on the strip has an outline — the clock is no longer a white pill, it is the strip's own black — and the time is the very last thing at the right (half of the day, date, then the moon exactly halfway between the date and the time, by request). Every word on the strip is Amiko at 1rem, the time alone excepted (it keeps VT323). The `function` pill is now **a question mark** — no ring, 21px, always turning clockwise (4s a turn, as a `transform` on a plain `.help-spin` box round the svg, which the graphics card runs on its own: turned on the svg itself it was restyled by the page every frame, forever — about 60 style recalculations a second on every page, and the main cause of other animations dropping frames), drawn dead centre in its viewBox (measured: ink 12.00 / 12.00); the words on the strip (amount, half of the day, date) are **not** dropped by `--drop` — they are lowercase, the eye centres lowercase on its x-height, and amiko's x-height already sits on the strip's middle; dropped to level the capitals they read as low. The half of the day had a leftover 1px nudge from the old tile, taken out so it turns on the spot, by request (`#helpToggle`, labelled `help`) and doesn't turn white when open; its note hangs **centred under the mark** and drops in (a 6px fall, a fade and a slight growth from its top, 0.32s; back in 0.3s, eased both ends; the strip keeps its raised z-index for those 0.3s, since dropping it at once hid the note behind the page mid-fade); the old drawer's `grid-template-rows` fold is pinned open up here, since it snapped shut on close and clipped the words away before the note had faded, folding on any press anywhere else (a capturing `pointerdown`, so buttons that keep their clicks still fold it) or when the window loses focus, as **one line, always** (`nowrap`, no width cap — the pill grows sideways however long the note; 0.82rem type); its words are brought down by `--drop` + 0.9px so they sit level in the pill (measured: 18.1 against a middle of 18.0); **storage is gone from the strip** (by request), and its code with it; the places that repainted it repaint the board's tiles instead (`paintWidgets`). **The bin is a mark** — a plain bin icon (a lid, a handle, a tapering body), always there, first of the right-hand things, with how many are binned as a small white disc on its bottom-right corner, the figure tiny and black in VT323 (laid over the mark, so the mark never moves) — whose list hangs **the way help's note does** (the two share one drop-in rule) — centred under the mark, a `--group` below the strip, 0.82rem centred words, a pill-round box, the same drop-in and fade-out — 18rem wide: a small `empty` at its top centre, and under it **a little outlined box of its own** holding the binned things, with room for three and a half — every binned thing is listed and the box scrolls, on a thin white bar. It is the same size with nothing in it; the box then says `nothing`, small, in its middle. A row is the thing's name on the left and two bare marks on the right, **put back** (a curled arrow) and **delete for good** (a cross, one thing at a time, no ask); pressing the name does nothing. The `empty` button was taken out, by request. (It is back as `empty` at the list's top.) **Pressing `empty` asks in place**, by request: the confirm chip opened behind the bin's own list, so it is gone, and the pill instead splits into two pills of the same height and outline sliding out of its middle — a cross that keeps it on the left and a tick that empties the bin on the right (`askToEmpty`). Closing the list puts the pill back. **Only the centre splits**: the halves start exactly on the pill's outline and their outer ends never move. Each half pinches once, softly, as it parts and overshoots a touch as it settles (scripted with `animate`, 480ms — an alternating squash read as a shake), its inner edge grows from no width (a fading colour went through gray, and a transparent edge notched the seam), and then each mark pops in on its own. Cancel has its own motion, not the opening reversed (reversed, the spring became a jerk): the marks shrink away, the halves glide back together on a plain ease from wherever they are, and the word fades in as they meet. The halves' outer radius is half their height, not 999px — a huge radius scales the inner one down to nothing. The site's press boing is off on them: its scale replaced their slide. The time is VT323, raised 1.25px to level with the date's figures, and counts **seconds** (`09:55:52`) and sits 1.4rem off the date; the clock ticks on the turn of each second, while the board's tiles still only repaint on the minute (`clockMinute`). **The strip is 52px now**, a little shorter than a bump by request, and the bumps start at its foot (`background-position: 0 var(--topbar)` on both wave layers) rather than at the window's top, so a dip still lands right where the strip ends. In the dark the strip's foot carries a white line from that dip rightwards (`html.inverted .topbar::after`), never over the bumps.

## The pages are marks (a layout test, not pushed)

**Each mark sits at the centre of its bump's own circle.** A bump is an
arc of a circle (radius 37.5 of the tile's 39 units, ~38.5px); those
circles overlap down the bar, which is what makes the bumps. The bar is as
wide as one circle reaches from the window's edge to the crest
(`--rail` = `--wave-w × 75/39 − --wave-out` ≈ 70.8, **written as a whole
71px** — a fractional bar width drew a grey seam down it), so each circle
touches the window's edge and the mark is at its centre. Tried and refused on the way:
true half-circle bumps (looked wrong), a bar narrowed to 64px (too thin on
the right), and the 5rem bar (too wide).

The bar is **5rem** and holds **one mark per page** (`PAGE_MARKS`: a house,
two cards, a waveform, a round speech bubble (an oval with a tail, by request — the rounded rectangle wasn't round enough) — hairline strokes at 1.7), **one
in each bump**: the bumps are bigger now (`--wave-w: 40px`, `--wave-h:
64px`, so the strip is 64 tall too), and the marks are spaced a bump
apart, starting in the bump under the menu's. The marks have no ring (only the page you are on is a filled white circle)
and are 28px. The column (`.page-marks`) lives over the bar and its bumps
rather than inside the bar — the bumps are drawn over the bar and cut
anything inside it off — and each mark is centred between the bar's left
wall and the bumps' crests. **In the dark, the name's white edge starts at the dip** (fixed 14 Oct): drawn from the shape's own left edge back in the bar, it left white stubs in the bar at both corners. **Hovering a mark pushes its bump out to the right with
the page's name in it** (`.tab-tip`, the bar's black starting inside the
bar behind the mark, exactly one bump tall, round at its far end), and
leaving slides it back in — both ways animated from wherever the shape is
(a clip-path read off the running animation), so a quick in-and-out never
jumps. The slide starts at the bumps' crest, not the shape's own left edge
(that stretch lies behind the bar, and travelling through it spent the
visible slide in a blink — it looked as if it just appeared), and runs
380ms out / 300ms back on an ease-in-out. The first one waits **half a second** (`TIP_WAIT`, by request — two seconds and 0.6 were refused earlier, and no wait at all was annoying); going from mark to mark while one is out, or within 300ms of it going in (`TIP_WARM`), there is no second wait. **Each name is its own shape** (`tips`, one per page, each opening or closing on its own), so switching quickly lets the last one slide back in on its own while the new one comes out, rather than snatching it away; leaving or coming back half way turns it round from wherever it is. **Part way out the shape is already its final shape**: within the first fifth of the slide its front becomes the open shape's half circle and from there it just slides, its leading point moving evenly the whole way (a front that stayed a shallower arc until fully open read as a different shape mid-slide). **The front edge is always an arc**: shut is the bump's own arc (the tile's 37.5-of-39, scaled to the bump), open is the shape's round end, and the clip is a `path()` with one arc in it, **redrawn every frame by script** (`drawTip`, `tipEase`) rather than handed to Chrome to interpolate — and where that arc meets the straight top and bottom there is a small round join (up to 16px, nothing when shut, full size by 5% of the way out — grown over the first quarter it was too small exactly when the corner showed), since an arc wider than the shape is tall meets a straight line at an angle and showed a corner part way out; it is worked out with the arc squared up to a circle and stretched back, so the join stays tangent to both — a rounded `inset()` squashed its corners while the shape was short, and the edge sliding out didn't match the bump. In the dark the white edge is an svg path inside the tip riding the same curve (the old border was clipped off the moving edge), and shut it sits exactly on the bump's own outline (6.61 + half a pixel), or the two show as one thick line. The name only shows once the shape is half out, and then **fades in over 0.45s on its own** (`.is-shown`, a CSS transition) — a fade tied to the slide's progress ran through its fastest stretch and looked like it just appeared. It fades out in 0.2s once the shape is back under half. The name starts 6px inside the crest and ends 22px before the round end; 16px past the crest and 34px at the end read as spaced on purpose. The name's face is fetched up front: measured in pixels before the bold face had arrived, the first few hovers after a refresh came out half open in an instant. A press goes straight to the page. Nothing else happens on hover or press, by request; the old grow-and-shrink on
switching was taken out. The outline stroke is 39/40 now (`0.975`), to
stay on 1px at the new width.

**The framed dino run is told the lights outright** (`postMessage` from
`paintTheme`), and also hears `storage` and `pageshow`, on top of watching
its parent's class — and its address is fingerprinted by `pages.sh`
(`index.html?embed&v=…`) like the script and styles, so a browser never
keeps an old copy of it.

## The wave starts at the top, in both lights

The bumps start with a whole bump at y=0 — a dip right at the top of
the window — and the white outline along them is drawn in the light as
well as the dark, over the black strip too, so the wave runs the full
height. Light and dark put the tiles in exactly the same place: a
version that moved them for the dark only made the edge jump on every
swap, and was refused. The strip is exactly one bump tall
(`--topbar: var(--wave-h)`), so the line under it meets the wave right
on the dip between the first and second bumps, `--wave-out` in; the
notes above about a crest under the strip are the older layout.

The outline is drawn at stroke 39/32 because the tile is drawn 39 wide
and shown at 32 — at 1 it came out 0.82px, thinner than the strip's
line.

## The inner corners of the bumps

The black strip under the bumps (it hides the seams between tiles) must
stop exactly at the dips — `--wave-w * 6 / 39`, where the tile's path
starts. It was `--wave-out + 1px`, a pixel wider, and poked a tiny nub out
of every inner corner, plain once zoomed in. The outline's ends are round
so the two arcs meet at a dip without a notch.

## Two bugs worth not repeating

**A hidden panel measures as nothing.** `between()` used to work out
the grip by subtracting both panes from the whole — right only once
both have been laid out. On a hard refresh neither had been: the grip
came out as the entire width, the ceiling fell to zero, and the scratch
box shut itself on load. It asks the grip directly now.

**A grip jumps unless you remember where it was grabbed.** On the first
press the pane snapped so that the cursor became the divider. `slack`
is measured once on pointerdown — what the pane's size *would* be from
the pointer, minus what it actually is — and carried through the drag.
Works on both axes and both directions, whatever the geometry.

**Paint order beat the dark-mode scallop outline.** `.app-shell::before`
draws the white line along the scalloped edge; at the same `z-index` as
the carve above it, the carve painted last and buried it — present in
the stylesheet, absent from the screen. It sits at `z-index: 4` now.

## A pane is readable or it is shut

By request, this replaces "every pane narrows to nothing" below. Each
split's two sides have a least size (`least`, `leastOther` on
`wireSplit`, in pixels or a function): the playlist box is as narrow as
its `playlist` heading still whole (`headingRoom()` measures the words
plus what the pane puts round them), the ai card maker as short as its
head row and a box with the whole of its placeholder showing (`notesRoomDown()`, measured off a hidden copy of the words at the box's width), the decks 215px (so `new deck` shows whole), the card side its 19rem, the clips 300px, the
deck stage 140px. With `snap`, pulling a side past its least **shuts it**
once you are more than halfway past, and holds it at the least short of
that; pulling it back opens it straight to the least. A grip writes its pane's width **straight onto the pane** (`flex-basis`), not as a variable on the row: an inherited variable made the browser restyle everything inside the row on every frame of a drag (measured: 184ms of style work over a 60-frame drag, 40ms after). It reads the row's size before writing anything. A drag sets the split **once a frame** and measures the least once, at the press — measured on every move it made dragging lag. The card maker's top and bottom padding ramp with its opening (`--skin`), since it opens downwards; a fixed padding jolted in as it left shut. A snap **travels** (`travel()`, 200ms, eased out) rather than arriving — both sides are opened for the trip and the far one may shrink past its own floor, then the shut classes go on at the end. The other side
shut gets `.split-shut` (display none) and the pane takes the row; the
grip shrinks to nothing at either end. The chat's list has `least: 250`
and no snap — it never shuts at all.

## Every pane narrows to nothing

The three grips (decks/cards, queue/player, clips/scratch) size their
pane continuously down to 0% — no snapping, no minimum that it sticks
at and then jumps past. That is why `.deck-side` and `.queue-side` have
`min-width: 0` rather than a rem floor. Text inside these panes must
ellipsize, since the box gives way before the words do.

**The gap grows with the pane, and neither one jumps.** The grip *is*
the gap, so at 0% it has no width either — otherwise it left a strip of
nothing against one wall and the pane still open sat off-centre by
exactly that much. It ramps from 0 to `--group` as the pane opens
(`--grip`, set in `wireSplit`), and keeps an outward press strip while
it is too thin to aim at, so a shut pane can always be pulled back out.
The clip box's side padding ramps the same way (`--skin`): a border-box
element can never be narrower than its own padding plus outline, so a
fixed padding made it jump from nothing straight to 18px.

**Only the sides ramp.** The floor `--skin` exists for is a *width*
floor, and ramping the top and bottom with it slid everything in the box
down nine pixels as it was dragged shut — `copy all` and `match the
clips` visibly dropping while the box narrowed. Measured after: they
hold at 749.0 from full width down to 12px.
 Measured: the
pane tracks the cursor within a pixel from 4px wide upward, and both
edges of the row stay at 0.0px at every width.

**The chat's list is the exception: it never shuts.** `least: 250` (pixels) on its splitter holds it wide enough for the `find or add someone` field and its plus, and the gap between the two panes stays a full step — pushed shut, both went and it looked broken.

The clip list always keeps at least half the row — `keepOther: 50` on
its splitter, not a `max`, so the grip and the gap are measured rather
than assumed.

## The site's own address

It lives at **morie.top**, and the `CNAME` file in the root is what
says so. That file has to be *in the repo*: github pages writes one
when the domain is set in the settings, but anything that rewrites the
branch can take it away again, and the domain then quietly falls back
to `silveia.github.io/recall`.

**An apex domain needs A records, not a CNAME record.** `morie.top`
itself cannot be pointed at `silveia.github.io` — dns does not allow a
CNAME on the apex — so it needs github's four addresses:

    185.199.108.153   185.199.109.153
    185.199.110.153   185.199.111.153

`www.morie.top` is the one that *is* a CNAME, to `silveia.github.io`.
When the site goes dark, ask dns before anything else:
`dig +short morie.top A` — no answer means the apex has no records and
nothing in this repo can help. That is exactly what happened on first
setting it up: www resolved, the apex did not, and pages was
redirecting www to an address that did not exist.

## A link per page

`morie.top/cards`, `morie.top/audio`, and so on. The tabs write them as
you press (`pushState`), the back button walks them, and arriving on
one opens that section.

**The root is not the site.** `morie.top` is its own page and is blank
for now; the site itself is `app.html`. That is why the app's html is
not `index.html` any more — and why it stayed at the root rather than
moving into a folder, since every relative path in it (`script.js`,
`ocr/`, `llm/`, the woff2) is written from there.

**Github pages serves files, not routes**, so `/cards` has to be a real
place on the disk — `cards/index.html`. **That file is the site
itself**, a copy of `app.html` with `<base href="../">` so its relative
paths still reach the root. It used to be a one-line hop on to
`app.html?go=cards`, and every refresh showed it: a white page for a
beat and `app.html?go=…` in the address bar before the real page came.

**Each copy loads `script.js?v=…` and `style.css?v=…`**, a fingerprint of the file's contents written by `pages.sh`. Github pages lets a browser keep those files ten minutes, and a push could otherwise run the old script under the new page — which is how a chat reset still showed the old accounts.

**Never edit the copies — edit `app.html`.** `.githooks/pages.sh` writes
all five, and the pre-commit hook runs it, so they cannot fall behind
(`git config core.hooksPath .githooks` is what turns the hook on, and a
fresh clone needs it run once). The `<base>` goes in *after* the
doctype; anything before it drops the page into quirks mode.

The links carry their slash (`/cards/`), because that is the real file;
without it github answers with a redirect and the address changes under
you. Tesseract reads its paths against the address bar rather than the
`<base>`, so they are spelled out in full off `document.baseURI`.

`app.html?go=cards` still works, for any old link. `404.html` sends a
path ending in a section name to that section's folder, and anything
else to the front door.

**The lights are set in the head** of `app.html`, before the
stylesheet, the same way the front door does it. Left to `script.js` at
the foot of the page, a page with the lights off came up white on every
refresh and then turned over.

`SITE_ROOT` is worked out **once, before anything is written to the
address bar** — a `replaceState` moves the ground it stands on. It
strips both `/index.html` and `/app.html`, so the links are right
whether the site is at a domain's root or in a folder under it.

Every write goes through `writeLink()`, which swallows its own throw:
opened as a file rather than served, the browser refuses to be told a
path at all, and that throw would otherwise take the section swap down
with it.

## Chatting

**The log-in card's layout was found by hand** in a temporary editor (since removed) and then tidied
(14 Oct): no picture, the title 3.5rem in Pixelify, the line under it 1rem, the fields full width 2.5rem
in from the card's sides, each named by a small label over it (0.75rem, near its left end; centring them was tried and put back)
rather than by words written in it, a short tall `sign in` pill (3rem, 1.2rem type) centred under them, and the
card's padding even all round, 34rem wide. **Register asks for more than log in**, in this order (by request): username, nickname, password,
confirm password, and **pineapple or pizza** — two pills, one must be picked, and the pick is
permanent: it rides on the account's `who` post (`side`), the first word on it stands, there is no
way to change it, and it shows as `team pizza` under the handle in the account panel and at the top
of a thread with that person (`sideOf()` follows renames). The nickname is posted signed, like any
later change. **Everything missing or wrong shakes at once** (by request), on log in and register alike — an empty
username, password or confirm, a confirm that doesn't match, no pick. A **taken username** also
flashes `taken` one ordinary space after its label, on the same line as the word: there at once, faded away over a second (`flagTaken`). No email (asked for, then dropped:
there is no server to send to it). **No sign in with Google**: asked for, and left out — it
needs a Google Cloud client registered to the domain, and with no server there is nothing to check
the token against, while the chat password is what wraps each account's private key; a Google login
cannot stand in for it without weakening every account.

The one page here that is not only yours. Everything else keeps to this
browser; a chat cannot, because two people have to meet somewhere, and
a static page has no server to be that place.

**Nothing is set up and nothing is signed up for.** It talks to
ntfy.sh, a public notice board anyone may post to and read without a
key or an account. Posting is an ordinary `POST`, reading back is an
ordinary `GET`, the live half is an `EventSource`.

**Plain https, and that is the whole point.** This was mqtt over a
websocket first, and it worked — until it met a machine with a proxy
set on it. A websocket goes through the proxy, and a proxy that isn't
answering doesn't refuse, it waits, so the chat simply never
connected. Measured on that machine, same page, same moment:

    https fetch 200 · https post 200 · sse open · websocket ERROR

Everything here is therefore the three that worked. **Don't put a
websocket back**, however much tidier the protocol looks.

**Every message is sealed to the two people in it.** There are no
rooms: a public board cannot hold a private one, and a chat that is
only sometimes private is worse than one that never claims to be. Each
account carries a public key; a message is encrypted under a key the
two of you derive between you (ecdh p-256 → aes-gcm) and never send.
The board carries it and cannot read it, and nor can this page.

**What is still in the open is who wrote to whom, and when.** Something
has to say whose a message is. Only the words are sealed, and the
window says so rather than letting anyone assume otherwise.

Your private key lives in this browser, and a copy wrapped in your own
password (pbkdf2, 150k rounds) is posted to the board — which is what
lets you sign in on another machine and still read your own messages.
The password itself never leaves.

**The board knows every account on it; that is not a list of people
you want to hear from.** You add someone by the name they signed up
with, and only the people you added (or who wrote to you) are shown.
**Right-click does nothing to a conversation** — it used to drop the
person, which read as the conversation being deleted.

**Opening the chat opens your last thread straight away**, from what this browser holds; waiting on
the board drew the welcome first and swapped it for the thread a beat later, which read as a glitch.

**Someone who writes to you turns up in your list** whether you added them or not (`openWhatIsWaiting`) — a message from your own other account sat in a thread nothing on screen led to.

Someone added who has never opened the chat has no key to seal
anything to, so their row goes **dashed** and the field says why
rather than failing on the press.

A sealed message whose sender's account hasn't arrived yet **waits**
(`chatSealed`) rather than being dropped, and is opened on the next
pass — an account post and a message post race, and the message
usually wins.

**A login window is a login window.** It had a paragraph of why over
it and labels in this site's own voice — "what to call you", "the name
and the password you made it with". Nobody reads a paragraph on the
way to typing their name, and an unfamiliar word where `username`
should be is a puzzle at the one moment there is nothing to be curious
about. It is `username`, `password`, `sign up` / `log in`, and
`already have an account?`, like everything else anybody has ever
signed into. What the page does with a message belongs in the function
box.

**Each password box has an eye** at its right end (by request, minimal): a shut eye — one curved
lid — while it is hidden, an open eye while it shows; a press swaps it (`.word-eye`).

**The password field is not a password field.** Chrome reserves its
weak-and-breached warnings for `type="password"`, and it was firing
them at a word guarding a public notice board — a warning that rather
overstates what the word was ever protecting. It is a text field
masked with `-webkit-text-security: disc`, and it goes back to a real
password field where that isn't understood, since a word typed in the
clear is worse than a warning.

Masking it in css is not enough on its own: a real password field is
also not a drag source and cannot be copied out of. Without that the
row of dots could be **dragged straight into the username box**, where
it landed in the clear. `copy`, `cut` and `dragstart` are refused;
pasting *in* is left alone, since that is how a password manager fills
a field and it gives nothing away.

The rule is six characters with a letter and a number, and it is
checked **only when an account is made**. A word that was allowed when
the account was made has to go on being allowed, or the rule locks out
the very people it was meant to look after.

**Bumping `CHAT_ERA` is the reset** (now `v3`; v2 was reset by request, and its keys — `chat-accounts-v2` included — are cleared on sight). `localStorage.chat-era-test` points a test at a board of its own. There is no way to delete a post
from a public board and no account to close — what there is, is
another board. A new era is an empty one: no accounts, no threads,
nobody. The three localStorage keys carry the same number so a
browser's own copy goes with it rather than being left pointing at
people who, on this board, do not exist; the previous era's keys are
cleared on sight.

**Ask the board before saying a name is free.** The list in hand is
whatever had arrived when the page opened, so a name taken since — or
taken while the page sat open — looked free, and two people walked off
with one name while only one of them could read their own messages.
`catchUp()` runs first, and the answer is current.

**No rule on the password.** It guards a thread on a public board, and
a page that turns somebody away over a missing digit is pretending to
protect something it cannot.

**A mistake shakes the field it is in**, by request, instead of a line of words appearing (`shake()`): no such account, a name that's taken or not allowed, or an empty username → the username shakes; a wrong or empty password → the password shakes; the board not answering → the button shakes. The same in `find or add someone` (nobody by that name, or yourself). No error lines are added under a box.

**The door is locked while it works.** Making an account is three slow
things in a row — the board, a key pair, and the pbkdf2 wrapping — so the
button and the swap beside it are disabled until it is done, which is what
stops two accounts. By request the button **keeps its own word** (`log in`
/ `sign up`) the whole time: the `checking the name…` / `unlocking your
key…` labels flashed past and were taken out. `paintChatDoor` returns early while it is busy, or it
would paint the label back.

**Signed out, the chat is a log-in screen** — a centred card (30rem wide, a 6rem picture, a 2rem title; the page round it has no outline of its own, since a box in a box read as a window in a window; the card and the log-in window are drawn the other way round from the page on light — black on light, by swapping the colour tokens, by request — and on dark are see-through with the page's white words and outline, by request) with a
picture mark, `welcome back` / `make an account`, the username and
password fields and the button right there on the page. It is the same
form as the log-in window, carried onto the page (`placeDoor`) and back
into the window when `add account` needs it, so there is one form and
one set of listeners.

**Fixed 14 Oct:** enter in any of the door's boxes is the button; the button keeps `sign in` after a failed try (it went back to `log in`); the confirm password can't be copied or dragged out either. In the strip, the bin's list and the colour list shut each other (both stopped their clicks, so neither heard the other open); a card put back from the bin whose deck is gone stays in the bin instead of vanishing; help can't be tabbed to while hidden.

**Signed in, the chat is always laid out as a messaging app**,
nobody added or not — by request, after an empty page with things
floating in the middle read as unfinished. Two outlined panes:

- **The list (left)**: the `find or add someone` field as a box of its
  own above the list (with a solid square `+` beside it, the way `new deck`
  sits on cards), then the list box (no title or label of its own): then one row per person — picture, name,
  the last line (`you: …` if yours) and its time, WhatsApp-style. With
  nobody yet it shows one line in the middle of the empty list, `you have
  no friends...` (the user's wording), and nothing else.
- **The talk (right)**: a header with the open person's picture, name
  and handle (the `sealed` chip was taken out) — no rule under it, and nothing in it
  but your picture while no one is open (no `home`), and the message box
  says nothing until someone is picked. With no thread open it shows, in the middle of the pane, a
  `^_^` (set a little above the pane's middle), `pick a friend on the left to start yapping`, a friend count
  (`3 friends`, in VT323 — the message count was taken out) and a `back to <name>`
  button for the last person you talked to (`paintWelcome()`). The
  greeting, log-in buttons and cards that were here before are gone.
  An open thread starts like Discord's: a big
  picture, the name, and "this is the start of your messages with …".
  The box at the bottom reads `message @name`, and is not there at all while no thread is open.

**Your account is a round picture in the top-right corner** of the
chat (the end of the thread header) — kept there on purpose, since that
is where every other site puts it; a card at the foot of the list was
tried and read as confusing. It opens the account panel under it. The panel is
Google-style: a
large round picture at the top with a pencil on it — **pressing it
opens account settings** (there is no separate settings button) — your
nickname large under it with `@username` small, then **every account
logged in on this browser** as a list (the one in use filled black,
each with a three-dot menu holding `remove`), `add account` — the same full-width pill as
`log out`, only white — and `log out` at the foot. **Log out asks inside its
own button**: it divides — both halves start stacked as the one black
pill and slide apart into `confirm` and `cancel`, cancel snapping to
white once they part (a colour fade would pass through grey).
**Several accounts per browser.** The one in use lives where it always
did (`chatMe`, `chatPriv`, `chatFriends`, `chatDms`); the others wait in
`chat-accounts-v2`, each with its own key, people and threads, and
`useAccount()` swaps them, reading that account's sealed posts off the
board again. `add account` stashes the current one and opens log in;
shutting that window without logging in puts you back where you were
(`addingAbandoned`, called from `closeModal`). Log out drops the account
from the list and moves to the next one if there is one. Pictures are
kept per account (`chat-face:<name>`).

**Faces are never letters.** With no picture set it is the person mark
(`PERSON_MARK`). Your picture is kept in this browser only
(`chat-face`), cropped to 96px and Floyd–Steinberg dithered to pure
black and white so a photo survives the no-grey rule.

**Account settings** is a window with four rows that open in place:
edit nickname, edit username, edit password, edit profile picture.

- **Nickname** is shown everywhere a name is — the panel, the people
  list, the thread's heading, message rows (`displayName()`). Any
  characters, fancy text included, up to 32.
Every box on a page sits one `--group` (16px) from the next, but **an icon
button sits `--tight` (8px) off whatever is beside it on its row** — the
deck bar, the sensing gear and the clip folder row — so the icons read as
part of the row rather than standing out (asked for after an all-16px try).

- **Username** is `a–z 0–9 _ - .` only, lowercased, up to 20
  (`NAME_OK`, and the fields' `maxlength`), checked on sign-up and on rename. Existing accounts from
  before the rule keep working.
- **Password** asks for the current one first.

**Every profile change is signed.** The board is public and anyone can
post to it, so a change is a `{k:'me'}` post signed with ECDSA using
the account's own P-256 key (the ECDH key, imported a second way), and
others check it against the public key they already hold before
believing it (`applyProfiles`). A forged nickname, rename or password
change is simply ignored — verified with a forged post. A rename is
followed everywhere with `whoIs()`: friends lists, threads and the
open thread move to the new name, logging in with the old name lands
on the new one, and the new name is also claimed with an ordinary
`who` post so nobody can sign up over it. Your latest signed change is
posted again if the board has forgotten it, like your account is.
Sealed messages are now kept whatever names they carry and sorted out
when opened, since a rename can make an old post yours.

**Logging out is asked first** (inside the button, see above): the key
this browser holds goes with it, and every thread goes dark until the
password is typed again.

**Logging in reads the board again as you.** The first read happens before anyone is logged in and passes over every line it can't own, so without a second read a new browser came up with no friends and no threads. Verified with three separate Chrome profiles on a test board: A and B message both ways live, and C, a fresh profile logging in as B, gets the whole thread.

**Accounts are put back by whoever knows them.** Each browser re-posts its friends' accounts and its own other accounts when the board has lost them (`sayAgainWhatIsMissing`), so an account doesn't disappear because its owner hasn't been round in twelve hours.

**The board forgets after twelve hours**, which is the one real cost of
needing nothing set up. So every browser keeps its own copy of what it
has seen (`chat-known`) and merges that with what the board still
holds: your own history is never lost, and a newcomer gets the last
twelve hours. Your own account is posted again when you open the page
(`sayAgainWhatIsMissing`) — without it on the board nobody can seal
anything to you, so it is the one thing that must never quietly fall
off. `catchUp()` is also what `addSomeone` asks before telling anyone
that a name doesn't exist.

**The posts are the shape.** There is no server holding a schema, so
state is whatever reading the posts in order adds up to: an account, or
a line said. `takePost` is the only thing that writes state, and it is
deliberately idempotent — the same post read from history, from the
live stream and from a republish must land once.

**Files.** The clip at the left of the message box, a file dropped anywhere
on the talk side (the box included), or a picture pasted into the box puts
them **in the tray just above the message box** (`#talkTray`, a chip each:
a dithered thumbnail or a file mark, the name, the size, a cross to take it
off). The send arrow sends the tray's files first, then the words; a chip
that fails stays, dashed and shaken, to be sent again. Switching thread
empties it. **Every chat status used to go to `#chatNote`, which lives in
the log-in form and is hidden once you are in** — which is why a failed file
said nothing at all. They go — any type, png, jpg, webp and the rest. A file dropped anywhere else
on the page is caught, so the browser never opens it in place of the site.
They go up to 15 MB each, up to 15 MB each. A file is sealed in the browser
with the same key as the words, uploaded to ntfy as an attachment on its
own topic (`FILE_TOPIC`, a `PUT` — CORS checked: allowed), and a line
whose sealed words are a note — `CHAT_NOTE` (U+0000) and JSON
`{file:{url, iv, name, type, size}}` — goes on the thread. **The board
keeps attachments three hours**, so every browser keeps its own copy once
it has opened one (IndexedDB `chat-files`); after that a file nobody
opened says it has gone. Pictures show as a small copy **in their own
colours** (`smallPicture`, by request — the one place colour is allowed;
they used to be dithered to black and white like faces, which stay so);
pressing the box saves the original.
Verified: a file sealed, uploaded, fetched back and opened byte for byte.

**The three dots on a line** show on hover, centred down the line, with no ring round them and no hover animation, and open into marks that slide out from the right, the nearest first (0.26s, 40ms apart): copy,
save (a file), edit (your own words), and the bin — delete for both on
your own line, remove for me on someone else's. The bin acts on one
press, and **ctrl/cmd+z brings a deleted line back for thirty seconds**
(`lineUndo`); the deletion is only sent to the board when those are up (or
the tab is left), so an undo never chases a note the other side already
obeyed. The dots and marks have nothing behind them and no pressed state. Editing opens a box round the words — a textarea as tall as the text, growing as you type — and the row opens out a little top and bottom, the words keeping their place across. The opening is one script animation (`field.animate`) from the words' own height to the box's, with padding and margins travelling together; a CSS animation of the padding alone fought the fixed height and jumped. The dots hide while editing (`.is-editing`), and the edit is sent once — Enter used to save it and the blur that followed saved it again. A public board can't take a post back, so a deletion or an
edit is itself a sealed note (`{gone: id}` / `{edit: id, said}`), obeyed
only when it comes from whoever wrote the line (`lineChanged`), and every
deleted line or spent note goes in `chatSkip` so it is never read again.

**A line is at most 1000 characters** (`TALK_MOST`, the field's `maxlength`) and 2800 bytes. ntfy turns any post over 4096 bytes into an attachment, and sealing plus base64 grows a line by about a third — that is why very long messages silently never arrived. The count left shows in the bar from 150 out, and `too long` if emoji push the bytes over first.

**A line you typed goes up before it is sent.** Waiting on somebody
else's server to see your own words is the difference between a chat
and a form.

**The thread is anchored to the field, not to the top.** `margin-top:
auto` on the first row: the newest line is the one being read, and a
short conversation floating at the top of an empty column reads as a
mistake.

The rule under `function` is a plain solid line again (a dotted fade was tried and taken out). The paragraphs
under it are centred, at 1.65 line height, and run nearly the full width
of the box.

**Message rows are laid out like Discord's**, by request: a round
filled initial on the left, the name and `today at 3:04 pm` on top,
the words under them, and lines from the same person within five
minutes (`SAME_BREATH`, now ten) grouped under one head. Times are set like discord's: the body face (Amiko), small (0.64rem) and greyed with `--muted` — by request, the one place besides placeholders the no-grey rule gives way — set well off the name (0.6rem gap plus 0.45rem). Lines within ten minutes share a head, and **a new day gets a dividing line with its date** (`.said-day`, in black — only the times are grey) and starts a fresh head. A grouped line shows
its own short time in the left gutter on hover, and the hovered row
gets a dotted outline — Discord's hover is a grey wash, which isn't
allowed here. Your own messages look the same as everyone else's, as
in Discord; the filled mark that used to tell them apart is gone.

Verified end to end on the proxied machine, two separate browsers:
sealed both ways, each read the other's, and from outside the board the
messages are opaque base64 with none of the words in them.

## The site's colour

By request, black can become any colour, or a gradient. **`tint.js`** (loaded in the head of the
site, the front door and the drawing app, so nothing is drawn black first) keeps the choice in
`localStorage['site-tint']` and writes two tokens on the root: **`--tint-main`**, what black words and
outlines become — the colour, or the darker end of a gradient, darkened and saturated a touch until it
reads on white — and **`--tint-fill`**, what the **big black backgrounds** become: the colour, or the gradient laid
over the whole window (`fixed`) — the bar, its bumps, the strip, the names out of the bumps — so they
share one layer; **`--tint-grad`** is the same gradient sized to its own box, for the log-in card.
**Everything else is two colours, white and the dark one, solid** (by request): buttons, words,
outlines, pops — `--ink-fill` / `--paper-fill` fill with `--tint-main`, and a hover only ever swaps
those two. **One layer over everything (this replaces the token approach below for the site and the front door,
by request: "it's all supposed to blend with the gradient and match with the back").** Pages that opt in
(`<html class="tint-layer">`: the site and the front door) keep every black thing black underneath —
`--tint-main`, `--tint-fill` and `--tint-grad` are forced to black — and lay the colour or gradient over the
whole window (`body::after`, fixed, `mix-blend-mode: lighten`, no pointer events): black becomes the
layer, white stays white, so words, outlines, marks and fills all show exactly the part of the gradient
behind them. Nothing carries a gradient of its own, so nothing shows the wrong part while it moves — the
flash a page slide gave is gone. What keeps its own colours is **cut out of the layer** (`--tint-hole`, a clip with a hole per
thing, `tintHoles()`): the white sheet on the draw page — only the sheet, where it shows inside its box (in the dark the box round it is black and takes the layer), following pans and zooms; the drawing app's black is
black underneath (`tint-layer` when framed) and takes the layer like the rest — and colour pictures in
the chat. **The drawing app reports its own holes, by message** (`tintHoles` posted to the page; the page sends
back the lights and the colour) — opened as a file the page may not look inside the frame, and the whole
frame was cut out and left black and white. What puts the layer back over the sheet (a button, a window,
the open adjuster) is cut to the sheet, or the part of it off the sheet became a hole. **The sheet grows
with its box** (`growCanvas`, a ResizeObserver, keeping every pixel where it was): sized once at load, a
box that grew after left a band under it, black in the dark. Each hole is rounded like the thing it is for (a square hole round the round colour dot or the canvas's corners showed black). The holes are measured at once and every frame while the page slides (a hole a frame late, or
left behind by the slide, was the glitch going from chat to draw), and again on scroll, resize, a
picture loading and the thread redrawing. The front door framed on home has no layer of its own — two
layers drew the wrong part of the gradient.
**Temporarily, by request, fills show the fixed gradient again** (`--ink-fill` / `--paper-fill` = `--tint-fill`, each marked TEMPORARY in the stylesheet; solid was `--tint-main`). The log-in boxes and the strip's search are see-through. A fixed gradient on things inside the page flickered for a moment as the page slid in (a
moving box draws its fixed background wrong), which is why the gradient keeps to the big backgrounds. Every place that swaps the two colours (the strip, the page marks, the log-in card,
the dark mode) defines both fills too. **The bumps are cut with masks now**, the bar under them and
the ::after past it, because a black picture cannot take a colour. **Presets: black, and makoto**
(#0305b6 at the bottom, #02cdff at the top). The adjuster is a dot in the strip, right of help; it
drops a list like the bin's — presets, solid or gradient, and a circle per colour that opens the picker.
Frames follow through storage events.
**The solid colour and the gradient are kept apart** (`{ mode, solid, a, b }`, 14 Oct): changing one
never moves the other — the solid colour used to be the gradient's bottom, and switching reset the top —
and switching brings each back as it was left. **Nothing kept means plain black** (by request — `#314444` was the first colour for a day, and is read as black where it was kept), and a gradient first chosen is makoto.
**The layer is blended with `screen`, not `lighten`**: black still becomes the layer and white stays
white, but a grey becomes the layer that much lighter, so placeholders and the chat's times read as the
colour at a lower strength (in a gradient, its own part of it, lighter) rather than as grey.
**Nothing that is cut out of the layer may fade** (14 Oct): under a hole is plain black, so a fade there
came up out of black. The colour list **unrolls** down out of the strip instead (`rollTintList`, a clip,
240ms / 170ms back), its holes cut only as far as it shows; a page with holes on it (draw, chat with
colour pictures) slides in without the fade; and with a colour on, the drawing adjuster's parts only slide.

## The strip's corner, the bin in the bar, notes (14 Oct, by request)

**The colour dot is in the strip's very top-right corner**, the moon just before it, and the colour list
opens from that corner (16px in, its right edge on the page's). The moon is now the same hairline as every
other mark (an outlined crescent) and both sit in the same 36px box with a 20px mark, so side by side they
read as a pair — they were centred, but a filled 16px crescent beside an 18px ring looked off. **The colour
list has no blur.** **The bin is in the black bar** (`.bin-dock`), in the marks' column (see "sparkles, and the pop" for where);
its list opens out to the right, its left edge on the page's boxes.
It lies over the colour layer with the marks; its count and list carry their own copies. **The notes have no
word count.** **The page column starts under the strip** (`margin-top: var(--topbar)` on `.app-content`, not
padding): a page sliding in from above was drawn over the strip for a moment — the white flash moving up to
home.

## Sparkles, and the pop (14 Oct, by request)

**Sparkles lie over everything** (z 2147483647) and **take their colour from what they land on**
(`sparkleOnDark`): white over anything filled dark (create, the bar, a pressed row), the ink over the page.
Small (8–15px) and **minimal** (by request): a few at a time, each popping to size, drifting a few pixels,
and gone after about a third of a second — no slow shrink, no spin (the first ones spun, then flew, and both
were too much). **One sparkle shape only**: a plus with thin straight arms tapering to blunt points and a slightly bolder
middle (`.sparkle`, a mask, so it is painted like black is painted here: white in the dark, the colour layer's
own colour at its spot in the light, black with no colour). On the graphics card. **The bin's list has no bubbles** (by request). **`sparkleAround(el)`**: a list opened by a press sparkles **out of the pointer** too (a spray, as on any small
press — by request, "a little bit of both") — except the colour list, which only sparkles round itself — and with a proper burst: 11 bubbles (8 read as too few), each in its own stretch of the edges — more down the left and along the bottom — wandering a
little inside it (8% of the side, a few pixels in or out), sizes shuffled, and placed again if one lands too
near another (fully random they clumped; fully set they looked the same every time) —
starting at once (within about a fifth of a second), that pop up, rise a little and are gone (`rise`; by request, it felt plain — a version that dwindled away as
it floated up was tried and put back; `dwindle` is kept in `sparkle` for it); and as it springs out of its mark, half twinkle **on the list itself**, near its
edges and corners, white so they are plainly in front of it (all outside it, they read as coming from behind
it), and half start just outside its edges and fly outwards, coloured by what is round the list (`ignore`);
the nearest its corner go first — the colour list, help's note, the search's results and the drawing's colour adjuster — not the windows (create, practice and
the rest open as they always did, by request). **`sparkleBurst(x, y)`**:
a few **plus signs** (thin arms tapering to their tips, no bolder middle — `.sparkle.is-plus`) out of the
pointer, **never turned** (by request), wandering any way round it 28–62px along gentle curves, lingering at
full size for most of a second as the bubbles do, then gone quickly
— **only on create and practice** (by request: on every minor press they stopped
being special); opening a list sparkles round the list only. **A sparkle is now a bubble** (by request, after a plain
circle): a hollow ring with a little curved highlight at its top left, a touch bigger to read; the plus is
kept, commented, in `.sparkle`. **The pop-ups pop**: no fade and no blur (both tried and refused) — the spring out of the mark from
small, a quicker shrink back.

**Smoothness:** the copies of the colour layer are placed once when something opens, moves or the window
changes (`somethingMoved`), and only written when they have actually moved — placed on every frame of an
animation, they made the browser redo its layout each frame and the colour list's spring stuttered.

**The bin is in the strip beside the search** (15 Oct; see "the home board"). Its list opens from its top-left
corner, as the colour list opens from its corner.

**Icon buttons rock on hover** (by request): the square icon buttons, the bin, the time tile's pen, the
drawing's undo and redo and the reference window's upload — the symbol grows a little (`scale`), then rocks
slowly to and fro (`rotate`, `icon-rock`), turning, not moving, for as long as the pointer is on it. **They no longer change colour on hover** (the fill
swap drowned the motion out), and **their lines thin as they grow** (`--sw`, each mark's own width, set by
script.js), so a bigger mark is not a bolder one.

## The colour, in layers — no holes on the draw page (14 Oct)

By request ("all the black stuff should work like a layer clipped to the gradient", after many black
flashes). **This replaces every note above about the draw page's holes, `drawHoles`, `drawSheetBox`,
floaters putting the layer back, and the colour list painting its own back.** The colour is still one layer
over the window (`body::after`, screen), but what must keep its own colours is no longer cut out of it with
holes worked out frame by frame — a hole a frame late was every black flash. Instead:

- **The drawing's sheet lies over the layer** (`canvas` at z 2147483001; its box and toolbar are no longer
  stacking contexts, so it can).
- **Everything that lies over the sheet lies over it too, and carries its own copy of the layer**
  (`.own-layer`: `isolation` plus an `::after` with the same gradient, screen-blended within the box):
  the drawing's two windows, colour adjuster, corner marks and note (z 2147483004–6), and the site's floating
  things — help's note, the bin's list, the search's results, the colour list, the pages' names, the
  option-key label (z 2147483020). The page marks lie over the names (2147483021) — they are white, which
  needs no colouring; the filled one carries a copy. What in them keeps its colours (the game, the reference
  picture, the colour squares and dots) lies over the copy (z 60).
- **Each copy is pinned to where its box sits at rest** (`--at-x`/`--at-y`, `placeOwnLayers` /
  `restSpot` in script.js, from the layout, so a spring's scale or turn doesn't move it). Not
  `background-attachment: fixed`: inside anything scaled, turned or blurred that is drawn against the box.
  Placed again with every hole pass, on the drawing page's presses and drags, and on resize.
- **An own-layer box must be opaque across its whole shape**: the copy paints wherever the box is
  see-through. And **nothing inside it may move by transform** while it is shown (it gathers what is in it
  under the copy) — which is why the drawing adjuster's parts no longer slide in with a colour on.
- `--own-edge: 1px` where the box's outline is black (the drawing's adjuster and corner marks), so the
  copy covers the outline too. The drawing's windows clip their insides (the reference one has a resize
  corner, which needs `overflow: hidden`), so their outline is an inset shadow instead, inside the copy.
- The strip is no longer a stacking context (it held its lists under the layer); the bar the bin sits in and
  the search lost their z-index for the same reason. With the strip no longer over the bumps, the bumps and
  their outline (`.app-shell::after`/`::before`) start at the strip's foot (`top: var(--topbar)`) — they
  repeat upwards too, and showed through the strip beside `hi`.
- The draw page slides in without touching opacity: an opacity being animated gathers the page under the
  layer for the slide.
- Holes remain only for the chat's colour pictures (and are never cut while a refresh holds the page back).

## The front door

**The site's pointer is set inline in `app.html`'s head**, before
`style.css` arrives, so walking in from the front door never shows the
system arrow for a beat.

**The hint under the run keeps its height when empty** (`min-height`).
Emptied on the first press, it collapsed, the centred group re-centred,
and the whole run dropped a few pixels — the "glitch" on every start
and restart. A held key is one jump (`event.repeat` ignored), and a
crash can't be restarted for 350ms, so a jump pressed as it hits
doesn't restart it on the spot.

`start to start` (an inside joke — keep the wording) in Bitcount Prop Double, 2.1rem, lies over the run at its top, centred, with the score 36px above it; pressing it (or jumping) begins, and it is gone until the page is refreshed — not back after a crash. **The score never moves or goes away**: top centre, always `hi 0123 · 0045`, four digits each. 9999 is the top: reaching it ends the run with `u have passd` where `died` goes. That line sits exactly halfway between the ground line and the pill. **Nothing on this page animates except the enter pill and `start to start`** — no fades or slide-ins on the run or the page's arrival. `start to start` floats up and down like 8-bit art: two whole-pixel positions (0 and 3px up) it jumps between every 1.2s with `steps(1)`, never a glide — casual, not busy. The enter pill reads `^_^` (labelled `enter` for screen readers). **A smaller copy of home's search sits halfway between the ground line and the pill** (with `died` halfway between the ground and it) (`.seek`, 24rem wide, its go button just a black arrow — no circle — that nudges 2px right on hover and does nothing else, the site's 42px field height, its grey placeholder and type size): **it searches on the page itself, as you type** — it fetches `app.html` once, reads the same page roots home does, and lists the pages under the bar; a result is a link to that page's folder with `?spot=word`, and the page outlines where the word is on arrival. Arrow keys move through the results, Enter takes the highlighted one. Both search bars list results **the way chrome does**: the bar opens downward into one box, rows have no edges, and a row shows its outline only under the pointer (or when picked with the arrows) — nothing is outlined by default; Enter takes the first. Hidden when the page is framed under the home board.

`morie.top` is a tiny dino run and an `enter` pill that goes to
`home/`. **The enter pill sits at the exact middle of the screen**, the
run above it. It is black with white words; the white that grows in on hover carries `o_o` where the black carries `^_^`, so the face changes inside the white as it spreads; on hover **a white circle
grows out of the exact point the pointer came in** (`.enter-ink`, a white copy of the pill over the black one, uncovered by a
growing `clip-path` circle — a blended circle clipped by the rounded box left a
hairline of black along the edge as the pill moved), sized to just reach the far corner
from that point so the spread is seen the whole way (0.85s). Everything on the pill runs **at a casual pace** by request — the rise 0.45s, the hover wobble 0.9s, the press wiggle 0.8s. **The link never moves; the pill inside it does** (`.enter` is a still hit area 6px bigger than `.enter-pill` all round), so hovering at the edge doesn't flicker on and off as the pill slips out from under the pointer. On hover it
rises 3px with a small natural wobble (under a degree of tilt plus a pixel of drift, settling out); the pill is kept on its own layer (`will-change`, `backface-visibility`) because a tilted 1px outline otherwise broke up as it turned; the full wiggle plays on the press. Both are played from the script (`pill.animate`), not CSS: as CSS animations, letting go of a press restarted the hover one, and leaving mid-wobble snapped the tilt back. The circle is placed
first and grown after, by script: done with CSS `:hover` it started
growing before the pointer's position was known, which is why it
seemed to come from the middle. It listens for the first move as well
as the enter event. Don't name anything in that script `ink` — the game
already uses it for its colour, and the clash stopped the whole page. **Cacti are never closer than a jump can clear and land from with room to jump again** — the world's travel in one jump's air time at the current speed, plus a third, plus both widths, then a random stretch (they could come a jump apart at speed). **Leaving home resets the run** under it (`window.dinoReset`). One press after a crash both resets and runs
(it used to take two, which felt like a glitch). Space, up or a tap jumps; the best
score is kept under `front-dino` — written the moment it is beaten, so a refresh mid-run keeps it, and shared live (`storage` event) between the front door and the run framed under the home board. It belongs to the browser, not to a chat account. It is all inline in `index.html` and
does not load `style.css`, so the two cursor tokens are **copied** in
and must be copied again if they are redrawn. One bit: the art is
drawn in whole pixels on a canvas sized to the screen's pixel ratio, so
nothing is ever painted grey.

## One layout, shrunk to fit

By request, a phone, a tiny window and a computer zoomed right in all get
**the computer's layout, smaller**, never a re-arranged one. **1280px is the
floor** (it was 800, and between 800 and 1280 tiles and boxes squeezed —
the clock's digits ran out of their tile, the folder field shut up): anything
narrower is the 1280 layout shrunk, every part by the same amount. The inline script at the top of `app.html`'s head does it two ways:

- **a phone** (`screen.width < 1280`) has its viewport meta rewritten to
  `width=1280`, and the browser draws the page 1280 wide and fits it to the
  screen itself. Nothing else changes; the script sees a 1280px window.
- **a narrow or zoomed-in window on a computer** gets `zoom` on the root.
  Chrome's standard zoom hands back *on-screen* pixels from
  `getBoundingClientRect`, `clientX/Y` and `innerWidth`, while styles are
  written in the page's own — so those four (and `elementFromPoint`) are
  wrapped to divide the zoom back out, and the rest of `script.js` needed
  no change. `window.pageZoom()` reads it.

**`vh` and `vw` shrink with the zoom**, so every one in `style.css` is
written `calc(var(--vh, 1vh) * N)`; the head script sets `--vh`/`--vw` to
the real window. Write any new one the same way. **Every `max-width` media query was taken out** (the 1000px and 1100px ones too, which narrowed the bar and the tabs): a query reads the real window, not the
zoomed page, so they would re-arrange a page that is meant not to.

The front door does its own: the whole group is scaled about the pill's
middle (`--fit`) to fit the width and the half-height, so the spacing holds.

## Known limits — accepted, don't re-raise

- A speaker's interrupted turns can't be stitched back together.
- WebM seeking is approximate; there's no seek index.
- Chrome focuses the captured tab once when recording starts, and that can't be
  prevented.

## Files

- `CNAME` — the custom domain. See "the site's own address".
- `home/`, `cards/`, `audio/`, `chat/`, `draw/` — each a copy of
  `app.html`, written by `.githooks/pages.sh`. Never edit them by hand.
  See "a link per page".
- `404.html` — sends a stray path to its section, or to the front door.
- `.githooks/` — the pre-commit hook that keeps the copies in step.
- `draw.js` — the drawing app, built into the draw page (started the first
  time it is shown). `drawing/` holds only its pictures.
- `index.html` — the front door at `morie.top`: the dino run and the way
  in. See "the front door".
- `app.html` — the site itself, all of its screens
- `style.css` — numbered sections, see the table of contents at the top
- `script.js` — numbered sections, see the table of contents at the top
- `mp3-worker.js` — mp3 encoding, kept off the main thread
- `lame.min.js` — the mp3 encoder itself (lamejs 1.2.1), vendored rather than
  loaded from a CDN so downloads work offline. Only the worker loads it.
- `ocr/` — tesseract.js and its english data, for reading the words off a
  photo without a key. Vendored for the same reason as the rest. Nothing
  in here is fetched until a picture is actually read.
- `llm/` + `llm-worker.js` — web-llm, which runs the small model in the
  browser. Also lazy: nothing here loads until someone presses make
  flashcards without a key saved.

All of these need to be uploaded to GitHub Pages. Missing `mp3-worker.js` or
`lame.min.js` breaks downloads with a worker error that looks like a code bug.
