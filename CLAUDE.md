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

**chat** — sealed messages between people who add each other.

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
was only ever hidden by the next window opening over it. Any new window
has to be added in both places: `showScreen` and `closeModal`.

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

**Narrow, the bar loses width before it loses contents**: 19rem, then
15rem under 1000px, and under 760px it lies down under the page at a
third of the height rather than disappearing. It used to be hidden
outright at that width, which was fine when it was empty and is not
now.

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
`--wave-out + 10px` — the boxes sit 10px off the crests. 4px was tried
and read as jammed against them. Under 760px,
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
request the words are **centred and larger** rather than Apple's
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
with, and only the people you added are shown. Right-click drops
someone; nothing is deleted anywhere, and adding them back brings the
thread with them.

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

**Bumping `CHAT_ERA` is the reset.** There is no way to delete a post
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

**The door says what it is doing.** Making an account is three slow
things in a row — the board, a key pair, and the pbkdf2 wrapping — and
in silence that reads as a press that did nothing, which is how you
get two accounts. The button carries the state (`checking the name…`,
`making your keys…`) and is locked while it holds it, along with the
swap beside it. `paintChatDoor` returns early while it is busy, or it
would paint the label back.

**Signed out, the chat is a log-in screen** — a centred card with a
picture mark, `welcome back` / `make an account`, the username and
password fields and the button right there on the page. It is the same
form as the log-in window, carried onto the page (`placeDoor`) and back
into the window when `add account` needs it, so there is one form and
one set of listeners.

**Signed in, the chat is always laid out as a messaging app**,
nobody added or not — by request, after an empty page with things
floating in the middle read as unfinished. Two outlined panes:

- **The list (left)**: `chats` with a count, a `find or add someone`
  field, `direct messages`, then one row per person — picture, name,
  the last line (`you: …` if yours) and its time, WhatsApp-style. With
  nobody yet it shows three dashed placeholder rows and a line saying
  what to do.
- **The talk (right)**: a header with the open person's picture, name
  and handle and the `sealed` chip. With no thread open it shows a
  greeting (`hi, <nickname>` or `chat` with log in / sign up when signed
  out) and three cards — add someone, pick a picture, sealed both ways —
  from the top-left. An open thread starts like Discord's: a big
  picture, the name, and "this is the start of your messages with …".
  The box at the bottom reads `message @name`.

**Your account is a round picture in the top-right corner** of the
chat (the end of the thread header) — kept there on purpose, since that
is where every other site puts it; a card at the foot of the list was
tried and read as confusing. It opens the account panel under it. The panel is
Google-style: a
large round picture at the top with a pencil on it — **pressing it
opens account settings** (there is no separate settings button) — your
nickname large under it with `@username` small, then **every account
logged in on this browser** as a list (the one in use filled black,
each with a three-dot menu holding `remove`), a small `add account` at
the right, and `log out` at the foot. **Log out asks inside its
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
Every box on a page sits one `--group` (16px) from the next — the deck
bar, the audio bar and the clip toolbar used `--tight` between their
boxes and now don't.

- **Username** is `a–z 0–9 _ - .` only, lowercased, up to 24
  (`NAME_OK`), checked on sign-up and on rename. Existing accounts from
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
minutes (`SAME_BREATH`) grouped under one head. A grouped line shows
its own short time in the left gutter on hover, and the hovered row
gets a dotted outline — Discord's hover is a grey wash, which isn't
allowed here. Your own messages look the same as everyone else's, as
in Discord; the filled mark that used to tell them apart is gone.

Verified end to end on the proxied machine, two separate browsers:
sealed both ways, each read the other's, and from outside the board the
messages are opaque base64 with none of the words in them.

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

`morie.top` is a tiny dino run and an `enter` pill that goes to
`home/`. **The enter pill sits at the exact middle of the screen**, the
run above it. It is black with white words; on hover white wipes out
from its middle as a `mix-blend-mode: difference` layer — so the words
flip with it and no frame is ever grey — and it lifts and wiggles like
the create/practice tiles. One press after a crash both resets and runs
(it used to take two, which felt like a glitch). Space, up or a tap jumps; the best
score is kept under `front-dino`. It is all inline in `index.html` and
does not load `style.css`, so the two cursor tokens are **copied** in
and must be copied again if they are redrawn. One bit: the art is
drawn in whole pixels on a canvas sized to the screen's pixel ratio, so
nothing is ever painted grey.

## Known limits — accepted, don't re-raise

- A speaker's interrupted turns can't be stitched back together.
- WebM seeking is approximate; there's no seek index.
- Chrome focuses the captured tab once when recording starts, and that can't be
  prevented.

## Files

- `CNAME` — the custom domain. See "the site's own address".
- `home/`, `cards/`, `audio/`, `chat/` — each a copy of
  `app.html`, written by `.githooks/pages.sh`. Never edit them by hand.
  See "a link per page".
- `404.html` — sends a stray path to its section, or to the front door.
- `.githooks/` — the pre-commit hook that keeps the copies in step.
- `index.html` — the front door at `morie.top`: the dino run and the way
  in. See "the front door".
- `app.html` — the site itself, all of its screens
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
