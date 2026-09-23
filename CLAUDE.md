# flahcard

A personal flashcard + audio site. Plain HTML/CSS/JS — no framework, no build
step. Lives on GitHub Pages.

## Working with me

I don't code. Apply edits directly to the files — don't hand me blocks of code
to paste, I won't paste them. Keep replies short and skip explanations of your
approach unless I ask.

Don't rewrite the sentences in the function box. Add to them when there's
something new, but leave the wording I wrote alone.

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
- Fonts: Amiko for body text, Bitcount Prop Double for the `h1` and the section
  tabs, **VT323 for every number**, Matrix Sans Print for every heading over a
  panel. Bitcount fills the gaps between its dots at bold, so it is set bold in
  exactly one place — the section tabs, by request — and nowhere else. Matrix Sans is capitals only; lowercase copy
  comes out as capitals, which is the point.

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

Switched by the tabs in the top strip.

**cards** — the original flashcard app. Decks with drag-reorder, right-click
rename and delete, undo with Ctrl+Z (and redo with Ctrl+Shift+Z or Ctrl+Y), a create screen, and a practice screen
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

**Exportify itself runs in the window.** Measured with `curl -I`: it
sends no `x-frame-options` and no `frame-ancestors`, so it can be
framed. `accounts.spotify.com` sends `x-frame-options: deny`, so the
**sign-in cannot be** — that once happens in a tab of its own, and
afterwards the frame knows you.

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
was only ever hidden by the next window opening over it. Any new window
has to be added in both places: `showScreen` and `closeModal`.

## Every clip into a folder

`download every clip` writes the mp3s straight into a folder — not
sixty-four downloads one after another, and not a zip nobody asked to
unpack.

**The asking is a window of this site's own**: a name, a strip of
places, and a press. `where to` opens on the download button; the press
inside it is what opens the picker, since a browser only opens one off a
press.

**`startIn` is the whole of what a page may say about where on the disk
it means.** The bubbles set it — `downloads`, `desktop`, `documents`,
`music` — and it opens the picker on that shelf. The yes itself is the
browser's to take, and only once: after it the place is remembered and
never asked again.

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

## The volume slides

A press anywhere along the line used to put the bead there in the same
instant — the one movement on the page that happened without happening.
The press is taken off the browser (`preventDefault`) and the bead is
driven by hand: it is always travelling towards where it has been asked
to be and arrives in about a tenth of a second. Under a finger that is
short enough to feel attached; across the whole line it reads as a
slide. The arrow keys are picked up as a new destination.

## The player's controls

Five round buttons in a row, and the row has to survive the narrowest
the panel can be dragged to — `.stage-side` has a 17rem floor, which
leaves 254px of content. At a `--group` between each of them they
needed 290px and the ends were cut off. They sit at 2.4rem (3.3rem for
play) with a `--tight` gap, which comes to 238px. The marks inside are
a share of the button, so they come down with it.

The volume speaker is three arcs, all drawn all the time and shown one
at a time. They open from the inside out and go quiet from the outside
in — same half-second either way, staggered 70ms apart. The ripple is
what makes it read as one thing happening rather than three pictures
swapping.

## The home board

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


Four columns of slots. Every widget keeps its own `col`/`row`, so it
stays exactly where it was put and the board does **not** close up gaps
behind it — that is the whole difference between arranging a board and
sorting a list, and the reason "you can't move anything down or right"
was true before. `untangle(anchor)` gives the anchor what it was
dropped on and pushes anything under it down; nothing is ever pulled
back up, because a gap you left is a gap you meant.

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

## The mark lands in the middle, and the word holds still

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

**The holding-back is set in the head, not the stylesheet**, so a page
whose script never runs is never left hidden. The same inline snippet
takes the class off after 2.5s whatever happens; `loadStoredClips()`
takes it off sooner when the store answers.

## One entrance for every section

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

**Holding option** names whatever is under the pointer, beside it, in
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

The clip list always keeps at least half the row — `keepOther: 50` on
its splitter, not a `max`, so the grip and the gap are measured rather
than assumed.

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
