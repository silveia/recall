/* ============================================================
   recall — script.js
   ------------------------------------------------------------
   1. elements
   2. state
   3. storage
   4. sections   (the home / cards / audio / chat tabs)
   5. decks      (the list, and the split beside it)
   6. cards      (the create window)
   7. practice   (the practice window)
   8. context menu
   9. keyboard
   10. wiring    (includes deck codes — copy one out, paste one in)
   11. start     (called once the home widgets are wired, in section 15)
   12. capture, sensing, recording   (the audio section)
         status · sensing box · change detection
         clip storage · mp3 export · clip rows
         recording · level meter · capture
   13. (the player was here; only clockFace is left)
   14. the bar's own three   (clock · storage · recently binned)
   15. home widgets   (the home page, yours to arrange)
   16. notes → cards  (under the deck; reads notes, or asks claude)
   17. scratch        (the playlist box beside the clips)
   18. option, and what things do
   19. chat
   ============================================================ */

/* ---------- 1. elements ---------- */

// screens
const homeScreen = document.getElementById('homeScreen');
const modalVeil = document.getElementById('modalVeil');
const makerScreen = document.getElementById('makerScreen');
const studyScreen = document.getElementById('studyScreen');
const notesScreen = document.getElementById('notesScreen');
const listScreen = document.getElementById('listScreen');

// sections
const sectionTabs = document.getElementById('sectionTabs');
// the name in the top-left corner is the way home, like every site's name is
document.getElementById('siteName').addEventListener('click', (event) => {
    event.preventDefault();
    hideTabTip();
    switchSection('home');
});
const audioPanel = document.getElementById('audioPanel');
const chatPanel = document.getElementById('chatPanel');
const drawPanel = document.getElementById('drawPanel');
const drawFrame = document.getElementById('drawFrame');
let chatSplitter = null;
let chatReady = false;

// decks
const deckListSlot = document.getElementById('deckListSlot');
const homePanel = document.getElementById('homePanel');
const homeBody = document.getElementById('homeBody');
const appContent = document.querySelector('.app-content');
const paneSplit = document.getElementById('paneSplit');
const cardSide = document.querySelector('.card-side');
const deckCardList = document.getElementById('deckCardList');
const sharePanel = document.getElementById('sharePanel');
const shareToggle = document.getElementById('shareToggle');
const shareOut = document.getElementById('shareOut');
const shareIn = document.getElementById('shareIn');
const shareNote = document.getElementById('shareNote');
const helpBox = document.querySelector('.help-box');
const clockTime = document.getElementById('clockTime');
const clockSuffix = document.getElementById('clockSuffix');
const themeSwap = document.getElementById('themeSwap');
const clockDate = document.getElementById('clockDate');
const railBinned = document.getElementById('railBinned');
const binnedList = document.getElementById('binnedList');
const binnedCount = document.getElementById('binnedCount');
const binnedEmpty = document.getElementById('binnedEmpty');
// pressing empty asks in place: the pill splits down its middle into two halves — its outer ends never
// move, only the centre opens — a cross (keep it) on the left and a tick (empty it) on the right. the
// confirm chip it replaces opened behind the bin's own list
const emptyAsk = document.createElement('span');
emptyAsk.className = 'empty-ask';
emptyAsk.innerHTML = '<button class="empty-no" type="button" title="keep it" aria-label="keep it" tabindex="-1">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button>'
    + '<button class="empty-yes" type="button" title="empty it" aria-label="empty it" tabindex="-1">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 12.5l4 4 8-9"/></svg></button>';
emptyAsk.prepend(binnedEmpty);
const emptyYes = emptyAsk.querySelector('.empty-yes');
const emptyNo = emptyAsk.querySelector('.empty-no');
const EMPTY_GAP = 6;          // how far apart the two halves end up, at the centre only
let emptyMoves = [];          // the split's running animations, kept so going back plays them in reverse
let emptyAsking = false;
function askToEmpty(on, quick) {
    if (on === emptyAsking && !quick) return;
    emptyAsking = on;
    emptyYes.tabIndex = emptyNo.tabIndex = on ? 0 : -1;
    binnedEmpty.tabIndex = on ? -1 : 0;
    const parts = [emptyNo, emptyYes, emptyNo.querySelector('svg'), emptyYes.querySelector('svg')];
    const settle = () => {
        emptyMoves.forEach((move) => move.cancel());
        emptyMoves = [];
        parts.forEach((part) => part.removeAttribute('style'));
        emptyAsk.classList.remove('is-asking', 'is-leaving');
    };
    if (quick) { emptyAsking = false; settle(); return; }
    if (!on) {
        // a motion of its own rather than the opening played backwards (which turned its spring into a
        // jerk): the marks shrink away, then the halves glide back into the one pill on a plain ease,
        // from wherever they are, and the word fades back in as they meet
        emptyAsk.classList.add('is-leaving');
        emptyMoves.forEach((move) => { try { move.commitStyles(); } catch (error) { /* not drawn */ } move.cancel(); });
        const join = binnedEmpty.offsetWidth / 2;
        const close = (inner) => [
            { offset: 0.85, [`border${inner}Width`]: '1px' },
            { width: `${join}px`, [`border${inner}Width`]: '0px', [`borderTop${inner}Radius`]: '0px', [`borderBottom${inner}Radius`]: '0px', transform: 'scaleY(1)' }
        ];
        const glide = { duration: 360, delay: 90, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' };
        const markOut = [{ opacity: 0, transform: 'scale(0.4)' }];
        emptyMoves = [
            emptyNo.animate(close('Right'), glide),
            emptyYes.animate(close('Left'), glide),
            parts[2].animate(markOut, { duration: 140, easing: 'ease-in', fill: 'forwards' }),
            parts[3].animate(markOut, { duration: 140, easing: 'ease-in', fill: 'forwards' })
        ];
        emptyMoves[0].finished.then(() => { if (!emptyAsking) settle(); }).catch(() => {});
        return;
    }
    emptyMoves.forEach((move) => move.cancel());
    parts.forEach((part) => part.removeAttribute('style'));
    emptyMoves.forEach((move) => move.cancel());
    emptyAsk.classList.remove('is-leaving');
    emptyAsk.classList.add('is-asking');
    // each half starts as exactly half of the pill, its inner edge square and not there at all (no
    // width, so nothing fades through gray and nothing notches the seam), and ends as a
    // pill of its own: narrower by half the gap, its inner end rounded off, pinching softly on the way
    // like a bubble parting in two
    const whole = binnedEmpty.offsetWidth;
    const from = whole / 2;
    const to = (whole - EMPTY_GAP) / 2;
    const end = `${emptyNo.offsetHeight / 2}px`;
    const split = (inner) => [
        { width: `${from}px`, [`border${inner}Width`]: '0px', [`borderTop${inner}Radius`]: '0px', [`borderBottom${inner}Radius`]: '0px', transform: 'scaleY(1)' },
        { offset: 0.2, [`border${inner}Width`]: '1px' },
        { offset: 0.35, transform: 'scaleY(0.92)' },
        { width: `${to}px`, [`border${inner}Width`]: '1px', [`borderTop${inner}Radius`]: end, [`borderBottom${inner}Radius`]: end, transform: 'scaleY(1)' }
    ];
    // one soft pinch as they part and a slight overshoot as they settle — a single motion, no wobble
    // (three alternating squashes in half a second read as a shake)
    const timing = { duration: 480, easing: 'cubic-bezier(0.34, 1.3, 0.5, 1)', fill: 'both' };
    // the marks come in on their own once the halves have parted: a small pop and a quarter turn
    const markIn = [
        { opacity: 0, transform: 'scale(0.3) rotate(-90deg)' },
        { offset: 0.7, opacity: 1, transform: 'scale(1.15) rotate(8deg)' },
        { opacity: 1, transform: 'scale(1) rotate(0deg)' }
    ];
    emptyMoves = [
        emptyNo.animate(split('Right'), timing),
        emptyYes.animate(split('Left'), timing),
        emptyNo.querySelector('svg').animate(markIn, { duration: 300, delay: 200, easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)', fill: 'both' }),
        emptyYes.querySelector('svg').animate(markIn, { duration: 300, delay: 260, easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)', fill: 'both' })
    ];
}
const deckForm = document.getElementById('deckForm');
const deckNameInput = document.getElementById('deckNameInput');

// cards
const cardForm = document.getElementById('cardForm');
const questionInput = document.getElementById('questionInput');
const answerInput = document.getElementById('answerInput');
const cardFormNote = document.getElementById('cardFormNote');
const cardList = document.getElementById('cardList');
const cardSubmitButton = document.getElementById('cardSubmitButton');
const optionsToggle = document.getElementById('optionsToggle');
const optionsPanel = document.getElementById('optionsPanel');
const optionsPicks = document.getElementById('optionsPicks');

// practice
const studyQuestion = document.getElementById('studyQuestion');
const answerOptions = document.getElementById('answerOptions');
const studyFeedback = document.getElementById('studyFeedback');

// misc
const contextMenu = document.getElementById('contextMenu');

// audio level meter
const levelCanvas = document.getElementById('levelCanvas');
const levelContext = levelCanvas.getContext('2d');

/* ---------- 2. state ---------- */

// words handed over by the front door's search, read before anything tidies the address bar
const ARRIVED_WITH = (() => {
    try {
        const asked = new URLSearchParams(window.location.search);
        return { spot: (asked.get('spot') || '').trim().toLowerCase(), find: (asked.get('find') || '').trim() };
    } catch (error) { return { spot: '', find: '' }; }
})();

const sections = [
    { id: 'home', name: 'home' },
    { id: 'cards', name: 'card' },
    { id: 'audio', name: 'clip' },
    { id: 'draw', name: 'draw' },
    { id: 'chat', name: 'chat' }      // last in the bar, by request
];

let decks = [
    {
        id: 'starting-deck',
        name: 'starting deck',
        cards: [
            { question: '1+1', answer: '2' },
            { question: '2+2', answer: '4' },
            { question: '3+3', answer: '6' },
            { question: '4+4', answer: '8' }
        ]
    }
];

let activeSectionId = 'home';
let activeDeckId = 'starting-deck';
let recentQuestions = [];
let currentCard;
// practice learns a little from you: how long each card takes and how often it is missed tilt the
// draw towards it — never far (a card is at most about three times as likely), and every card is
// still asked at least once in every two rounds of the deck
let askedThisRound = new Set();
let roundTurns = 0;
let questionShownAt = 0;
function cardWeight(card, cards) {
    const kept = card.stats || {};
    const times = cards.map((one) => one.stats && one.stats.ms).filter(Boolean).sort((a, b) => a - b);
    const typical = times.length ? times[Math.floor(times.length / 2)] : 0;
    const slow = typical && kept.ms ? Math.max(0, Math.min(1, kept.ms / typical - 1)) : 0;
    const missed = Math.max(0, Math.min(1, kept.miss || 0));
    return 1 + 1.3 * missed + 0.6 * slow;
}
function pickWeighted(cards, all) {
    const weights = cards.map((card) => cardWeight(card, all));
    let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0);
    for (let at = 0; at < cards.length; at += 1) {
        roll -= weights[at];
        if (roll <= 0) return cards[at];
    }
    return cards[cards.length - 1];
}
function noteAnswer(card, right) {
    if (!card) return;
    const took = Math.min(60000, Math.max(0, performance.now() - questionShownAt));
    const kept = card.stats || (card.stats = {});
    kept.seen = (kept.seen || 0) + 1;
    kept.ms = kept.ms ? Math.round(kept.ms * 0.7 + took * 0.3) : Math.round(took);
    kept.miss = Number(((kept.miss || 0) * 0.7 + (right ? 0 : 0.3)).toFixed(3));   // recent misses count most
    saveDecks();
}
let waitingForContinue = false;
let editingCardIndex = null;
let pendingOptions = new Set();
let editingDeckId = null;
let deletedStack = [];
let redoStack = [];
const BIN_DB = 'recall-bin';
const BIN_STORE = 'binned';
const BIN_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

let audioContext = null;
let analyser = null;
let levelFrame = null;
let levelData = null;
const MIN_CLIP_MS = 2000;   // clips shorter than this are thrown away
let clipCount = 0;
let lastCutAt = 0;
let recorderReady = false;

function activeDeck() {
    return decks.find((deck) => deck.id === activeDeckId) || decks[0];
}

/* ---------- 3. storage ---------- */

const dbOpening = {};

function openDb(name, store, keyed) {
    dbOpening[name] = dbOpening[name] || new Promise((resolve, reject) => {
        const request = window.indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, keyed ? { keyPath: 'id' } : undefined);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbOpening[name];
}

function readAll(db, store) {
    return new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function saveDecks() {
    paintWidgets();
    window.localStorage.setItem('flashcard-decks', JSON.stringify(decks));
    window.localStorage.setItem('flashcard-active-deck', activeDeckId);
}

function loadDecks() {
    const savedDecks = window.localStorage.getItem('flashcard-decks');
    const savedActiveDeck = window.localStorage.getItem('flashcard-active-deck');
    if (!savedDecks) return;

    try {
        const parsedDecks = JSON.parse(savedDecks);
        if (Array.isArray(parsedDecks) && parsedDecks.length > 0) {
            decks = parsedDecks.map((deck) => ({
                id: deck.id || `deck-${Math.random().toString(36).slice(2)}`,
                name: deck.name || 'untitled deck',
                look: Number.isInteger(deck.look) ? deck.look : undefined,
                cards: Array.isArray(deck.cards) ? deck.cards : []
            }));
            if (decks.some((deck) => deck.id === savedActiveDeck)) activeDeckId = savedActiveDeck;
            else activeDeckId = decks[0].id;
        }
    } catch (error) {
        window.localStorage.removeItem('flashcard-decks');
        window.localStorage.removeItem('flashcard-active-deck');
    }
}

/* --- a page per section, in the address bar --- */
const SITE_ROOT = window.location.pathname
    .replace(/\/[^/]*\.html$/, '')
    .replace(/\/+$/, '')
    .replace(new RegExp(`/(${sections.map((section) => section.id).join('|')})$`), '');

const isSection = (id) => sections.some((section) => section.id === id);

function sectionLink(id) {
    return `${SITE_ROOT}/${id}/`;
}

function writeLink(how, id) {
    try {
        window.history[how]({ section: id }, '', sectionLink(id));
    } catch (error) {
        // file://, or a browser that won't have it. the page still works
    }
}

function askedForSection() {
    const asked = new URLSearchParams(window.location.search).get('go');
    if (isSection(asked)) return asked;
    const last = window.location.pathname.split('/').filter(Boolean).pop();
    if (isSection(last)) return last;
    return null;
}

function loadSection() {
    const saved = window.localStorage.getItem('active-section');
    if (isSection(saved)) activeSectionId = saved;
    const asked = askedForSection();
    if (asked) activeSectionId = asked;
    writeLink('replaceState', activeSectionId);
}

// the back button walks the sections, the way it walks anything else
window.addEventListener('popstate', (event) => {
    const want = (event.state && event.state.section) || askedForSection() || 'home';
    if (!isSection(want) || want === activeSectionId) return;
    activeSectionId = want;
    window.localStorage.setItem('active-section', activeSectionId);
    renderSections();
});

function stopGuessing(field) {
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.setAttribute('autocorrect', 'off');
    field.setAttribute('autocapitalize', 'off');
    return field;
}

/* ---------- 4. sections ---------- */

function switchSection(id) {
    if (isModalOpen()) showScreen(homeScreen);   // tabs work from anywhere
    if (id === activeSectionId) return;
    activeSectionId = id;
    window.localStorage.setItem('active-section', activeSectionId);
    writeLink('pushState', id);
    renderSections();
}

// one simple mark per page, drawn in the site's own hairline
const PAGE_MARKS = {
    home: '<path d="M4 11.5 12 5l8 6.5M6.5 10v9.5h11V10"/>',
    cards: '<rect x="4.5" y="8" width="15" height="11" rx="1.5"/><path d="M7 5h10"/>',   // a card, one line behind it: as plain as the pencil
    audio: '<path d="M8 9v6M12 5v14M16 9v6"/>',   // three bars, as plain as the pencil
    chat: '<path d="M20 11.5c0 3.9-3.6 7-8 7-1.1 0-2.2-.2-3.1-.6L4.5 19.5l1.3-3.6C4.7 14.7 4 13.2 4 11.5c0-3.9 3.6-7 8-7s8 3.1 8 7z"/>',   // a round bubble, by request
    draw: '<path d="M5 19l1-4L16 5l3 3L9 18z"/>'   // a pencil, one plain outline and nothing else, by request
};
const pageMark = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PAGE_MARKS[id] || ''}</svg>`;

// resting on a page's mark for half a second pushes its bump out to the right with the page's name
// in it, and leaving lets it slide back in. the shape grows out of the bump itself, so it reads as
// the bar reaching out, not as a label laid on top. both ways are animated from wherever it is
const TIP_WAIT = 500;    // the first one waits half a second, by request
const TIP_WARM = 300;    // after one has gone in, the next within this long comes straight away
// shut is the bump itself: the same arc the bar's edge is drawn with (the tile's 37.5 of 39, scaled
// to the bump), so the shape starts as exactly the bump and pushes out of it. open is the shape's own
// round end. the curve travels from one to the other as an arc the whole way — a rounded inset clip
// squashed its corners while it was short, and the front edge never matched the bump
const tips = new Map();  // each page's name out (or on its way in or out): { el, line, word, at (0 shut, 1 open), frame, sx, sy }
let tipTimer = 0;
let tipColdAt = 0;       // when the last one finished going in
// the name's face is only fetched the first time something uses it, so ask for it up front
if (document.fonts) document.fonts.load(`700 1.15rem ${getComputedStyle(document.documentElement).getPropertyValue('--title-font')}`).catch(() => {});
// the slide's ease, cubic-bezier(0.45, 0, 0.2, 1), worked out by hand since the shape is drawn by hand
function tipEase(t) {
    const x1 = 0.45, x2 = 0.2;
    const at = (u, a, b) => 3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
    let lo = 0, hi = 1, u = t;
    for (let i = 0; i < 24; i += 1) { u = (lo + hi) / 2; if (at(u, x1, x2) < t) lo = u; else hi = u; }
    return at(u, 0, 1);
}
// the shape at a point between shut (0) and open (1). shut it is exactly the bump; within the first
// fifth of the way out its front has become the same half circle it ends as, and from there it simply
// slides — part way out it was a shallower arc than the open shape's, and read as a different shape.
// the front's leading point moves evenly the whole way, whatever the curve is doing. where the curve
// meets the straight top and bottom there is a small round join, so no corner shows while the curve
// is still wider than the shape is tall (an arc like that meets a straight line at an angle)
const smooth = (t) => t * t * (3 - 2 * t);
// its size, read once a slide rather than every frame (read straight after a frame's drawing, it made
// the browser work the styles out again first)
function measureTip(tip) {
    tip.w = tip.el.offsetWidth;
    tip.h = tip.el.offsetHeight;
}
function drawTip(tip) {
    const { el, line, sx, sy, w, h } = tip;
    const end = h / 2, p = tip.at;
    // in the dark the white edge has to land on the bump's own outline when shut (drawn at 6.61, 1px
    // wide), or the two show side by side as one thick line as it leaves and arrives
    const dark = document.documentElement.classList.contains('inverted');
    const x0 = dark ? 6.61 * sx + 0.5 : 6 * sx;
    const q = smooth(Math.min(1, p / 0.2));
    const rx = 37.5 * sx + (end - 37.5 * sx) * q;
    const ry = 37.5 * sy + (end - 37.5 * sy) * q;
    const bulge = (rxNow, ryNow) => rxNow * (1 - Math.sqrt(Math.max(0, 1 - (end / ryNow) ** 2)));
    const lead = x0 + bulge(37.5 * sx, 37.5 * sy) + (w - x0 - bulge(37.5 * sx, 37.5 * sy)) * p;
    const x = Math.max(x0, lead - bulge(rx, ry));
    // the join, worked out with the arc squared up to a circle (x over k), then stretched back
    const k = rx / ry;
    const R = ry;
    const cx = x / k - Math.sqrt(Math.max(0, R * R - end * end));
    const grow = Math.min(1, p / 0.05);
    const f = Math.min(16, R - 0.01) * smooth(grow);
    const fx = cx + Math.sqrt(Math.max(0, (R - f) ** 2 - (end - f) ** 2));
    const t = R / (R - f);
    const jx = (cx + (fx - cx) * t) * k;              // where the join meets the arc, top and bottom
    const jy = end + (f - end) * t;
    const n = (v) => v.toFixed(2);
    const d = `M0 0 H${n(fx * k)} A${n(f * k)} ${n(f)} 0 0 1 ${n(jx)} ${n(jy)}`
        + ` A${n(rx)} ${n(ry)} 0 0 1 ${n(jx)} ${n(h - jy)}`
        + ` A${n(f * k)} ${n(f)} 0 0 1 ${n(fx * k)} ${h} H0`;
    el.style.clipPath = `path('${d} Z')`;
    // the white edge in the dark rides the same curve, so it is never left behind at the far end
    line.setAttribute('d', d);
    // the name waits until the shape is half out, then fades in on its own clock (a fade tied to the
    // slide ran through the slide's fastest stretch and read as appearing); going back it fades out
    tip.word.classList.toggle('is-shown', p >= 0.5);
}
function moveTip(tip, to, then) {
    // always from wherever it is now, so turning back half way is a turn, never a jump
    window.cancelAnimationFrame(tip.frame);
    measureTip(tip);
    const from = tip.at;
    const long = (to ? 380 : 300) * Math.max(0.35, Math.abs(to - from));
    const start = performance.now();
    const step = (now) => {
        const t = Math.min(1, (now - start) / long);
        tip.at = from + (to - from) * tipEase(t);
        drawTip(tip);
        if (t < 1) tip.frame = window.requestAnimationFrame(step);
        else { tip.frame = 0; if (then) then(); }
    };
    tip.frame = window.requestAnimationFrame(step);
}
// a page's name goes back in on its own, and the shape is taken away once it is in
function shutTip(id) {
    const tip = tips.get(id);
    moveTip(tip, 0, () => {
        tip.el.remove();
        tips.delete(id);
        if (!tips.size) tipColdAt = performance.now();
    });
}
// a mark's name comes out — turning round from wherever it is if it was on its way in — and any
// other one out goes back in on its own while it does, rather than being snatched away
function openTabTip(tab, name) {
    const id = tab.dataset.section;
    tips.forEach((tip, other) => { if (other !== id) shutTip(other); });
    let tip = tips.get(id);
    if (!tip) {
        const el = document.createElement('div');
        el.className = 'tab-tip';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = `<svg><path/></svg><span>${name}</span>`;
        document.body.append(el);
        const spot = tab.getBoundingClientRect();
        el.style.top = `${Math.round(spot.top + spot.height / 2 - el.offsetHeight / 2)}px`;
        // the shape starts where a bump tile does, so the bump's arc goes in at the same numbers
        const shell = getComputedStyle(document.documentElement);
        tip = {
            el, line: el.querySelector('path'), word: el.querySelector('span'), at: 0, frame: 0,
            sx: parseFloat(shell.getPropertyValue('--wave-w')) / 39,
            sy: parseFloat(shell.getPropertyValue('--wave-h')) / 66
        };
        tips.set(id, tip);
        measureTip(tip);
        drawTip(tip);
    }
    moveTip(tip, 1);
}
function hideTabTip() {
    window.clearTimeout(tipTimer);
    tips.forEach((tip, id) => shutTip(id));
}
function waitForTip(tab, name) {
    window.clearTimeout(tipTimer);
    // one already out, or only just gone in: going from mark to mark carries on with no wait
    if (tips.size || performance.now() - tipColdAt < TIP_WARM) openTabTip(tab, name);
    else tipTimer = window.setTimeout(() => openTabTip(tab, name), TIP_WAIT);
}

// a page arriving: the whole page slides a short way in, the same on every page, from the side of the
// bar its mark is on — a page whose mark is lower than the one you left comes up from below, a higher
// one comes down from above — and fades in as it travels. a refresh doesn't move at all
let unfoldedSection = null;
function unfoldSection(force) {
    if (document.documentElement.classList.contains('booting')) return;   // the boot calls this once it is shown
    if (!force && unfoldedSection === activeSectionId) return;
    const order = sections.map((one) => one.id);
    const from = order.indexOf(unfoldedSection);
    const to = order.indexOf(activeSectionId);
    const way = from < 0 || to > from ? 1 : -1;      // 1: from below, -1: from above
    unfoldedSection = activeSectionId;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    homeScreen.getAnimations().forEach((move) => { if (move.id === 'unfold') move.cancel(); });
    const move = homeScreen.animate([
        { opacity: 0, transform: `translateY(${way * 40}px)` },
        { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    move.id = 'unfold';
}

function renderSections() {
    // show only the panels belonging to the active section
    homePanel.hidden = activeSectionId !== 'home';
    homeBody.hidden = activeSectionId !== 'cards';
    helpBox.querySelectorAll('.help-note').forEach((note) => {
        note.hidden = note.dataset.section !== activeSectionId;
    });
    if (activeSectionId !== 'cards') closeSharePanel();
    audioPanel.hidden = activeSectionId !== 'audio';
    chatPanel.hidden = activeSectionId !== 'chat';
    drawPanel.hidden = activeSectionId !== 'draw';
    // the drawing app is only loaded the first time its page is shown: loaded while hidden it measures
    // its canvas as nothing, and keeps that size
    if (activeSectionId === 'draw' && !drawFrame.src) drawFrame.src = drawFrame.dataset.src;
    if (activeSectionId === 'chat' && chatReady) wakeChat();
    if (activeSectionId !== 'audio' && recorderReady) stopCapture();
    if (activeSectionId !== 'audio') openSensing(false);
    if (activeSectionId !== 'chat' && chatReady) closeAccount();

    const shown = {
        cards: [deckSplit, notesSplit],
        audio: [clipSplitter],
        chat: [chatSplitter]
    }[activeSectionId] || [];
    shown.forEach((one) => { if (one) one.reclamp(); });

    if (!sectionTabs.children.length) {
        sections.forEach((section) => {
            const tab = document.createElement('button');
            tab.className = 'section-tab';
            tab.type = 'button';
            tab.dataset.section = section.id;
            tab.setAttribute('aria-label', section.name);
            tab.innerHTML = pageMark(section.id);
            tab.addEventListener('click', () => { hideTabTip(); switchSection(section.id); });
            // rest on it half a second and the name slides out of its bump; leave and it slides back
            tab.addEventListener('pointerenter', () => waitForTip(tab, section.name));
            tab.addEventListener('pointerleave', hideTabTip);
            sectionTabs.appendChild(tab);
        });
    }
    sectionTabs.querySelectorAll('.section-tab').forEach((tab) => {
        const active = tab.dataset.section === activeSectionId;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-current', active ? 'page' : 'false');
    });
    unfoldSection();
}

/* ---------- 5. decks ---------- */

// the code on show always belongs to the deck on show
function refreshShareForActiveDeck() {
    if (!sharePanel.hidden) refreshShareCode();
}

const LOOK_COUNT = 8;

const DECK_SHAPES = [
    '<circle cx="14" cy="14" r="9"/>',
    '<rect x="5" y="5" width="18" height="18" rx="2"/>',
    '<path d="M14 4.5 24 22.5H4z"/>',
    '<path d="M14 4 24 14 14 24 4 14z"/>',
    '<path d="M14 4.5l2.9 6.4 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L4.2 11.7l6.9-.8z"/>',
    '<path d="M14 23.5S4.5 17.8 4.5 11.4a4.9 4.9 0 0 1 9.5-1.8 4.9 4.9 0 0 1 9.5 1.8c0 6.4-9.5 12.1-9.5 12.1z"/>',
    '<path d="M14 4l8.7 5v10L14 24l-8.7-5V9z"/>',
    '<path d="M8 21h9.5a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.3-1.6A4.2 4.2 0 0 0 8 21z"/>'
];

function shapeFor(deck) {
    return `<svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" stroke-linecap="round"
        aria-hidden="true">${DECK_SHAPES[lookFor(deck)]}</svg>`;
}

function lookFor(deck) {
    if (Number.isInteger(deck.look)) return ((deck.look % LOOK_COUNT) + LOOK_COUNT) % LOOK_COUNT;
    let sum = 0;
    for (let i = 0; i < deck.id.length; i += 1) sum = (sum * 31 + deck.id.charCodeAt(i)) % 9973;
    return sum % LOOK_COUNT;
}

let deckCardsShape = '';
let deckArrivalTimer = 0;

function deckCardsShapeNow() {
    return decks.map((deck) => `${deck.id}:${deck.name}:${lookFor(deck)}:${deck.cards.length}:${deck.cards[0] ? deck.cards[0].question : ''}`).join('|');
}

function renderDeckCards() {
    const shape = deckCardsShapeNow();
    if (shape === deckCardsShape && deckListSlot.children.length === decks.length) {
        [...deckListSlot.children].forEach((entry) => {
            entry.classList.toggle('active-deck', entry.dataset.deckId === activeDeckId);
        });
        return;
    }
    deckCardsShape = shape;
    deckListSlot.innerHTML = '';
    // only a rebuild cascades — a reorder keeps every card on screen
    deckListSlot.classList.add('is-arriving');
    window.clearTimeout(deckArrivalTimer);
    deckArrivalTimer = window.setTimeout(() => {
        deckListSlot.classList.remove('is-arriving');
    }, 600);
    decks.forEach((deck) => {
        const entry = document.createElement('button');
        entry.className = `deck-card${deck.id === activeDeckId ? ' active-deck' : ''}`;
        entry.type = 'button';
        entry.dataset.deckId = deck.id;

        const swatch = document.createElement('span');
        swatch.className = 'deck-shape';
        swatch.innerHTML = shapeFor(deck);

        const text = document.createElement('span');
        text.className = 'deck-card-text';

        const name = document.createElement('strong');
        name.textContent = deck.name;

        const detail = document.createElement('small');
        const total = deck.cards.length;
        const count = `${total} card${total === 1 ? '' : 's'}`;
        detail.textContent = total === 0 ? count : `${count} · ${deck.cards[0].question}`;

        text.append(name, detail);
        entry.append(swatch, text);
        entry.addEventListener('pointerdown', (event) => armDeckLift(entry, event));
        entry.addEventListener('click', () => {
            if (deckWasDragged) return;   // that press was a reorder, not a pick
            if (deck.id === activeDeckId) return;
            activeDeckId = deck.id;
            renderDecks();
            renderCards();
            saveDecks();
        });
        deckListSlot.appendChild(entry);
    });
}

let editingStageIndex = null;
let editingStageField = 'question';   // which line of it took the caret

/* --- a draggable divider between two panes --- */

// least / leastOther: the smallest each side may be, in pixels (a number or a function), so its
// heading is still whole. With snap, pulling a side past its least shuts it instead — halfway
// past and it goes, short of that it holds at the least — so a pane is either readable or gone.
function wireSplit({ split, body, other, key, pane, fromRight, keepOther,
                     down, skinAt = 68, max = 75, fallback = 50, least = 0, leastOther = 0,
                     snap = false, onDrag }) {
    if (!split || !body || !other || !pane) return null;

    const across = (box) => (down ? box.height : box.width);
    const near = (box) => (down ? box.top : box.left);
    const far = (box) => (down ? box.bottom : box.right);
    const along = (event) => (down ? event.clientY : event.clientX);

    const between = () => Math.max(across(split.getBoundingClientRect()), gripWidth());

    let fullGrip = 0;
    const gripWidth = () => {
        if (!fullGrip) {
            const seen = parseFloat(window.getComputedStyle(split)[down ? 'height' : 'width']);
            fullGrip = seen > 0
                ? seen
                : parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
        }
        return fullGrip;
    };

    const px = (value) => (typeof value === 'function' ? value() : value) || 0;

    const ceiling = () => {
        const box = body.getBoundingClientRect();
        if (!across(box)) return max;
        if (leastOther) return Math.max(0, (across(box) - between() - px(leastOther)) / across(box) * 100);
        const floor = keepOther
            ? across(box) * keepOther / 100
            : parseFloat(window.getComputedStyle(other)[down ? 'minHeight' : 'minWidth']) || 0;
        return Math.max(0, Math.min(max, (across(box) - between() - floor) / across(box) * 100));
    };

    // the least is measured once a drag starts and held for its length: measuring it on every move
    // made the page lay itself out again for each pixel, which is what dragging felt like
    let leastHeld = null;
    const floorAt = () => {
        const room = across(body.getBoundingClientRect());
        const want = leastHeld === null ? px(least) : leastHeld;
        return room && least ? Math.min(ceiling(), want / room * 100) : 0;
    };

    // draws the split at a width, without deciding anything about it
    const paint = (width) => {
        // the room is read before anything is written: read after, it made the browser lay the page out
        // again in the middle of every frame of a drag
        const room = across(body.getBoundingClientRect());
        pane.style.flexBasis = `${width}%`;   // on the pane itself: nothing inherits it, so nothing inside it is restyled
        if (room) {
            const full = gripWidth();
            const open = room * width / 100;
            const grip = Math.max(0, Math.min(full, open, room - open));
            split.style.setProperty('--grip', `${grip}px`);
            if (pane) pane.style.setProperty('--skin', String(Math.min(1, open / skinAt)));
            split.classList.toggle('is-tight', grip < 10);
        }
    };
    const settle = (width) => {
        if (pane) pane.classList.toggle('is-shut', width <= 0);
        other.classList.toggle('split-shut', width >= 100);
        other.style.minWidth = other.style.minHeight = '';
    };

    // a snap travels — quick, eased — rather than arriving: shut or open, it slides there
    let glide = null;
    let aim = null;
    const travel = (to) => {
        if (glide && glide.to === to) return;
        if (glide) cancelAnimationFrame(glide.frame);
        const from = parseFloat(pane.style.flexBasis);
        const start = Number.isFinite(from) ? from : to;
        // open both sides for the trip, and let the far one shrink past its own floor
        if (pane) pane.classList.remove('is-shut');
        other.classList.remove('split-shut');
        other.style[down ? 'minHeight' : 'minWidth'] = '0';
        const began = performance.now();
        glide = { to, frame: 0 };
        const step = (time) => {
            const k = Math.min(1, (time - began) / 200);
            const eased = 1 - Math.pow(1 - k, 3);
            paint(start + (to - start) * eased);
            if (k < 1) {
                glide.frame = requestAnimationFrame(step);
            } else {
                glide = null;
                settle(to);
            }
        };
        glide.frame = requestAnimationFrame(step);
    };

    const set = (percent) => {
        const low = floorAt();
        const high = ceiling();
        let width = percent;
        if (snap) {
            if (width < low) width = width < low / 2 ? 0 : low;
            if (leastOther && width > high) width = width > (high + 100) / 2 ? 100 : high;
            else width = Math.min(width, high);
        } else {
            width = Math.max(low, Math.min(high, width));
        }
        width = Math.max(0, Math.min(100, width));
        aim = width;
        const shown = parseFloat(pane.style.flexBasis);
        const jump = snap && Number.isFinite(shown) && Math.abs(width - shown) > 3
            && (width === 0 || width === 100 || width === low || width === high || shown === 0 || shown === 100);
        if (jump || (glide && glide.to === width)) {
            travel(width);
            return width;
        }
        if (glide) { cancelAnimationFrame(glide.frame); glide = null; }
        paint(width);
        settle(width);
        return width;
    };

    const now = () => {
        const set = parseFloat(pane.style.flexBasis);
        return Number.isFinite(set) ? set : fallback;
    };
    const remember = (width) => {
        try {
            window.localStorage.setItem(key, width);
        } catch (error) {
            // out of room; the split just won't survive a refresh
        }
    };

    // what the pane's size would be if the cursor were the divider
    const atPointer = (point) => {
        const box = body.getBoundingClientRect();
        if (!across(box)) return null;
        return fromRight
            ? (far(box) - along(point)) / across(box) * 100
            : (along(point) - near(box)) / across(box) * 100;
    };

    split.addEventListener('pointerdown', (event) => {
        if (event.button) return;
        event.preventDefault();
        split.classList.add('is-dragging');
        document.documentElement.classList.add(down ? 'splitting-down' : 'splitting');

        const slack = (atPointer(event) || 0) - now();
        leastHeld = px(least);

        // one set a frame, whatever the mouse sends
        let latest = null;
        let frame = 0;
        const drag = (move) => {
            if (move.pointerId !== event.pointerId) return;
            latest = move;
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const wanted = atPointer(latest);
                if (wanted === null) return;
                set(wanted - slack);
                if (onDrag) onDrag();
            });
        };
        const drop = () => {
            if (frame) { cancelAnimationFrame(frame); frame = 0; }
            leastHeld = null;
            window.removeEventListener('pointermove', drag);
            window.removeEventListener('pointerup', drop);
            window.removeEventListener('pointercancel', drop);
            split.classList.remove('is-dragging');
            document.documentElement.classList.remove('splitting', 'splitting-down');
            remember(aim === null ? now() : aim);
        };
        window.addEventListener('pointermove', drag);
        window.addEventListener('pointerup', drop);
        window.addEventListener('pointercancel', drop);
    });

    // the arrow keys nudge it too, once it has focus
    split.addEventListener('keydown', (event) => {
        const back = down ? 'ArrowUp' : 'ArrowLeft';
        const on = down ? 'ArrowDown' : 'ArrowRight';
        if (event.key !== back && event.key !== on) return;
        event.preventDefault();
        const way = (event.key === back ? -2 : 2) * (fromRight ? -1 : 1);
        remember(set(now() + way));
    });

    return {
        set,
        // a narrower window can put a stored width past the new ceiling
        reclamp: () => set(now()),
        load: () => {
            const saved = window.localStorage.getItem(key);
            if (saved !== null && saved !== '') set(Number(saved));
        }
    };
}

// how wide a pane must be for its heading to show whole: the words' own width, plus whatever the
// pane puts around them (measured while it is open, and kept for when it isn't)
const headingChrome = new WeakMap();
function headingRoom(pane, title) {
    if (!pane || !title) return 0;
    const words = document.createRange();
    words.selectNodeContents(title);
    const zoom = window.pageZoom ? window.pageZoom() : 1;
    const wide = words.getBoundingClientRect().width / zoom;
    const head = title.parentElement;   // the heading's row spans the pane's inside
    if (!pane.classList.contains('is-shut') && head.clientWidth > wide) {
        headingChrome.set(pane, pane.offsetWidth - head.clientWidth);
    }
    return Math.ceil(wide + (headingChrome.get(pane) || 48) + 4);
}
// how tall the ai card maker must be to show its head and the whole of the box's placeholder —
// "paste your notes here, …" — however many lines it wraps to at this width. kept for when it is shut
let notesRoomKept = 0;
let notesMirror = null;
function notesRoomDown() {
    const home = document.getElementById('notesHome');
    const head = home && home.querySelector('.notes-head');
    const box = document.getElementById('notesInput');
    if (!home || !head || !box || home.classList.contains('is-shut') || !box.clientWidth) return notesRoomKept || 160;
    const look = window.getComputedStyle(box);
    const pad = (name) => parseFloat(look[name]) || 0;
    if (!notesMirror) {
        notesMirror = document.createElement('div');
        notesMirror.setAttribute('aria-hidden', 'true');
        notesMirror.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;';
        document.body.append(notesMirror);
    }
    notesMirror.style.font = look.font;
    notesMirror.style.lineHeight = look.lineHeight;
    notesMirror.style.letterSpacing = look.letterSpacing;
    notesMirror.style.width = `${box.clientWidth - pad('paddingLeft') - pad('paddingRight')}px`;
    notesMirror.textContent = box.placeholder;
    const words = notesMirror.offsetHeight;
    // and the box itself is never squeezed below that: the buttons under it scroll away first
    const boxTall = Math.ceil(pad('borderTopWidth') + pad('paddingTop') + words + pad('paddingBottom') + pad('borderBottomWidth'));
    box.parentElement.style.minHeight = `${boxTall}px`;
    const homeLook = window.getComputedStyle(home);
    const panelGap = parseFloat(window.getComputedStyle(home.querySelector('.notes-panel')).rowGap) || 8;
    const tight = parseFloat(window.getComputedStyle(document.documentElement).fontSize) * 0.5;   // the pane's --tight padding
    notesRoomKept = Math.ceil(
        (parseFloat(homeLook.borderTopWidth) || 0) + tight + head.offsetHeight + panelGap
        + boxTall + tight + (parseFloat(homeLook.borderBottomWidth) || 0) + 2
    );
    return notesRoomKept;
}

const deckSplit = wireSplit({
    split: paneSplit,
    body: homeBody,
    other: cardSide,
    pane: document.querySelector('.deck-side'),
    key: 'deck-column',
    least: 215,
    leastOther: 304,   /* the card side's own 19rem floor */
    snap: true,
    fallback: 50,
    onDrag: () => { if (!sharePanel.hidden) placeSharePanel(); }
});

const notesSplit = wireSplit({
    split: document.getElementById('notesSplit'),
    body: cardSide,
    other: document.querySelector('.card-side > .deck-stage'),
    pane: document.getElementById('notesHome'),
    key: 'notes-row',
    down: true,
    fromRight: true,
    least: () => notesRoomDown(),
    leastOther: 140,
    snap: true,
    // it wears a --tight all round rather than the clip box's --group
    skinAt: 36,
    max: 70,
    fallback: 30
});

function loadDeckColumn() {
    if (deckSplit) deckSplit.load();
    if (notesSplit) notesSplit.load();
}

window.addEventListener('resize', () => {
    if (deckSplit) deckSplit.reclamp();
    if (clipSplitter) clipSplitter.reclamp();
    if (notesSplit) notesSplit.reclamp();
    if (chatSplitter) chatSplitter.reclamp();
    if (!sharePanel.hidden) placeSharePanel();
});

/* --- dragging a deck up or down the list --- */

let deckWasDragged = false;

const DECK_LIFT_SLACK = 4;   // px of travel before a press counts as a drag

function deckLiftConfig() {
    return { list: deckListSlot, selector: '.deck-card', feel: LIFT_FEEL.decks, onSettle: settleDeckOrder };
}

function armDeckLift(entry, event) {
    if (event.button) return;
    deckWasDragged = false;
    const startY = event.clientY;

    const watch = (move) => {
        if (move.pointerId !== event.pointerId) return;
        if (Math.abs(move.clientY - startY) < DECK_LIFT_SLACK) return;
        stop();
        deckWasDragged = true;
        startLift(deckLiftConfig(), entry, {
            button: 0,
            pointerId: move.pointerId,
            clientY: move.clientY,
            preventDefault: () => move.preventDefault()
        });
    };
    const stop = () => {
        window.removeEventListener('pointermove', watch);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
    };

    window.addEventListener('pointermove', watch);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
}

function settleDeckOrder() {
    const order = [...deckListSlot.querySelectorAll('.deck-card')]
        .map((entry) => decks.find((deck) => deck.id === entry.dataset.deckId))
        .filter(Boolean);
    if (order.length !== decks.length) return;
    decks = order;
    deckCardsShape = deckCardsShapeNow();
    renderDecks();
    saveDecks();

    window.setTimeout(() => { deckWasDragged = false; }, 0);
}

// whatever is typed in an open card is kept the moment anything else happens — a redraw, a click
// somewhere else, a tab out, the page being left. it used to live only in the field until Enter,
// so a redraw put the old words back and the next save wrote them over the new ones
function keepStageEdit() {
    if (editingStageIndex === null) return false;
    const deck = activeDeck();
    const card = deck && deck.cards[editingStageIndex];
    const open = deckCardList.querySelector(`.stage-card[data-card-index="${editingStageIndex}"]`);
    const question = open && open.querySelector('.edit-question');
    const answer = open && open.querySelector('.edit-answer');
    if (!card || !question || !answer) return false;
    const nextQuestion = question.value.trim();
    const nextAnswer = answer.value.trim();
    if (!nextQuestion || !nextAnswer) return false;
    if (nextQuestion === card.question && nextAnswer === card.answer) return false;
    card.question = nextQuestion;
    card.answer = nextAnswer;
    saveDecks();
    return true;
}
window.addEventListener('pagehide', () => keepStageEdit());
window.addEventListener('beforeunload', () => keepStageEdit());
document.addEventListener('visibilitychange', () => { if (document.hidden) keepStageEdit(); });

function renderStage() {
    const deck = activeDeck();
    const total = deck.cards.length;

    keepStageEdit();
    armedDeleteRow = null;   // the rows it pointed at are about to go
    deckCardList.innerHTML = '';
    if (total === 0) {
        deckCardList.innerHTML =
            '<li class="empty-message">'
            + '<span class="empty-words">'
            +   '<span class="empty-say"><b>nofing T_T</b></span>'
            +   '<span class="empty-hint">this deck is empty</span>'
            + '</span>'
            + '<span class="empty-face">=ω=</span>'
            + '</li>';
        editingStageIndex = null;
        return;
    }

    deck.cards.forEach((card, index) => {
        const item = document.createElement('li');
        item.className = `stage-card${index === editingStageIndex ? ' editing' : ''}`;
        item.dataset.cardIndex = index;

        item.append(rowGrip(item, 'card-handle', `reorder ${card.question}, use arrow keys`, cardLiftConfig));

        const text = stageWords(item, card);

        const actions = document.createElement('span');
        actions.className = 'stage-card-actions';

        const cancel = document.createElement('button');
        cancel.className = 'stage-card-cancel';
        cancel.type = 'button';
        cancel.textContent = '×';
        cancel.tabIndex = -1;
        cancel.setAttribute('aria-label', `keep ${card.question}`);
        cancel.title = 'keep it';
        cancel.addEventListener('click', (event) => {
            event.stopPropagation();
            disarmStageDelete();
        });

        const remove = document.createElement('button');
        remove.className = 'stage-card-action';
        remove.type = 'button';
        remove.innerHTML = '<span class="mark-bin">×</span><span class="mark-yes"></span>';
        remove.setAttribute('aria-label', `delete ${card.question}`);
        remove.title = 'delete — ctrl+z brings it back';
        let pressed = 0;
        const act = () => (armedDeleteRow === item ? deleteStageCard(rowIndex(item)) : armStageDelete(item));
        remove.addEventListener('pointerdown', (event) => {
            if (event.button) return;
            event.stopPropagation();
            event.preventDefault();
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
            pressed = Date.now();
            act();
        });
        remove.addEventListener('click', (event) => {
            event.stopPropagation();
            if (Date.now() - pressed < 600) return;
            act();
        });

        actions.append(cancel, remove);
        item.append(index === editingStageIndex
            ? buildStageEditor(deck, card, index, editingStageField)
            : text, actions);

        deckCardList.appendChild(item);
    });
}

/* a card's two lines, and what pressing one of them does */
function stageWords(item, card) {
    const text = document.createElement('span');
    text.className = 'stage-card-text';
    text.append(
        stageLine('Q', Object.assign(document.createElement('strong'), { textContent: card.question })),
        stageLine('A', Object.assign(document.createElement('small'), { textContent: card.answer }))
    );
    text.title = 'click a line to edit it';
    text.addEventListener('pointerdown', (event) => {
        if (event.button) return;
        const line = event.target.closest('.stage-line');
        beginStageEdit(rowIndex(item), line && line.dataset.field === 'answer' ? 'answer' : 'question');
    });
    return text;
}

// one line of a card on the stage: its Q or A tag, then the words (or, while editing, the field)
function stageLine(tag, filling) {
    const line = document.createElement('span');
    line.className = 'stage-line';
    line.dataset.field = tag === 'Q' ? 'question' : 'answer';
    const mark = document.createElement('b');
    mark.className = 'line-tag';
    mark.textContent = tag;
    mark.setAttribute('aria-hidden', 'true');
    line.append(mark, filling);
    return line;
}

function buildStageEditor(deck, card, index, field) {
    const wrap = document.createElement('span');
    wrap.className = 'stage-card-edit';

    const question = stopGuessing(document.createElement('input'));
    question.className = 'edit-question';
    question.type = 'text';
    question.value = card.question;
    question.placeholder = 'question';
    question.setAttribute('aria-label', 'question');

    const answer = stopGuessing(document.createElement('input'));
    answer.className = 'edit-answer';
    answer.type = 'text';
    answer.value = card.answer;
    answer.placeholder = 'answer';
    answer.setAttribute('aria-label', 'answer');

    // the tags stay while you type, so the row doesn't change shape
    const questionLine = stageLine('Q', question);
    const answerLine = stageLine('A', answer);

    const commit = () => {
        if (!wrap.isConnected) return;     // a redraw replaced this box; the new one holds the words
        const target = deck.cards[index];
        if (!target) return;
        const nextQuestion = question.value.trim();
        const nextAnswer = answer.value.trim();
        editingStageIndex = null;
        if (!nextQuestion || !nextAnswer) {
            renderStage();
            return;
        }
        target.question = nextQuestion;
        target.answer = nextAnswer;
        const item = wrap.closest('.stage-card');
        if (item) {
            wrap.replaceWith(stageWords(item, target));
            item.classList.remove('editing');
        } else {
            renderStage();
        }
        renderDeckCards();
        refreshShareForActiveDeck();
        renderCards();
        saveDecks();
    };

    // another card being opened closes this one where it stands, so its cross slides back in
    // rather than the whole list being drawn again (which put it back with no movement at all)
    stageCloser = () => { if (editingStageIndex === index) commit(); };
    [question, answer].forEach((field) => {
        field.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commit();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                editingStageIndex = null;
                renderStage();
            }
        });
        field.addEventListener('blur', () => {
            // the words are kept now, whatever comes next; the box closes once focus has settled
            if (editingStageIndex === index && wrap.isConnected) keepStageEdit();
            window.setTimeout(() => {
                if (editingStageIndex !== index || !wrap.isConnected) return;
                if (wrap.contains(document.activeElement)) return;
                commit();
            }, 0);
        });
    });

    wrap.append(questionLine, answerLine);
    const taking = field === 'answer' ? answer : question;
    window.setTimeout(() => {
        taking.focus();
        const end = taking.value.length;
        taking.setSelectionRange(end, end);
    }, 0);
    return wrap;
}

function rowIndex(item) {
    return Number(item.dataset.cardIndex);
}

function cardLiftConfig() {
    return {
        list: deckCardList,
        selector: '.stage-card',
        feel: LIFT_FEEL.cards,
        onSettle: settleCardOrder
    };
}

function settleCardOrder() {
    const deck = activeDeck();
    const rows = [...deckCardList.querySelectorAll('.stage-card')];
    const order = rows.map((row) => deck.cards[rowIndex(row)]).filter(Boolean);
    if (order.length !== deck.cards.length) return;
    // an open card keeps its words and closes: its box still points at the number it had before the move
    const wasEditing = editingStageIndex !== null;
    keepStageEdit();
    deck.cards = order;
    rows.forEach((row, index) => { row.dataset.cardIndex = index; });
    if (wasEditing) { editingStageIndex = null; stageCloser = null; renderStage(); }
    renderDeckCards();
    renderCards();
    saveDecks();
}

function beginStageEdit(index, field) {
    if (editingStageIndex === index) return;
    const deck = activeDeck();
    const card = deck.cards[index];
    if (!card) return;

    if (editingStageIndex !== null) {
        if (stageCloser) stageCloser();
        if (editingStageIndex !== null) { editingStageIndex = null; renderStage(); }
    }
    const item = deckCardList.querySelector(`.stage-card[data-card-index="${index}"]`);
    const text = item && item.querySelector('.stage-card-text');
    if (!text) {
        editingStageIndex = index;
        editingStageField = field;
        renderStage();
        return;
    }

    disarmStageDelete();
    editingStageIndex = index;
    editingStageField = field === 'answer' ? 'answer' : 'question';
    void item.offsetWidth;            // its cross is drawn where it is before it starts to go
    item.classList.add('editing');
    text.replaceWith(buildStageEditor(deck, card, index, field));
}

let armedDeleteRow = null;
let stageCloser = null;

function armStageDelete(item) {
    disarmStageDelete();
    armedDeleteRow = item;
    item.classList.add('is-arming');
}

function disarmStageDelete() {
    if (!armedDeleteRow) return;
    armedDeleteRow.classList.remove('is-arming');
    armedDeleteRow = null;
}

function deleteStageCard(index) {
    disarmStageDelete();
    binCard(activeDeck(), index);
}

function renderDecks() {
    renderDeckCards();
    renderStage();
    refreshShareForActiveDeck();
}

function beginDeckRename(deck) {
    const entry = deckListSlot.querySelector(`[data-deck-id="${deck.id}"]`);
    if (!entry || entry.classList.contains('is-renaming')) return;

    const row = document.createElement('div');
    row.className = entry.className + ' is-renaming';
    row.dataset.deckId = deck.id;

    const swatch = document.createElement('span');
    swatch.className = 'deck-shape';
    swatch.innerHTML = shapeFor(deck);

    const field = stopGuessing(document.createElement('input'));
    field.className = 'deck-inline-input';
    field.type = 'text';
    field.value = deck.name;
    field.setAttribute('aria-label', `rename ${deck.name}`);

    let finished = false;
    const finishRename = (save) => {
        if (finished) return;
        finished = true;
        const newName = field.value.trim();
        if (save && newName) deck.name = newName;
        deckCardsShape = '';
        renderDecks();
        saveDecks();
    };

    field.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') finishRename(true);
        if (event.key === 'Escape') finishRename(false);
    });
    field.addEventListener('blur', () => finishRename(true));

    row.append(swatch, field);
    entry.replaceWith(row);
    field.focus();
    field.select();
}

/* ---------- 6. cards ---------- */

function isModalOpen() {
    return !modalVeil.hidden && !modalVeil.classList.contains('is-leaving');
}

const MODAL_EXIT_MS = 320;   // matches panel-drop, the arrival reversed
let modalExitTimer = 0;

// every window lives in the one veil, so one list read off the page covers them all — a new window
// needs nothing adding here
const WINDOWS = [...document.querySelectorAll('#modalVeil > .modal-panel')];

function closeModal() {
    if (modalVeil.hidden || modalVeil.classList.contains('is-leaving')) return;
    // before anything is hidden, or there is nothing left to fly from
    flyPanel(NOTES_HOME);
    modalVeil.classList.add('is-leaving');
    window.clearTimeout(modalExitTimer);
    modalExitTimer = window.setTimeout(() => {
        modalVeil.hidden = true;
        modalVeil.classList.remove('is-leaving');
        WINDOWS.forEach((one) => { one.hidden = true; });
        addingAbandoned();
        returnNotesPanel();
    }, MODAL_EXIT_MS);
}

function showScreen(screen) {
    if (screen === homeScreen) {
        waitingForContinue = false;
        closeModal();
        return;
    }

    window.clearTimeout(modalExitTimer);
    modalVeil.classList.remove('is-leaving');
    modalVeil.hidden = false;
    WINDOWS.forEach((one) => { one.hidden = one !== screen; });
    if (screen !== notesScreen) returnNotesPanel();

    const held = document.activeElement;
    if (held && held !== document.body && !screen.contains(held)) held.blur();
}

function renderCards() {
    const cards = activeDeck().cards;
    cardList.innerHTML = '';
    if (cards.length === 0) {
        cardList.innerHTML = '<li class="empty-message">no cards yet</li>';
        return;
    }
    cards.forEach((card, index) => {
        const item = document.createElement('li');
        item.className = 'card-item';
        item.dataset.cardIndex = index;

        const cardText = document.createElement('span');
        cardText.className = 'card-text';
        cardText.textContent = `${card.question} — ${card.answer}`;
        cardText.title = `${card.question} — ${card.answer}`;

        item.append(cardText);
        cardList.appendChild(item);
    });
}

function editCard(index) {
    const card = activeDeck().cards[index];
    if (!card) return;
    editingCardIndex = index;
    editingDeckId = activeDeckId;
    questionInput.value = card.question;
    answerInput.value = card.answer;
    pendingOptions = new Set(Array.isArray(card.options) ? card.options : []);
    closeOptionPicker();
    updateOptionCount();
    cardSubmitButton.querySelector('span').textContent = 'save';
    cardFormNote.textContent = '';
    showScreen(makerScreen);
    questionInput.focus();
}

function renderOptionPicker() {
    const deck = decks.find((item) => item.id === editingDeckId) || activeDeck();
    const own = editingCardIndex === null ? null : deck.cards[editingCardIndex];
    const answers = [...new Set(deck.cards.map((card) => card.answer))]
        .filter((answer) => answer && answer !== (own ? own.answer : answerInput.value.trim()));

    optionsPicks.innerHTML = '';
    if (!answers.length) {
        optionsPicks.innerHTML = '<p class="empty-message">no other answers in this deck yet</p>';
        updateOptionCount();
        return;
    }

    answers.forEach((answer) => {
        const row = document.createElement('label');
        row.className = 'option-pick';

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = pendingOptions.has(answer);
        box.addEventListener('change', () => {
            if (box.checked) pendingOptions.add(answer);
            else pendingOptions.delete(answer);
            row.classList.toggle('is-picked', box.checked);
            updateOptionCount();
        });

        const text = document.createElement('span');
        text.textContent = answer;

        row.classList.toggle('is-picked', box.checked);
        row.append(box, text);
        optionsPicks.append(row);
    });
    updateOptionCount();
}

function updateOptionCount() {
    const total = pendingOptions.size;
    optionsToggle.classList.toggle('is-on', total > 0);
    optionsToggle.title = total
        ? `${total} answer${total === 1 ? '' : 's'} chosen`
        : 'which answers can sit beside this one';
}

function closeOptionPicker() {
    optionsPanel.hidden = true;
    optionsToggle.setAttribute('aria-expanded', 'false');
}

function resetCardForm() {
    editingCardIndex = null;
    editingDeckId = null;
    cardForm.reset();
    cardFormNote.textContent = '';
    cardSubmitButton.querySelector('span').textContent = 'add';
    pendingOptions = new Set();
    closeOptionPicker();
    updateOptionCount();
}

/* ---------- 7. practice ---------- */

function shuffle(items) {
    const shuffledItems = [...items];
    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffledItems[index], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[index]];
    }
    return shuffledItems;
}

let nextQuestionTimer = null;   // the beat after a right answer; a fresh round must not inherit it
function startStudy() {
    clearTimeout(nextQuestionTimer);
    recentQuestions = [];
    askedThisRound = new Set();
    roundTurns = 0;
    showScreen(studyScreen);
    showNextQuestion();
}

function showNextQuestion() {
    const cards = activeDeck().cards;
    waitingForContinue = false;

    if (cards.length === 0) {
        studyQuestion.textContent = 'empty ..';
        studyQuestion.classList.add('is-empty');   // quieter than a question
        answerOptions.innerHTML = '';
        studyFeedback.textContent = '';
        return;
    }
    studyQuestion.classList.remove('is-empty');

    // don't repeat a question until half the deck has gone by
    const cooldownSize = Math.max(1, Math.floor(cards.length / 2));
    let availableCards = cards.filter((card) => !recentQuestions.includes(card));
    if (availableCards.length === 0) {
        availableCards = cards.filter((card) => card !== currentCard);
        if (availableCards.length === 0) availableCards = cards;
    }

    // a round is the deck once over. if a round has run as long as the deck and some card still
    // hasn't come up, it is one of those next — so nothing is left out for long
    askedThisRound = new Set([...askedThisRound].filter((card) => cards.includes(card)));   // cards since deleted
    const waiting = availableCards.filter((card) => !askedThisRound.has(card));
    const overdue = roundTurns >= cards.length && waiting.length;
    currentCard = overdue ? shuffle(waiting)[0] : pickWeighted(shuffle(availableCards), cards);
    if (askedThisRound.size === 0) roundTurns = 0;
    askedThisRound.add(currentCard);
    roundTurns += 1;
    if (askedThisRound.size >= cards.length) { askedThisRound = new Set(); roundTurns = 0; }
    questionShownAt = performance.now();
    recentQuestions.push(currentCard);
    if (recentQuestions.length > cooldownSize) recentQuestions.shift();

    studyQuestion.textContent = currentCard.question;
    studyFeedback.textContent = '';
    answerOptions.classList.remove('is-answered');
    answerOptions.innerHTML = '';

    const deckAnswers = [...new Set(cards.map((card) => card.answer))]
        .filter((answer) => answer !== currentCard.answer);
    const picked = Array.isArray(currentCard.options)
        ? currentCard.options.filter((answer) => deckAnswers.includes(answer))
        : [];
    const wrongAnswers = picked.length ? shuffle(picked).slice(0, 3) : [];
    if (wrongAnswers.length < 3) {
        shuffle(deckAnswers)
            .filter((answer) => !wrongAnswers.includes(answer))
            .slice(0, 3 - wrongAnswers.length)
            .forEach((answer) => wrongAnswers.push(answer));
    }
    const all = [currentCard.answer, ...wrongAnswers];
    const options = deckAnswers.length + 1 > 4
        ? shuffle(all)
        : all.sort((one, two) => two.localeCompare(one));

    answerOptions.dataset.count = String(options.length);
    const wideIndex = options.length === 3 ? 2 : -1;

    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = `answer-button${index === wideIndex ? ' is-wide' : ''}`;
        button.type = 'button';
        button.dataset.answer = option;
        const word = document.createElement('span');
        word.className = 'answer-word';
        word.textContent = option;
        button.append(word);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (waitingForContinue) showNextQuestion();
            else checkAnswer(button, option);
        });
        answerOptions.appendChild(button);
    });
}

function markAnswer(button, right) {
    const mark = document.createElement('span');
    mark.className = `answer-mark ${right ? 'is-tick' : 'is-cross'}`;
    mark.innerHTML = right
        ? '<svg viewBox="0 0 24 24" aria-hidden="true">'
            + '<path d="M4 12.6 L9.6 18.2 L20 6.6" fill="none" stroke="currentColor"'
            + ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true">'
            + '<path d="M6 6 L18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
            + '<path d="M18 6 L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
    button.prepend(mark);
    button.classList.add('is-marked');
}

function checkAnswer(selectedButton, selectedAnswer) {
    const buttons = answerOptions.querySelectorAll('.answer-button');
    buttons.forEach((button) => {
        if (button.dataset.answer === currentCard.answer) button.classList.add('correct');
    });
    answerOptions.classList.add('is-answered');
    studyFeedback.textContent = '';

    noteAnswer(currentCard, selectedAnswer === currentCard.answer);
    if (selectedAnswer === currentCard.answer) {
        selectedButton.classList.add('is-right');
        markAnswer(selectedButton, true);
        buttons.forEach((button) => { button.disabled = true; });
        // long enough for the stamp to land and the ring to go out
        nextQuestionTimer = setTimeout(showNextQuestion, 620);
    } else {
        selectedButton.classList.add('incorrect');
        markAnswer(selectedButton, false);
        waitingForContinue = true;
    }
}

/* ---------- 8. context menu ---------- */

function hideContextMenu() {
    contextMenu.hidden = true;
    contextMenu.innerHTML = '';
}

function showContextMenu(event, target) {
    event.preventDefault();
    contextMenu.innerHTML = '';
    contextMenu.hidden = false;
    contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 200)}px`;
    contextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 100)}px`;

    const item = (label, run) => {
        const action = document.createElement('button');
        action.className = 'context-action';
        action.type = 'button';
        action.textContent = label;
        action.addEventListener('click', run);
        return action;
    };

    if (target.type === 'page') {
        [
            ['back', () => window.history.back()],
            ['forward', () => window.history.forward()],
            ['reload', () => window.location.reload()]
        ].forEach(([label, run]) => contextMenu.append(item(label, () => {
            hideContextMenu();
            run();
        })));
    }

    if (target.type === 'deck') {
        const deleteDeckButton = item('delete', () => {
            binDeck(decks.indexOf(target.deck));
            hideContextMenu();
        });
        deleteDeckButton.disabled = decks.length === 1;
        contextMenu.append(
            item('rename', () => {
                hideContextMenu();
                beginDeckRename(target.deck);
            }),
            item('new icon', () => {
                target.deck.look = (lookFor(target.deck) + 1) % LOOK_COUNT;
                renderDecks();
                saveDecks();
                hideContextMenu();
            }),
            deleteDeckButton
        );
    }

    if (target.type === 'card') {
        contextMenu.append(
            item('edit', () => {
                editCard(target.index);
                hideContextMenu();
            }),
            item('delete', () => {
                binCard(target.deck, target.index);
                hideContextMenu();
            })
        );
    }

}

/* ---------- 9. keyboard ---------- */

// the keyboard is split into four zones, one per answer button
const KEY_QUADRANTS = {
    0: ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
        'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'],
    1: ['Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal',
        'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
    2: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',
        'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'],
    3: ['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote',
        'KeyN', 'KeyM', 'Comma', 'Period', 'Slash']
};

function quadrantForKey(code) {
    return Object.keys(KEY_QUADRANTS).find((index) => KEY_QUADRANTS[index].includes(code));
}

function buttonForQuadrant(quadrant) {
    const buttons = [...answerOptions.querySelectorAll('.answer-button')];
    if (!buttons.length) return null;
    if (buttons.length === 1) return buttons[0];
    if (buttons.length === 2) return buttons[quadrant < 2 ? 0 : 1];
    if (buttons.length === 3) {
        const wide = buttons.find((button) => button.classList.contains('is-wide'));
        if (quadrant > 1) return wide;
        return buttons.filter((button) => button !== wide)[quadrant];
    }
    return buttons[quadrant];
}

function openBinDb() {
    return openDb(BIN_DB, BIN_STORE, true);
}

async function keepBinned(entry) {
    try {
        const db = await openBinDb();
        db.transaction(BIN_STORE, 'readwrite').objectStore(BIN_STORE).put(entry);
    } catch (error) {
        // it stays in the session's own list either way
    }
}

async function forgetBinned(id) {
    try {
        const db = await openBinDb();
        db.transaction(BIN_STORE, 'readwrite').objectStore(BIN_STORE).delete(id);
    } catch (error) {
        // nothing to do; it has already gone from the page
    }
}

function rememberDeleted(entry, fromRedo) {
    entry.id = `bin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    entry.when = Date.now();
    if (!fromRedo) redoStack = [];
    deletedStack.push(entry);
    keepBinned(entry);
    renderBinned();
    paintWidgets();
}

// the three ways something goes in the bin, each written once: by its own button, from the right-click
// menu, or sent back down again with redo
function binCard(deck, index, fromRedo) {
    const card = deck.cards[index];
    if (!card) return;
    rememberDeleted({ type: 'card', item: card, index, deckId: deck.id }, fromRedo);
    deck.cards.splice(index, 1);
    editingStageIndex = null;
    renderDecks();
    renderCards();
    saveDecks();
}
function binDeck(at, fromRedo) {
    const deck = decks[at];
    if (!deck || decks.length === 1) return;     // the last deck stays
    rememberDeleted({ type: 'deck', item: deck, index: at }, fromRedo);
    decks.splice(at, 1);
    if (activeDeckId === deck.id) activeDeckId = decks[Math.max(0, at - 1)].id;
    renderDecks();
    renderCards();
    saveDecks();
}
function binClip(row, record, fromRedo) {
    const index = [...recordingList.querySelectorAll('.recording-item')].indexOf(row);
    const player = row.querySelector('audio');
    if (player) {
        player.pause();
        if (player.src.startsWith('blob:')) URL.revokeObjectURL(player.src);
        player.src = '';
    }
    row.remove();
    clipRows.delete(record.id);
    deleteClip(record.id);
    refreshEmptyMessage();
    rememberClipOrder();
    rememberDeleted({ type: 'clip', item: record, index }, fromRedo);   // after the row has gone, so the tiles count right
}

/* on the way in, anything already a week old is thrown out for real */
async function loadBinned() {
    let kept = [];
    try {
        const db = await openBinDb();
        kept = await readAll(db, BIN_STORE);
    } catch (error) {
        kept = [];
    }
    const cutoff = Date.now() - BIN_KEEP_MS;
    kept.filter((entry) => (entry.when || 0) < cutoff).forEach((entry) => forgetBinned(entry.id));
    deletedStack = kept
        .filter((entry) => (entry.when || 0) >= cutoff)
        .sort((a, b) => (a.when || 0) - (b.when || 0));
    renderBinned();
}

async function emptyBin() {
    askToEmpty(false, true);
    if (!deletedStack.length) return;
    try {
        const db = await openBinDb();
        db.transaction(BIN_STORE, 'readwrite').objectStore(BIN_STORE).clear();
    } catch (error) {
        // the list still clears; the store will age out on its own
    }
    deletedStack = [];
    renderBinned();
    paintWidgets();
}

function undoLastDelete() {
    const undone = deletedStack.pop();
    if (!undone) return;
    restoreDeleted(undone);
    // it can be sent back down again with ctrl+shift+z or ctrl+y
    redoStack.push(undone);
    renderBinned();
    paintWidgets();
}

function redoLastUndo() {
    const again = redoStack.pop();
    if (!again) return;

    if (again.type === 'deck') {
        binDeck(decks.findIndex((deck) => deck.id === again.item.id), true);
    } else if (again.type === 'card') {
        const deck = decks.find((item) => item.id === again.deckId);
        if (deck && deck.cards.includes(again.item)) binCard(deck, deck.cards.indexOf(again.item), true);
    } else if (again.type === 'clip') {
        const row = recordingList.querySelector(`[data-clip-id="${again.item.id}"]`);
        if (row) binClip(row, again.item, true);
    }
}

/* a short name for a thing, for the list in the bar */
function binnedLabel(entry) {
    if (entry.type === 'deck') return `deck · ${entry.item.name}`;
    if (entry.type === 'card') return `card · ${entry.item.question}`;
    if (entry.type === 'clip') return `clip · ${entry.item.name || entry.item.number}`;
    return `song · ${entry.item.name}`;
}

/* how long ago, in the roughest terms that are still useful */
function sinceWhen(when) {
    if (!when) return 'a while ago';
    const mins = Math.floor((Date.now() - when) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
}

const BIN_BACK_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 6.5 5 10l3.5 3.5"/><path d="M5 10h9a5 5 0 0 1 0 10h-3"/></svg>';
const BIN_GONE_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';

function renderBinned() {
    // the bin mark is always there; how many are in it sits on its corner
    binnedCount.textContent = deletedStack.length ? `${deletedStack.length}` : '';
    binnedList.innerHTML = '';
    // empty at the top; under it the binned things in a little box of their own, which scrolls. with
    // nothing binned the window stays the same size and the box says so
    const top = document.createElement('li');
    top.className = 'binned-top';
    top.append(emptyAsk);
    const box = document.createElement('li');
    box.className = 'binned-box';
    binnedList.append(top, box);
    if (!deletedStack.length) {
        const none = document.createElement('span');
        none.className = 'binned-none';
        none.textContent = 'nothing';
        box.append(none);
    }
    [...deletedStack].reverse().forEach((entry) => {
        // the name on the left; putting back and binning for good are two marks at the right — a press
        // on the name itself does nothing
        const row = document.createElement('div');
        row.className = 'binned-row';
        const name = document.createElement('span');
        name.className = 'binned-name';
        name.textContent = binnedLabel(entry);
        name.title = `binned ${sinceWhen(entry.when)}`;
        // either mark takes the thing out of the bin: one puts it back, the other lets it go for good
        const act = (title, mark, then) => {
            const button = document.createElement('button');
            button.className = 'binned-act';
            button.type = 'button';
            button.title = title;
            button.innerHTML = mark;
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const at = deletedStack.indexOf(entry);
                if (at === -1) return;
                deletedStack.splice(at, 1);
                then();
                renderBinned();
                paintWidgets();
            });
            return button;
        };
        row.append(name,
            act('put it back', BIN_BACK_MARK, () => restoreDeleted(entry)),
            act('delete for good', BIN_GONE_MARK, () => { if (entry.id) forgetBinned(entry.id); }));
        box.append(row);
    });
}

function restoreDeleted(undone) {
    // a card whose deck has since gone goes into the deck that is open, rather than nowhere
    const home = undone.type === 'card' ? decks.find((item) => item.id === undone.deckId) || activeDeck() : null;
    if (undone.type === 'card' && !home) return;
    if (undone.id) forgetBinned(undone.id);

    if (undone.type === 'clip') {
        saveClip(undone.item);
        addRecording(undone.item, true, true);
        // it was appended at the end; walk it back to where it came from
        const rows = [...recordingList.querySelectorAll('.recording-item')];
        const row = rows[rows.length - 1];
        const before = rows[undone.index];
        if (row && before && before !== row) recordingList.insertBefore(row, before);
        rememberClipOrder();
        refreshEmptyMessage();
        return;
    }

    if (undone.type === 'track') return;     // songs went with the player

    if (undone.type === 'deck') {
        decks.splice(Math.min(undone.index, decks.length), 0, undone.item);
        activeDeckId = undone.item.id;
    } else {
        const deck = home;
        deck.cards.splice(Math.min(undone.index, deck.cards.length), 0, undone.item);
        activeDeckId = deck.id;
    }
    renderDecks();
    renderCards();
    saveDecks();
}

/* ---------- 10. wiring ---------- */

const noBoing = '.square-button, .deck-card, .quick-action, .clip-handle, .hint-button, .field-add, .answer-button';
document.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('button');
    if (!button || button.closest(noBoing)) return;
    button.classList.remove('boing');
    void button.offsetWidth;          // restart it on a fast second click
    button.classList.add('boing');
});
document.addEventListener('animationend', (event) => {
    if (event.animationName === 'button-boing') event.target.classList.remove('boing');
});

// decks
deckForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = deckNameInput.value.trim();
    if (!name) {
        deckNameInput.focus();
        return;
    }
    const deck = { id: `deck-${Date.now()}`, name, cards: [] };
    decks.push(deck);
    activeDeckId = deck.id;
    deckForm.reset();
    renderDecks();
    renderCards();
    saveDecks();
});

function bytesToCode(bytes) {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function codeToBytes(text) {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/');
    const binary = window.atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function squeeze(bytes, mode) {
    const Stream = mode === 'in' ? window.CompressionStream : window.DecompressionStream;
    if (!Stream) return null;
    const piped = new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'));
    return new Uint8Array(await new Response(piped).arrayBuffer());
}

async function deckToCode(deck) {
    const payload = JSON.stringify({
        n: deck.name,
        l: lookFor(deck),
        c: deck.cards.map((card) => [card.question, card.answer])
    });
    const bytes = new TextEncoder().encode(payload);
    let packed = null;
    try {
        packed = await squeeze(bytes, 'in');
    } catch (error) {
        packed = null;
    }
    if (packed && packed.length < bytes.length) return `rc2.${bytesToCode(packed)}`;
    return `rc1.${bytesToCode(bytes)}`;
}

async function codeToDeck(code) {
    const clean = code.trim().replace(/\s+/g, '');
    const dot = clean.indexOf('.');
    const tag = clean.slice(0, dot);
    if (tag !== 'rc1' && tag !== 'rc2') throw new Error('bad tag');

    let bytes = codeToBytes(clean.slice(dot + 1));
    if (tag === 'rc2') bytes = await squeeze(bytes, 'out');

    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed.n !== 'string') throw new Error('bad payload');
    return {
        id: `deck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: parsed.n,
        look: Number.isInteger(parsed.l) ? parsed.l : undefined,
        cards: (Array.isArray(parsed.c) ? parsed.c : [])
            .filter((pair) => Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string')
            .map((pair) => ({ question: pair[0], answer: pair[1] }))
    };
}

async function refreshShareCode() {
    const deck = activeDeck();
    const code = await deckToCode(deck);
    if (deck !== activeDeck()) return;       // a later refresh is for the deck now open
    shareOut.value = code;
    shareOut.setAttribute('aria-label', `code for ${deck.name}`);
}

function closeSharePanel() {
    sharePanel.hidden = true;
    shareToggle.setAttribute('aria-expanded', 'false');
}

function placeSharePanel() {
    const column = appContent.getBoundingClientRect();
    const gutter = 16;
    placeUnder(sharePanel, shareToggle, {
        left: column.left + gutter,
        right: column.right - gutter
    });
}

async function openSharePanel() {
    sharePanel.hidden = false;
    shareToggle.setAttribute('aria-expanded', 'true');
    shareNote.textContent = '';
    placeSharePanel();
    await refreshShareCode();
}

shareToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (sharePanel.hidden) openSharePanel();
    else closeSharePanel();
});
sharePanel.addEventListener('click', (event) => event.stopPropagation());

document.getElementById('copyCode').addEventListener('click', async () => {
    shareOut.select();
    try {
        await navigator.clipboard.writeText(shareOut.value);
        shareNote.textContent = 'copied ✓ paste it to anyone';
    } catch (error) {
        shareNote.textContent = 'selected — hit ctrl+c / cmd+c';
    }
});

document.getElementById('loadCode').addEventListener('click', async () => {
    const typed = shareIn.value.trim();
    if (!typed) {
        shareIn.focus();
        return;
    }
    try {
        const deck = await codeToDeck(typed);
        decks.push(deck);
        activeDeckId = deck.id;
        shareIn.value = '';
        renderDecks();
        renderCards();
        saveDecks();
        shareNote.textContent = `got "${deck.name}" · ${deck.cards.length} cards`;
    } catch (error) {
        shareNote.textContent = "that code didn't work T_T";
    }
});

document.getElementById('createCardButton').addEventListener('click', () => {
    if (isModalOpen() && !makerScreen.hidden) {
        showScreen(homeScreen);
        return;
    }
    resetCardForm();
    renderCards();
    showScreen(makerScreen);
});
document.getElementById('randomStudyButton').addEventListener('click', () => {
    if (isModalOpen() && !studyScreen.hidden) {
        showScreen(homeScreen);
        return;
    }
    startStudy();
});

// the answers this card may be mixed up with
optionsToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const wasOpen = !optionsPanel.hidden;
    closeOptionPicker();
    if (wasOpen) return;
    renderOptionPicker();
    optionsPanel.hidden = false;
    optionsToggle.setAttribute('aria-expanded', 'true');
    // under the answer field, its right edge on the field's, one --tight below — the same step
    // as between the two fields above it
    const field = optionsToggle.closest('.maker-field') || optionsToggle;
    placeUnder(optionsPanel, field);
    optionsPanel.style.top = `${Math.round(field.getBoundingClientRect().bottom + 8)}px`;
});
optionsPanel.addEventListener('click', (event) => event.stopPropagation());

// card form
cardForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    // nothing to say about it — the empty field just takes the caret
    if (!question || !answer) {
        (question ? answerInput : questionInput).focus();
        return;
    }
    const card = { question, answer };
    const chosen = [...pendingOptions].filter((option) => option !== answer);
    if (chosen.length) card.options = chosen;
    if (editingCardIndex === null) {
        activeDeck().cards.push(card);
    } else {
        const deck = decks.find((item) => item.id === editingDeckId) || activeDeck();
        const old = deck.cards[editingCardIndex];
        if (old && old.stats) card.stats = old.stats;     // an edit keeps what practice knows about it
        deck.cards[editingCardIndex] = card;
    }

    const landed = editingCardIndex === null ? activeDeck().cards.length - 1 : editingCardIndex;
    resetCardForm();
    renderCards();
    renderDecks();
    saveDecks();
    const row = cardList.querySelector(`[data-card-index="${landed}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    questionInput.focus();
});

// right click
document.addEventListener('contextmenu', (event) => {
    const deckRow = event.target.closest('.deck-card');
    const cardItem = event.target.closest('.card-item, .stage-card');

    if (deckRow) {
        const deck = decks.find((item) => item.id === deckRow.dataset.deckId);
        if (deck) showContextMenu(event, { type: 'deck', deck });
        return;
    }
    if (cardItem) {
        showContextMenu(event, {
            type: 'card',
            deck: activeDeck(),
            index: Number(cardItem.dataset.cardIndex)
        });
        return;
    }
    if (event.target.closest('input, textarea')) {
        hideContextMenu();
        return;
    }
    showContextMenu(event, { type: 'page' });
});
contextMenu.addEventListener('contextmenu', (event) => event.preventDefault());
contextMenu.addEventListener('click', (event) => event.stopPropagation());

// clicking anywhere closes the menus
document.addEventListener('click', () => {
    hideContextMenu();
    closeSharePanel();
    disarmStageDelete();
    closeOptionPicker();
    closeWidgetPicks();
});

document.addEventListener('click', (event) => {
    if (!editingHome) return;
    if (event.target.closest('.widget-card, .widget-edit, .widget-add, #widgetPicks, .context-menu')) return;
    setHomeEditing(false);
});

let pressedVeil = false;
modalVeil.addEventListener('pointerdown', (event) => {
    pressedVeil = event.target === modalVeil;
});
modalVeil.addEventListener('click', (event) => {
    if (event.target === modalVeil && pressedVeil) showScreen(homeScreen);
    pressedVeil = false;
});
document.querySelectorAll('.modal-close').forEach((button) => {
    button.addEventListener('click', () => showScreen(homeScreen));
});

// clicking anywhere also advances a wrong answer
document.addEventListener('click', (event) => {
    if (!waitingForContinue) return;
    if (event.target.closest('.quick-action, .modal-close')) return;
    if (event.target === modalVeil) return;
    showNextQuestion();
});

document.addEventListener('keydown', (event) => {
    const tag = event.target.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && event.key !== 'Escape') return;

    const pressed = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && (pressed === 'y' || (pressed === 'z' && event.shiftKey))) {
        if (!redoStack.length) return;
        event.preventDefault();
        redoLastUndo();
        return;
    }
    if ((event.ctrlKey || event.metaKey) && pressed === 'z' && deletedStack.length) {
        event.preventDefault();
        undoLastDelete();
        return;
    }

    // any other browser or system shortcut is none of our business
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Escape') {
        if (armedDeleteRow) {
            disarmStageDelete();
            return;
        }
        if (!optionsPanel.hidden) {
            closeOptionPicker();
            return;
        }
        if (!widgetPicks.hidden) {
            closeWidgetPicks();
            return;
        }
        if (!sharePanel.hidden) {
            closeSharePanel();
            shareToggle.focus();
            return;
        }
        if (isModalOpen()) {
            showScreen(homeScreen);
            return;
        }
    }

    // after a wrong answer a key moves on — but not tab, shift, or the keys pressed on the way to
    // another window: tabbing away for a second used to throw the question away
    if (waitingForContinue) {
        if (['Tab', 'Shift', 'Meta', 'Alt', 'Control', 'CapsLock', 'Fn', 'OS'].includes(event.key)) return;
        showNextQuestion();
        return;
    }
    if (studyScreen.hidden || !isModalOpen()) return;

    const quadrant = quadrantForKey(event.code);
    if (quadrant === undefined) return;
    event.preventDefault();
    const optionButton = buttonForQuadrant(Number(quadrant));
    if (optionButton) optionButton.click();
});

/* ---------- 11. start ---------- */

function start() {
    loadDecks();
    loadSection();
    loadDeckColumn();
    renderDecks();
    renderCards();
    renderSections();
}

/* ---------- 12. capture, sensing, recording ---------- */

const recordToggle = document.getElementById('recordToggle');
const recordStatus = document.getElementById('recordStatus');
const recordingList = document.getElementById('recordingList');
const clearClipsButton = document.getElementById('clearClips');
const folderName = document.getElementById('folderName');
const folderScreen = document.getElementById('folderScreen');
const packClips = document.getElementById('packClips');
const unpackClips = document.getElementById('unpackClips');
const unpackInput = document.getElementById('unpackInput');
const previewWrap = document.getElementById('previewWrap');
const previewVideo = document.getElementById('previewVideo');
const senseBox = document.getElementById('senseBox');
const senseControls = document.getElementById('senseControls');
const senseReadout = document.getElementById('senseReadout');
const switchCount = document.getElementById('switchCount');
const liveLabel = document.getElementById('liveLabel');
const downloadAllButton = document.getElementById('downloadAll');
const senseToggle = document.getElementById('senseToggle');
const sensePop = document.getElementById('sensePop');
const senseReset = document.getElementById('senseReset');

const SENSE_KEYS = ['left', 'bottom', 'width', 'height', 'threshold'];
const previewStage = document.getElementById('previewStage');
const senseZoom = document.getElementById('senseZoom');
const senseZoomOut = document.getElementById('senseZoomOut');

const senseInputs = {
    left: document.getElementById('senseLeft'),
    bottom: document.getElementById('senseBottom'),
    width: document.getElementById('senseWidth'),
    height: document.getElementById('senseHeight'),
    threshold: document.getElementById('senseThreshold')
};
const senseOutputs = {
    left: document.getElementById('senseLeftOut'),
    bottom: document.getElementById('senseBottomOut'),
    width: document.getElementById('senseWidthOut'),
    height: document.getElementById('senseHeightOut'),
    threshold: document.getElementById('senseThresholdOut')
};

const DEFAULT_SENSE = { left: 4, bottom: 4, width: 25, height: 4, threshold: 1 };
let senseSettings = { ...DEFAULT_SENSE };

let activeStream = null;
let mediaRecorder = null;
let recordStartTime = 0;
let timerInterval = null;
let senseInterval = null;
let previousSample = null;
let triggerCount = 0;
let triggerFlashTimer = null;

const SAMPLE_SIZE = 48;
const sampleCanvas = document.createElement('canvas');
sampleCanvas.width = SAMPLE_SIZE;
sampleCanvas.height = SAMPLE_SIZE;
const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });

/* --- status --- */

function setRecordStatus(text, isError) {
    recordStatus.textContent = text;
    recordStatus.classList.toggle('is-error', Boolean(isError));
}

function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

/* --- the sensing box --- */

const ZOOM_KEY = 'sense-zoom';
let senseZoomAt = 100;      // where the picture is now
let zoomGoal = 100;         // and where it is heading
let zoomFrame = 0;
let zoomHold = null;        // the point of the picture being held still
let zoomBySlider = false;

function applyZoom(touchSlider) {
    previewStage.style.width = `${senseZoomAt}%`;
    if (touchSlider !== false) senseZoom.value = String(Math.round(senseZoomAt));
    senseZoomOut.textContent = `${Math.round(senseZoomAt)}%`;
    previewWrap.classList.toggle('is-zoomed', senseZoomAt > 100.5);
}

function loadZoom() {
    const saved = Number(window.localStorage.getItem(ZOOM_KEY));
    if (saved >= 100 && saved <= 500) senseZoomAt = saved;
    zoomGoal = senseZoomAt;
    applyZoom();
}

function glideZoom(last) {
    zoomFrame = 0;
    const now = performance.now();
    const step = Math.min((now - (last || now)) / 1000, 0.1);

    senseZoomAt += (zoomGoal - senseZoomAt) * Math.min(step * 17, 1);
    if (Math.abs(zoomGoal - senseZoomAt) < 0.15) senseZoomAt = zoomGoal;
    applyZoom(!zoomBySlider);

    if (zoomHold) {
        previewWrap.scrollLeft = zoomHold.pictureX * senseZoomAt - zoomHold.overX;
        previewWrap.scrollTop = zoomHold.pictureY * senseZoomAt - zoomHold.overY;
    }

    if (senseZoomAt !== zoomGoal) {
        zoomFrame = window.requestAnimationFrame(() => glideZoom(now));
        return;
    }

    zoomHold = null;
    zoomBySlider = false;
    try {
        window.localStorage.setItem(ZOOM_KEY, String(Math.round(zoomGoal)));
    } catch (error) {
        // it just won't be remembered
    }
}

function setZoom(next, holdX, holdY) {
    const wanted = Math.max(100, Math.min(500, next));
    if (Math.abs(wanted - zoomGoal) < 0.01) return;
    zoomGoal = wanted;

    if (!zoomHold) {
        const box = previewWrap.getBoundingClientRect();
        const overX = holdX === undefined ? previewWrap.clientWidth / 2 : holdX - box.left;
        const overY = holdY === undefined ? previewWrap.clientHeight / 2 : holdY - box.top;
        zoomHold = {
            overX,
            overY,
            pictureX: (previewWrap.scrollLeft + overX) / senseZoomAt,
            pictureY: (previewWrap.scrollTop + overY) / senseZoomAt
        };
    }
    if (!zoomFrame) zoomFrame = window.requestAnimationFrame(() => glideZoom());
}

senseZoom.addEventListener('input', () => {
    zoomBySlider = true;
    setZoom(Number(senseZoom.value));
});

previewWrap.addEventListener('wheel', (event) => {
    if (!previewWrap.classList.contains('showing-video')) return;

    // a line is about sixteen pixels, a page about the window
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? previewWrap.clientHeight : 1;
    const downY = event.deltaY * scale;
    const acrossX = event.deltaX * scale;

    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        // nothing to push at full frame — let it scroll whatever is under it
        if (senseZoomAt <= 100.5) return;
        event.preventDefault();
        previewWrap.scrollLeft += acrossX;
        previewWrap.scrollTop += downY;
        return;
    }

    event.preventDefault();
    zoomBySlider = false;
    const by = Math.min(1.18, Math.max(0.85, Math.exp(-downY * 0.0075)));
    setZoom(zoomGoal * by, event.clientX, event.clientY);
}, { passive: false });

function loadSenseSettings() {
    const saved = window.localStorage.getItem('sense-region');
    if (!saved) return;
    try {
        const parsed = JSON.parse(saved);
        SENSE_KEYS.forEach((key) => {
            if (typeof parsed[key] === 'number') senseSettings[key] = parsed[key];
        });
    } catch (error) {
        window.localStorage.removeItem('sense-region');
    }
}

function saveSenseSettings() {
    window.localStorage.setItem('sense-region', JSON.stringify(senseSettings));
}

function applySenseSettings() {
    senseSettings.width = Math.max(2, Math.min(100, senseSettings.width));
    senseSettings.height = Math.max(2, Math.min(100, senseSettings.height));
    senseSettings.left = Math.max(0, Math.min(senseSettings.left, 100 - senseSettings.width));
    senseSettings.bottom = Math.max(0, Math.min(senseSettings.bottom, 100 - senseSettings.height));

    SENSE_KEYS.forEach((key) => {
        senseInputs[key].value = senseSettings[key];
        senseOutputs[key].textContent = key === 'threshold'
            ? Math.round(senseSettings[key])
            : `${Math.round(senseSettings[key])}%`;
    });

    senseBox.style.left = `${senseSettings.left}%`;
    senseBox.style.bottom = `${senseSettings.bottom}%`;
    senseBox.style.width = `${senseSettings.width}%`;
    senseBox.style.height = `${senseSettings.height}%`;

    previousSample = null; // region moved, old frame is meaningless
}

SENSE_KEYS.forEach((key) => {
    senseInputs[key].addEventListener('input', () => {
        senseSettings[key] = Number(senseInputs[key].value);
        applySenseSettings();
        saveSenseSettings();
    });
});

function openSensing(open) {
    senseControls.hidden = !open;
    senseToggle.setAttribute('aria-expanded', String(open));
    previewWrap.classList.toggle('showing-video', open);
    audioPanel.classList.toggle('is-tuning', open);
    sensePop.classList.toggle('is-open', open);
}

senseToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    openSensing(senseControls.hidden);
});

window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (audioPanel.classList.contains('is-tuning')) openSensing(false);
});

senseReset.addEventListener('click', (event) => {
    event.stopPropagation();
    senseSettings = { ...DEFAULT_SENSE };
    applySenseSettings();
    saveSenseSettings();
});

/* --- dragging the settings panel --- */

let panelDrag = null;

document.querySelector('.panel-handle').addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    event.preventDefault();
    const box = senseControls.getBoundingClientRect();
    panelDrag = { x: event.clientX, y: event.clientY, top: box.top, left: box.left };
    senseControls.style.right = 'auto';
    senseControls.style.top = `${box.top}px`;
    senseControls.style.left = `${box.left}px`;
    senseControls.style.position = 'fixed';
    event.target.setPointerCapture(event.pointerId);
});

document.addEventListener('pointermove', (event) => {
    if (!panelDrag) return;
    senseControls.style.left = `${panelDrag.left + (event.clientX - panelDrag.x)}px`;
    senseControls.style.top = `${panelDrag.top + (event.clientY - panelDrag.y)}px`;
});

document.addEventListener('pointerup', () => { panelDrag = null; });

/* --- pushing the picture about, once it is bigger than its bar --- */

let pushStart = null;

previewWrap.addEventListener('pointerdown', (event) => {
    if (senseZoomAt <= 100.5) return;
    if (event.target.closest('.sense-box, .sense-controls')) return;
    event.preventDefault();       // no text or picture dragging off it
    pushStart = {
        x: event.clientX,
        y: event.clientY,
        left: previewWrap.scrollLeft,
        top: previewWrap.scrollTop
    };
    previewWrap.classList.add('is-pushing');
    previewWrap.setPointerCapture(event.pointerId);
});

previewWrap.addEventListener('pointermove', (event) => {
    if (!pushStart) return;
    previewWrap.scrollLeft = pushStart.left - (event.clientX - pushStart.x);
    previewWrap.scrollTop = pushStart.top - (event.clientY - pushStart.y);
});

['pointerup', 'pointercancel'].forEach((name) => {
    previewWrap.addEventListener(name, () => {
        pushStart = null;
        previewWrap.classList.remove('is-pushing');
    });
});

/* --- dragging the sensing box --- */

let dragMode = null;
let dragStart = null;

function boxPointerMode(event, box) {
    const sideways = Math.min(12, Math.max(4, box.width / 3));
    const upright = Math.min(12, Math.max(4, box.height / 3));
    const west = event.clientX - box.left <= sideways;
    const east = box.right - event.clientX <= sideways;
    const north = event.clientY - box.top <= upright;
    const south = box.bottom - event.clientY <= upright;

    return `${north ? 'n' : south ? 's' : ''}${west ? 'w' : east ? 'e' : ''}` || 'move';
}

// the cursor says what the press will do before you make it
const BOX_CURSORS = {
    move: 'move',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize'
};

senseBox.addEventListener('pointermove', (event) => {
    if (dragMode) return;   // mid-drag the cursor is already set
    senseBox.style.cursor = BOX_CURSORS[boxPointerMode(event, senseBox.getBoundingClientRect())];
});

senseBox.addEventListener('pointerdown', (event) => {
    if (!previewWrap.classList.contains('showing-video')) return;
    event.stopPropagation();
    event.preventDefault();

    const frame = previewVideo.getBoundingClientRect();
    dragMode = boxPointerMode(event, senseBox.getBoundingClientRect());
    dragStart = {
        x: event.clientX,
        y: event.clientY,
        frameWidth: frame.width,
        frameHeight: frame.height,
        ...senseSettings
    };
    senseBox.setPointerCapture(event.pointerId);
});

senseBox.addEventListener('pointermove', (event) => {
    if (!dragMode || !dragStart) return;

    // pixels moved, converted to percent of the frame
    const dx = (event.clientX - dragStart.x) / dragStart.frameWidth * 100;
    const dy = (event.clientY - dragStart.y) / dragStart.frameHeight * 100;

    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const mode = dragMode;
    const holds = (letter) => mode.includes(letter);

    if (mode === 'move') {
        senseSettings.left = clamp(dragStart.left + dx, 0, 100 - senseSettings.width);
        senseSettings.bottom = clamp(dragStart.bottom - dy, 0, 100 - senseSettings.height);
    } else {
        if (holds('e')) senseSettings.width = clamp(dragStart.width + dx, 2, 100 - dragStart.left);
        if (holds('w')) {
            const right = dragStart.left + dragStart.width;
            const left = clamp(dragStart.left + dx, 0, right - 2);
            senseSettings.left = left;
            senseSettings.width = right - left;
        }
        if (holds('n')) senseSettings.height = clamp(dragStart.height - dy, 2, 100 - dragStart.bottom);
        if (holds('s')) {
            const top = dragStart.bottom + dragStart.height;
            const bottom = clamp(dragStart.bottom - dy, 0, top - 2);
            senseSettings.bottom = bottom;
            senseSettings.height = top - bottom;
        }
    }

    applySenseSettings();
});

const endSenseDrag = (event) => {
    if (!dragMode) return;
    dragMode = null;
    dragStart = null;
    if (senseBox.hasPointerCapture(event.pointerId)) senseBox.releasePointerCapture(event.pointerId);
    saveSenseSettings();
};
senseBox.addEventListener('pointerup', endSenseDrag);
senseBox.addEventListener('pointercancel', endSenseDrag);

/* --- change detection --- */

function readRegion() {
    const frameWidth = previewVideo.videoWidth;
    const frameHeight = previewVideo.videoHeight;
    if (!frameWidth || !frameHeight) return null;

    const regionWidth = Math.max(1, Math.round(frameWidth * senseSettings.width / 100));
    const regionHeight = Math.max(1, Math.round(frameHeight * senseSettings.height / 100));
    const regionX = Math.round(frameWidth * senseSettings.left / 100);
    const regionY = Math.max(0, Math.round(
        frameHeight * (100 - senseSettings.bottom - senseSettings.height) / 100
    ));

    sampleContext.drawImage(
        previewVideo,
        regionX, regionY, regionWidth, regionHeight,
        0, 0, SAMPLE_SIZE, SAMPLE_SIZE
    );
    return sampleContext.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
}

function checkForChange() {
    const sample = readRegion();
    if (!sample) return;

    if (!previousSample) {
        previousSample = sample;
        return;
    }

    let total = 0;
    for (let index = 0; index < sample.length; index += 4) {
        total += Math.abs(sample[index] - previousSample[index])
            + Math.abs(sample[index + 1] - previousSample[index + 1])
            + Math.abs(sample[index + 2] - previousSample[index + 2]);
    }

    const pixelCount = sample.length / 4;
    const changeAmount = (total / (pixelCount * 3)) / 255 * 100;
    previousSample = sample;

    if (changeAmount >= senseSettings.threshold) {
        // cut immediately, but not twice for one switch
        const now = Date.now();
        if (now - lastCutAt > 700) {
            lastCutAt = now;
            triggerCount += 1;
            cutClip();
        }
        senseBox.classList.add('is-triggered');
        window.clearTimeout(triggerFlashTimer);
        triggerFlashTimer = window.setTimeout(() => {
            senseBox.classList.remove('is-triggered');
        }, 300);
    }

    senseReadout.textContent = `change ${changeAmount.toFixed(1)}`;
    switchCount.textContent = `${triggerCount} switch${triggerCount === 1 ? '' : 'es'}`;
}

function clipTotal() {
    return recordingList.querySelectorAll('.recording-item').length;
}

function refreshEmptyMessage() {
    const existing = recordingList.querySelector('.empty-message');
    const total = clipTotal();

    if (total === 0 && !existing) {
        const placeholder = document.createElement('li');
        placeholder.className = 'empty-message';
        placeholder.textContent = '.❛ ᴗ ❛.';
        recordingList.appendChild(placeholder);
    } else if (total > 0 && existing) {
        existing.remove();
    }

    clearClipsButton.disabled = total === 0;
    downloadAllButton.disabled = total === 0;
}

const confirmChip = document.getElementById('confirmChip');
const confirmChipText = document.getElementById('confirmChipText');
const confirmChipYes = document.getElementById('confirmChipYes');
const confirmChipNo = document.getElementById('confirmChipNo');
let openConfirm = null;   // { button, settle } while one is up

function placeUnder(panel, button, bounds) {
    if (!panel || !button) return;
    const spot = button.getBoundingClientRect();
    const box = { width: panel.offsetWidth, height: panel.offsetHeight };   // offset sizes: a panel arriving on a small scale reads short to getBoundingClientRect
    const edge = 8;
    const field = bounds || { left: edge, right: window.innerWidth - edge };
    let left = spot.right - box.width;        // right edges line up
    left = Math.max(field.left, Math.min(left, field.right - box.width));
    let top = spot.bottom + 6;
    // flip above the button when there's no room under it
    if (top + box.height > window.innerHeight - edge) top = spot.top - box.height - 6;
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(Math.max(edge, top))}px`;
}

function placeConfirm(button) {
    const field = appContent.getBoundingClientRect();
    const edge = 8;
    const bounds = { left: field.left + edge, right: field.right - edge };
    const spot = button.getBoundingClientRect();

    if (spot.left < field.left + field.width / 2) {
        confirmChip.style.transformOrigin = 'top left';
        const wide = confirmChip.offsetWidth;
        const left = Math.max(bounds.left, Math.min(spot.left, bounds.right - wide));
        let top = spot.bottom + 6;
        if (top + confirmChip.offsetHeight > window.innerHeight - edge) {
            top = spot.top - confirmChip.offsetHeight - 6;
        }
        confirmChip.style.left = `${Math.round(left)}px`;
        confirmChip.style.top = `${Math.round(Math.max(edge, top))}px`;
        return;
    }
    confirmChip.style.transformOrigin = 'top right';
    placeUnder(confirmChip, button, bounds);
}

function askConfirm(question, button) {
    // the same button again means "never mind"; a different one swaps
    if (openConfirm) {
        const wasAsking = openConfirm.button;
        openConfirm.settle(false);
        if (wasAsking === button) return Promise.resolve(false);
    }

    confirmChipText.textContent = question;
    confirmChipYes.hidden = false;          // the "row is full" note borrows the chip and hides these
    confirmChipNo.textContent = 'no';
    confirmChip.hidden = false;
    placeConfirm(button);
    if (button) button.classList.add('is-armed');

    return new Promise((resolve) => {
        function settle(answer) {
            window.clearTimeout(timer);
            confirmChipYes.removeEventListener('click', yes);
            confirmChipNo.removeEventListener('click', no);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onOutside);
            confirmChip.hidden = true;
            if (button) button.classList.remove('is-armed');
            openConfirm = null;
            resolve(answer);
        }
        const yes = () => settle(true);
        const no = () => settle(false);
        const onKey = (event) => { if (event.key === 'Escape') settle(false); };
        const onOutside = (event) => {
            if (confirmChip.contains(event.target)) return;
            if (button && button.contains(event.target)) return;
            settle(false);
        };
        const timer = window.setTimeout(() => settle(false), 6000);

        confirmChipYes.addEventListener('click', yes);
        confirmChipNo.addEventListener('click', no);
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onOutside);
        openConfirm = { button, settle };
        confirmChipYes.focus();
    });
}

async function clearAllClips() {
    const total = recordingList.querySelectorAll('.recording-item').length;
    if (!total) return;
    const sure = await askConfirm(`bin all ${total} clip${total === 1 ? '' : 's'}? no undo`, clearClipsButton);
    if (!sure) return;

    recordingList.querySelectorAll('audio').forEach((player) => {
        player.pause();
        if (player.src.startsWith('blob:')) URL.revokeObjectURL(player.src);
        player.src = '';
    });
    recordingList.innerHTML = '';
    clipRows.clear();

    try {
        const db = await openClipDb();
        const tx = db.transaction(CLIP_STORE, 'readwrite');
        tx.objectStore(CLIP_STORE).clear();
    } catch (error) {
        setRecordStatus('could not clear the saved clips', true);
    }
    clipCount = 0;
    refreshEmptyMessage();
    rememberClipOrder();
    paintWidgets();
}

clearClipsButton.addEventListener('click', clearAllClips);

/* --- carrying the clips to another address --- */

const PACK_MARK = 'RECALLCLIPS1';

function buildBundle(stored) {
    const header = stored.map((record) => ({
        id: record.id,
        number: record.number,
        name: record.name || '',
        duration: record.duration,
        durationMs: record.durationMs,
        trim: record.trim || null,
        type: (record.blob && record.blob.type) || 'audio/webm',
        size: record.blob ? record.blob.size : 0
    }));

    const words = new TextEncoder().encode(JSON.stringify(header));
    const parts = [`${PACK_MARK}\n${words.length}\n`, words, ...stored.map((record) => record.blob)];
    return new Blob(parts, { type: 'application/octet-stream' });
}

async function packAllClips() {
    const named = `recall-clips-${new Date().toISOString().slice(0, 10)}.call`;

    const sure = await askConfirm('save current yummy fat clips', packClips);
    if (!sure) return;

    const stored = await storedClipsInOrder();
    if (!stored.length) {
        setRecordStatus('nothing to save', true);
        return;
    }

    setRecordStatus(`packing ${stored.length} clip${stored.length === 1 ? '' : 's'}...`);
    const bundle = buildBundle(stored);
    const much = `${stored.length} clips saved — ${Math.round(bundle.size / 1048576)}mb`;

    saveBlob(bundle, named);
    setRecordStatus(much);
}

async function unpackClipsFrom(file) {
    const head = new TextDecoder().decode(await file.slice(0, 64).arrayBuffer());
    const lines = head.split('\n');
    if (lines[0] !== PACK_MARK) {
        setRecordStatus('that is not a clips file', true);
        return;
    }
    const wordCount = Number(lines[1]);
    const from = lines[0].length + 1 + lines[1].length + 1;
    let header;
    try {
        header = JSON.parse(new TextDecoder().decode(
            await file.slice(from, from + wordCount).arrayBuffer()
        ));
    } catch (error) {
        setRecordStatus('that file is damaged', true);
        return;
    }

    const here = new Set([...recordingList.querySelectorAll('.recording-item')]
        .map((row) => row.dataset.clipId));

    let at = from + wordCount;
    let brought = 0;
    for (const entry of header) {
        const blob = file.slice(at, at + entry.size, entry.type);
        at += entry.size;
        if (here.has(entry.id)) continue;

        clipCount += 1;
        const record = {
            id: entry.id,
            number: clipCount,
            name: entry.name || '',
            duration: entry.duration,
            durationMs: entry.durationMs,
            trim: entry.trim || null,
            blob
        };
        await saveClip(record);
        addRecording(record, true, true);
        brought += 1;
        setRecordStatus(`bringing them in... ${brought} of ${header.length}`);
    }

    rememberClipOrder();
    paintWidgets();
    setRecordStatus(brought
        ? `${brought} clip${brought === 1 ? '' : 's'} brought in`
        : 'they are all here already');
}

packClips.addEventListener('click', () => {
    packAllClips().catch((error) => setRecordStatus(`could not save them — ${error.message}`, true));
});
/* --- the clip files, listed here rather than by the browser --- */

const bundleScreen = document.getElementById('bundleScreen');
const bundleList = document.getElementById('bundleList');
const bundleSay = document.getElementById('bundleSay');
const bundleWhere = document.getElementById('bundleWhere');

function sizeSaid(bytes) {
    if (bytes >= 1048576) return `${Math.round(bytes / 1048576)}mb`;
    return `${Math.max(1, Math.round(bytes / 1024))}kb`;
}

let bundleKind = { match: /\.call$/i, title: 'bring clips in', take: null };

async function bundlesIn(folder) {
    const found = [];
    for await (const entry of folder.values()) {
        if (entry.kind !== 'file' || !bundleKind.match.test(entry.name)) continue;
        try {
            found.push(await entry.getFile());
        } catch (error) {
            // gone between the listing and the opening
        }
    }
    return found.sort((a, b) => b.lastModified - a.lastModified);
}

function paintBundles(files, where) {
    bundleList.innerHTML = '';
    if (!files.length) {
        bundleSay.textContent = where
            ? `nothing in ${where} that this page can read`
            : 'pick the folder your clip file is in';
        return;
    }
    bundleSay.textContent = `in ${where}`;
    files.forEach((file) => {
        const row = document.createElement('li');
        const pick = document.createElement('button');
        pick.className = 'bundle-one';
        pick.type = 'button';

        const name = document.createElement('strong');
        name.textContent = file.name.replace(/\.[a-z0-9]+$/i, '');
        const much = document.createElement('small');
        much.textContent = sizeSaid(file.size);
        pick.append(name, much);

        pick.addEventListener('click', async () => {
            showScreen(homeScreen);
            try { await bundleKind.take(file); } catch (error) { setRecordStatus(`could not read it — ${error.message}`, true); }
        });
        row.append(pick);
        bundleList.append(row);
    });
}

async function showBundles(folder) {
    try {
        paintBundles(await bundlesIn(folder), folder.name);
    } catch (error) {
        paintBundles([], null);
    }
}

async function askForBundleFolder() {
    if (!window.showDirectoryPicker) return null;
    let folder;
    try {
        folder = await window.showDirectoryPicker({ id: 'recall-drops', mode: 'read', startIn: 'downloads' });
    } catch (error) {
        return null;                        // they changed their mind
    }
    await keepHandle(folder, 'drops');
    return folder;
}

async function openBundles(kind) {
    bundleKind = kind;
    document.querySelector('#bundleScreen .modal-title').textContent = kind.title;
    paintBundles([], null);
    showScreen(bundleScreen);

    let folder = await heldHandle('drops');
    if (folder && !(await stillAllowed(folder, 'read').catch(() => false))) folder = null;
    if (!folder) folder = await askForBundleFolder();
    if (!folder) {
        showScreen(homeScreen);
        return;
    }
    await showBundles(folder);
}

bundleWhere.addEventListener('click', async () => {
    const folder = await askForBundleFolder();
    if (folder) await showBundles(folder);
});

const saySwap = document.getElementById('saySwap');
let sayingShort = false;
saySwap.addEventListener('click', () => {
    sayingShort = !sayingShort;
    // the word stays the same; the underline is what says which is up
    saySwap.classList.toggle('is-on', sayingShort);
    ['sayLong', 'stepsLong'].forEach((id) => { document.getElementById(id).hidden = sayingShort; });
    ['sayShort', 'stepsShort'].forEach((id) => { document.getElementById(id).hidden = !sayingShort; });
});

const CLIP_BUNDLES = {
    match: /\.call$/i,
    title: 'bring clips in',
    take: (file) => unpackClipsFrom(file)
};

const PLAYLIST_EXPORTS = {
    match: /\.(csv|tsv)$/i,
    title: 'find an export',
    take: (file) => takeListFile(file)
};

unpackClips.addEventListener('click', () => {
    if (window.showDirectoryPicker) openBundles(CLIP_BUNDLES);
    else unpackInput.click();
});

document.getElementById('listFind').addEventListener('click', () => {
    if (window.showDirectoryPicker) openBundles(PLAYLIST_EXPORTS);
    else scratchFile.click();
});
unpackInput.addEventListener('change', () => {
    const file = unpackInput.files && unpackInput.files[0];
    unpackInput.value = '';   // the same file can be picked again
    if (file) unpackClipsFrom(file).catch((error) => setRecordStatus(`could not read it — ${error.message}`, true));
});

async function storedClipsInOrder() {
    const db = await openClipDb();
    const stored = await readAll(db, CLIP_STORE);
    const shown = [...recordingList.querySelectorAll('.recording-item')]
        .map((row) => row.dataset.clipId);
    return stored.sort((a, b) => {
        const left = shown.indexOf(a.id);
        const right = shown.indexOf(b.id);
        if (left === -1 || right === -1) return b.number - a.number;
        return right - left;
    });
}

let batchRunning = false;
let batchPaused = false;

function showBatchState() {
    const packing = batchRunning && !batchPaused;
    downloadAllButton.classList.toggle('is-packing', packing);
    const label = !batchRunning ? 'every clip to a folder'
        : packing ? 'pause' : 'carry on';
    downloadAllButton.setAttribute('aria-label', label);
    downloadAllButton.title = label;
}

/* --- a folder without asking for one: a zip --- */

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let at = 0; at < 256; at += 1) {
        let value = at;
        for (let round = 0; round < 8; round += 1) {
            value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
        }
        table[at] = value >>> 0;
    }
    return table;
})();

function crcOf(bytes) {
    let crc = 0xffffffff;
    for (let at = 0; at < bytes.length; at += 1) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[at]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function zipWord(value, wide) {
    const out = new Uint8Array(wide);
    for (let at = 0; at < wide; at += 1) out[at] = (value >>> (at * 8)) & 0xff;
    return out;
}

function dosWhen(when) {
    const at = when || new Date();
    const date = ((at.getFullYear() - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate();
    const time = (at.getHours() << 11) | (at.getMinutes() << 5) | Math.floor(at.getSeconds() / 2);
    return { date, time };
}

function zipPiece(parts) {
    const out = new Uint8Array(parts.reduce((much, one) => much + one.length, 0));
    let at = 0;
    parts.forEach((one) => { out.set(one, at); at += one.length; });
    return out;
}

function zipEntry(name, bytes, at, when) {
    const called = new TextEncoder().encode(name);
    const { date, time } = dosWhen(when);
    const crc = crcOf(bytes);

    const local = zipPiece([
        zipWord(0x04034b50, 4), zipWord(20, 2), zipWord(0x0800, 2), zipWord(0, 2),
        zipWord(time, 2), zipWord(date, 2),
        zipWord(crc, 4), zipWord(bytes.length, 4), zipWord(bytes.length, 4),
        zipWord(called.length, 2), zipWord(0, 2), called
    ]);

    const middle = zipPiece([
        zipWord(0x02014b50, 4), zipWord(20, 2), zipWord(20, 2), zipWord(0x0800, 2), zipWord(0, 2),
        zipWord(time, 2), zipWord(date, 2),
        zipWord(crc, 4), zipWord(bytes.length, 4), zipWord(bytes.length, 4),
        zipWord(called.length, 2), zipWord(0, 2), zipWord(0, 2),
        zipWord(0, 2), zipWord(0, 2), zipWord(0, 4), zipWord(at, 4), called
    ]);

    return { local, middle, much: local.length + bytes.length };
}

function zipEnd(middles, where, much) {
    return zipPiece([
        zipWord(0x06054b50, 4), zipWord(0, 2), zipWord(0, 2),
        zipWord(middles, 2), zipWord(middles, 2),
        zipWord(much, 4), zipWord(where, 4), zipWord(0, 2)
    ]);
}

/* --- the folder the mp3s go into --- */

const HOME_DB = 'recall-home';
const HOME_STORE = 'home';
const FOLDER_KEY = 'clip-folder-name';

function openHomeDb() {
    return openDb(HOME_DB, HOME_STORE, false);
}

async function keepHandle(handle, called) {
    try {
        const db = await openHomeDb();
        const tx = db.transaction(HOME_STORE, 'readwrite');
        tx.objectStore(HOME_STORE).put(handle, called);
    } catch (error) {
        // it will just ask again next time
    }
}

async function heldHandle(called) {
    try {
        const db = await openHomeDb();
        return await new Promise((resolve) => {
            const request = db.transaction(HOME_STORE, 'readonly').objectStore(HOME_STORE).get(called);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
        });
    } catch (error) {
        return null;
    }
}

async function stillAllowed(handle, mode) {
    try {
        const asked = { mode: mode || 'readwrite' };
        if (await handle.queryPermission(asked) === 'granted') return true;
        return await handle.requestPermission(asked) === 'granted';
    } catch (error) {
        return false;
    }
}

// a folder name with nothing in it that a folder name can't hold
function tidyFolder(typed) {
    return String(typed || '')
        .replace(/[/\\:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\.+/, '')
        .trim()
        .slice(0, 60);
}

async function folderFor(called, startIn) {
    const where = `parent:${startIn || 'downloads'}`;
    let parent = await heldHandle(where);
    if (parent && !(await stillAllowed(parent))) parent = null;

    if (!parent) {
        if (!window.showDirectoryPicker) return null;
        try {
            parent = await window.showDirectoryPicker({
                id: 'recall-clips',
                mode: 'readwrite',
                startIn: startIn || 'downloads'
            });
        } catch (error) {
            return error && error.name === 'AbortError' ? 'stop' : null;
        }
        await keepHandle(parent, where);
    }

    // no name typed: straight into the place itself
    if (!called) return parent;
    try {
        return await parent.getDirectoryHandle(called, { create: true });
    } catch (error) {
        setRecordStatus(`could not make a folder called ${called}`, true);
        return parent;
    }
}

const folderNameBar = document.getElementById('folderNameBar');
const folderFields = [folderName, folderNameBar];

folderFields.forEach((field) => {
    field.value = window.localStorage.getItem(FOLDER_KEY) || '';
    field.addEventListener('input', () => {
        window.localStorage.setItem(FOLDER_KEY, field.value);
        folderFields.forEach((other) => { if (other !== field) other.value = field.value; });
        paintPlaces();
    });
});

/* --- the window that asks where --- */

const folderGo = document.getElementById('folderGo');
const folderPick = document.getElementById('folderPick');
const placeWanted = 'downloads';

const folderSay = document.getElementById('folderSay');

// what the press will do, said as the name is typed
function paintPlaces() {
    const called = tidyFolder(folderName.value) || 'clips';
    folderSay.textContent = `${called}.zip lands in your downloads — open it and `
        + `there is your ${called} folder, with the songs in it`;
}

folderGo.addEventListener('click', () => {
    showScreen(homeScreen);
    downloadAllClips(null);        // no folder: it comes back as one zip
});

folderPick.addEventListener('click', async () => {
    const folder = await folderFor(tidyFolder(folderName.value), placeWanted);
    if (folder === 'stop') return;              // they closed the picker
    showScreen(homeScreen);
    downloadAllClips(folder);
});

paintPlaces();

function freeName(taken, wanted) {
    if (!taken.has(wanted)) {
        taken.add(wanted);
        return wanted;
    }
    const stop = wanted.lastIndexOf('.');
    const stem = stop === -1 ? wanted : wanted.slice(0, stop);
    const tail = stop === -1 ? '' : wanted.slice(stop);
    for (let again = 2; ; again += 1) {
        const tried = `${stem} (${again})${tail}`;
        if (!taken.has(tried)) {
            taken.add(tried);
            return tried;
        }
    }
}

async function downloadAllClips(folder) {
    if (downloadAllButton.disabled) return;
    let clips;
    try {
        clips = await storedClipsInOrder();
    } catch (error) {
        setRecordStatus('could not read the saved clips', true);
        return;
    }
    if (!clips.length) return;

    // it stays live — it's the pause button now
    batchRunning = true;
    batchPaused = false;
    showBatchState();

    let done = 0;
    const taken = new Set();
    const zipName = `${tidyFolder(folderName.value) || 'clips'}.zip`;
    const zipParts = [];
    const zipMiddles = [];
    let zipAt = 0;
    const inZip = !folder;
    for (const record of clips) {
        while (batchPaused) {
            setRecordStatus(`held at ${done} of ${clips.length}`);
            await new Promise((resolve) => window.setTimeout(resolve, 200));
        }
        setRecordStatus(folder
            ? `packing ${done + 1} of ${clips.length} into ${folder.name}...`
            : `packing ${done + 1} of ${clips.length}...`);
        const row = recordingList.querySelector(`[data-clip-id="${record.id}"]`);
        if (row) {
            row.classList.add('is-packing');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        try {
            // a cropped clip goes out cropped here too
            const mp3 = await blobToMp3(record.blob, clipSpan(record, record.durationMs / 1000),
                                       { ...splitName(record.name), track: done + 1 });
            const called = freeName(taken, clipFileName(record, done + 1, clips.length));
            if (folder) {
                // straight into the folder you chose, no download at all
                const file = await folder.getFileHandle(called, { create: true });
                const out = await file.createWritable();
                await out.write(mp3);
                await out.close();
            } else {
                const bytes = new Uint8Array(await mp3.arrayBuffer());
                const entry = zipEntry(called, bytes, zipAt, new Date());
                zipParts.push(entry.local, bytes);
                zipMiddles.push(entry.middle);
                zipAt += entry.much;
            }
            done += 1;
        } catch (error) {
            setRecordStatus(`clip ${record.number} failed — ${error.message}`, true);
            if (row) row.classList.add('is-packing-failed');
        }
        if (row) row.classList.remove('is-packing');
    }

    // and the zip is sealed and handed over as one file
    if (inZip && done) {
        const middles = zipPiece(zipMiddles);
        const bundle = new Blob([...zipParts, middles, zipEnd(zipMiddles.length, zipAt, middles.length)],
                                { type: 'application/zip' });
        saveBlob(bundle, zipName);
    }
    setRecordStatus(done !== clips.length ? `only ${done} of ${clips.length} worked`
        : folder ? `${done} saved into ${folder.name}`
        : `${done} in ${zipName} — open it for the folder`,
        done !== clips.length);
    batchRunning = false;
    batchPaused = false;
    showBatchState();
    refreshEmptyMessage();
}

downloadAllButton.addEventListener('click', async () => {
    if (batchRunning) {
        batchPaused = !batchPaused;
        showBatchState();
        return;
    }

    // the window asks the name and the place; its own press does the rest
    paintPlaces();
    showScreen(folderScreen);
});

/* --- clip storage (survives refresh) --- */

const CLIP_DB = 'recall-clips';
const CLIP_STORE = 'clips';

function openClipDb() {
    return openDb(CLIP_DB, CLIP_STORE, true);
}

async function saveClip(record) {
    try {
        const db = await openClipDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(CLIP_STORE, 'readwrite');
            tx.objectStore(CLIP_STORE).put(record);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        setRecordStatus('could not save that clip', true);
    }
}

async function deleteClip(id) {
    try {
        const db = await openClipDb();
        const tx = db.transaction(CLIP_STORE, 'readwrite');
        tx.objectStore(CLIP_STORE).delete(id);
    } catch (error) {
        // nothing useful to do; the row is already gone from the page
    }
}

async function loadStoredClips() {
    try {
        const db = await openClipDb();
        const stored = await readAll(db, CLIP_STORE);

        stored.forEach((record) => {
            if (record.number > clipCount) clipCount = record.number;
        });

        const order = savedClipOrder();
        const rank = (record) => {
            const place = order.indexOf(record.id);
            return place === -1 ? -record.number : place + order.length;
        };
        stored.sort((a, b) => rank(a) - rank(b));
        stored.forEach((record) => addRecording(record, true, true));
    } catch (error) {
        // no stored clips, or storage unavailable
    }
    refreshEmptyMessage();
}

/* --- clip names into file names --- */

const FILE_NAME_TWINS = {
    '/': '\u2215',   // division slash
    '\\': '\u29f5',  // reverse solidus operator
    ':': '\uA789',   // modifier letter colon
    '*': '\u2217',   // asterisk operator
    '?': '\uFF1F',   // fullwidth question mark
    '"': '\u201D',   // right double quote
    '<': '\u2039',   // single left angle quote
    '>': '\u203A',   // single right angle quote
    '|': '\u2223',   // divides
};

function clipFileName(record, at, total) {
    const named = splitName(record.name);
    const raw = named.artist
        ? `${named.title} - ${named.artist}`
        : (record.name || `clip-${record.number}`);
    const safe = raw
        .replace(/[/\\:*?"<>|]/g, (char) => FILE_NAME_TWINS[char])
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/^\.+/, '')
        .trim();
    const called = safe || `clip-${record.number}`;
    if (!at) return `${called}.mp3`;
    const wide = String(total || at).length;
    return `${String(at).padStart(wide, '0')} ${called}.mp3`;
}

// where a clip sits counting up from the bottom, as the row shows it
function clipPlace(record) {
    const row = recordingList.querySelector(`[data-clip-id="${record.id}"] .clip-number`);
    return row ? Number(row.textContent) || 0 : 0;
}

/* --- webm/opus -> mp3, only when a clip is downloaded --- */

function id3Tag(tags) {
    const frames = [];
    const put = (id, words) => {
        if (!words) return;
        const body = [1, 0xff, 0xfe];   // utf-16, little endian
        for (let at = 0; at < words.length; at += 1) {
            const code = words.charCodeAt(at);
            body.push(code & 0xff, code >> 8);
        }
        body.push(0, 0);
        const size = body.length;
        frames.push(
            ...[...id].map((letter) => letter.charCodeAt(0)),
            (size >> 24) & 0xff, (size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff,
            0, 0,
            ...body
        );
    };
    put('TIT2', tags.title);
    put('TPE1', tags.artist);
    // so a player orders them the way the list does, not alphabetically
    put('TRCK', tags.track ? String(tags.track) : '');
    if (!frames.length) return new Uint8Array(0);

    const total = frames.length;
    // the header's own length is written seven bits to the byte
    const head = [
        0x49, 0x44, 0x33, 3, 0, 0,
        (total >> 21) & 0x7f, (total >> 14) & 0x7f, (total >> 7) & 0x7f, total & 0x7f
    ];
    return new Uint8Array([...head, ...frames]);
}

async function blobToMp3(blob, span, tags) {
    const context = new AudioContext();
    let audio;
    try { audio = await context.decodeAudioData(await blob.arrayBuffer()); } finally { context.close(); }

    const from = span ? Math.max(0, Math.floor(span.start * audio.sampleRate)) : 0;
    const to = span && span.end ? Math.min(audio.length, Math.ceil(span.end * audio.sampleRate)) : audio.length;
    const cut = (channel) => new Float32Array(audio.getChannelData(channel).subarray(from, to));

    const left = cut(0);
    const right = audio.numberOfChannels > 1 ? cut(1) : null;

    const worker = new Worker('mp3-worker.js');
    try {
        const mp3 = await new Promise((resolve, reject) => {
            worker.onmessage = (event) => {
                if (event.data.ok) resolve(event.data.mp3);
                else reject(new Error(event.data.message));
            };
            worker.onerror = () => reject(new Error('mp3 worker failed to start'));

            const payload = { left: left.buffer, right: right && right.buffer, sampleRate: audio.sampleRate };
            const transfer = right ? [left.buffer, right.buffer] : [left.buffer];
            worker.postMessage(payload, transfer);
        });
        const tag = tags ? id3Tag(tags) : null;
        return new Blob(tag && tag.length ? [tag, mp3] : [mp3], { type: 'audio/mpeg' });
    } finally {
        worker.terminate();
    }
}

/* --- recordings list --- */

function clipStart(record) {
    return record.trim ? record.trim.start : 0;
}
function clipEnd(record, whole) {
    return record.trim ? record.trim.end : whole;
}
function clipSpan(record, whole) {
    const start = Math.max(0, clipStart(record));
    const end = Math.min(whole || 0, clipEnd(record, whole));
    return { start, end, length: Math.max(0, end - start) };
}

const clipRows = new Map();

function numberClips() {
    const rows = [...recordingList.querySelectorAll('.recording-item')];
    rows.forEach((row, index) => {
        const mark = row.querySelector('.clip-number');
        if (mark) mark.textContent = String(rows.length - index);
    });
}

function addRecording(record, alreadySaved, atEnd) {
    const item = document.createElement('li');
    item.className = 'recording-item';
    item.dataset.clipId = record.id;

    // where this clip sits counting up from the bottom of the list
    const number = document.createElement('span');
    number.className = 'clip-number';

    const offMark = document.createElement('span');
    offMark.className = 'clip-off';
    offMark.textContent = '!';
    offMark.hidden = true;

    let url = null;
    const player = document.createElement('audio');
    player.preload = 'none';

    const loadPlayer = () => {
        if (url) return;
        url = URL.createObjectURL(record.blob);
        player.src = url;
    };

    // play / pause
    const playButton = document.createElement('button');
    playButton.className = 'clip-play';
    playButton.type = 'button';
    playButton.setAttribute('aria-label', `play clip ${record.number}`);
    playButton.textContent = '▶';
    playButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (player.paused) {
            document.querySelectorAll('.recording-item audio').forEach((other) => {
                if (other !== player) other.pause();
            });
            loadPlayer();
            player.play().catch(() => {});
        } else {
            player.pause();
        }
    });

    player.addEventListener('play', () => {
        playButton.textContent = '❙❙';
        item.classList.add('is-playing');
    });
    player.addEventListener('pause', () => {
        playButton.textContent = '▶';
        item.classList.remove('is-playing');
    });
    player.addEventListener('ended', () => {
        player.currentTime = clipStart(record);
        paintProgress();
    });

    // progress bar, scrubbable
    const track = document.createElement('div');
    track.className = 'clip-track';
    const fill = document.createElement('div');
    fill.className = 'clip-fill';

    const trackText = document.createElement('span');
    trackText.className = 'clip-text';
    trackText.textContent = record.name || `clip ${record.number}`;

    const shadeLeft = document.createElement('span');
    shadeLeft.className = 'crop-shade is-left';
    const shadeRight = document.createElement('span');
    shadeRight.className = 'crop-shade is-right';
    const handleStart = document.createElement('span');
    handleStart.className = 'crop-handle is-start';
    const handleEnd = document.createElement('span');
    handleEnd.className = 'crop-handle is-end';

    track.append(fill, shadeLeft, shadeRight, trackText);

    const trackWrap = document.createElement('div');
    trackWrap.className = 'clip-track-wrap';
    trackWrap.append(track, handleStart, handleEnd);

    const totalSeconds = record.durationMs ? record.durationMs / 1000 : 0;

    const isEditing = () => trackText.classList.contains('is-editing');

    const paintCrop = () => {
        const { start, end } = clipSpan(record, totalSeconds);
        const from = totalSeconds ? (start / totalSeconds) * 100 : 0;
        const to = totalSeconds ? (end / totalSeconds) * 100 : 100;
        shadeLeft.style.width = `${from}%`;
        shadeRight.style.left = `${to}%`;
        shadeRight.style.width = `${100 - to}%`;
        handleStart.style.left = `${from}%`;
        handleEnd.style.left = `${to}%`;
        item.classList.toggle('is-trimmed', Boolean(record.trim));
    };

    const paintProgress = () => {
        const { start, end, length } = clipSpan(record, totalSeconds);
        const at = Math.min(Math.max(player.currentTime, start), end);
        const through = length ? (at - start) / length : 0;
        fill.style.left = `${totalSeconds ? (start / totalSeconds) * 100 : 0}%`;
        fill.style.width = `${totalSeconds ? (through * length / totalSeconds) * 100 : 0}%`;
        label.textContent = `${formatDuration((at - start) * 1000)} / ${formatDuration(length * 1000)}`;
        paintCrop();
    };

    const seekTo = (clientX) => {
        if (isEditing() || !totalSeconds) return;
        loadPlayer();
        const { start, end } = clipSpan(record, totalSeconds);
        const box = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
        player.currentTime = Math.min(Math.max(ratio * totalSeconds, start), end);
        paintProgress();
    };

    // a plain click landing on the name is for renaming, not seeking
    const overText = (clientX) => {
        const box = trackText.getBoundingClientRect();
        return clientX >= box.left - 2 && clientX <= box.right + 2;
    };

    track.addEventListener('click', (event) => {
        event.stopPropagation();
        if (overText(event.clientX)) return;
        seekTo(event.clientX);
    });

    track.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        if (isEditing()) return;
        const startX = event.clientX;
        let isDragging = false;

        // a few stray pixels while double-clicking the name shouldn't seek
        const onMouseMove = (e) => {
            if (!isDragging && Math.abs(e.clientX - startX) < 4) return;
            isDragging = true;
            seekTo(e.clientX);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    const GAP = 0.5;
    const dragHandle = (handle, which) => {
        handle.addEventListener('pointerdown', (event) => {
            if (event.button || !totalSeconds) return;
            event.stopPropagation();
            event.preventDefault();
            handle.setPointerCapture(event.pointerId);
            item.classList.add('is-cropping-now');

            const move = (moveEvent) => {
                const box = track.getBoundingClientRect();
                const at = Math.min(1, Math.max(0, (moveEvent.clientX - box.left) / box.width)) * totalSeconds;
                const span = clipSpan(record, totalSeconds);
                const trim = record.trim || { start: 0, end: totalSeconds };
                if (which === 'start') trim.start = Math.min(at, span.end - GAP);
                else trim.end = Math.max(at, span.start + GAP);
                trim.start = Math.max(0, trim.start);
                trim.end = Math.min(totalSeconds, trim.end);
                record.trim = trim;
                paintProgress();
            };
            const stop = () => {
                handle.removeEventListener('pointermove', move);
                handle.removeEventListener('pointerup', stop);
                handle.removeEventListener('pointercancel', stop);
                item.classList.remove('is-cropping-now');
                // a crop that covers the whole thing is no crop at all
                if (record.trim && record.trim.start <= 0.02
                    && record.trim.end >= totalSeconds - 0.02) record.trim = null;
                paintProgress();
                saveClip(record);
            };
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', stop);
            handle.addEventListener('pointercancel', stop);
        });
    };
    dragHandle(handleStart, 'start');
    dragHandle(handleEnd, 'end');

    // double-click the bar to rename the clip
    track.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        if (isEditing()) return;
        trackText.classList.add('is-editing');
        trackText.contentEditable = 'plaintext-only';
        trackText.focus();
        const range = document.createRange();
        range.selectNodeContents(trackText);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });

    const stopEditing = (keep) => {
        if (!isEditing()) return;
        const typed = trackText.textContent.trim();
        if (keep && typed) record.name = typed;
        trackText.textContent = record.name || `clip ${record.number}`;
        trackText.classList.remove('is-editing');
        trackText.contentEditable = 'false';
        window.getSelection().removeAllRanges();
        if (keep && typed) saveClip(record);
    };

    trackText.addEventListener('blur', () => stopEditing(true));
    trackText.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            trackText.blur();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            stopEditing(false);
        }
    });

    player.addEventListener('timeupdate', () => {
        if (!totalSeconds) return;
        const { start, end } = clipSpan(record, totalSeconds);
        if (player.currentTime >= end - 0.02) {
            player.pause();
            player.currentTime = start;
        }
        paintProgress();
    });
    player.addEventListener('play', () => {
        const { start, end } = clipSpan(record, totalSeconds);
        if (player.currentTime < start || player.currentTime >= end) player.currentTime = start;
    });

    // label with duration
    const label = document.createElement('span');
    label.className = 'clip-label';

    const crop = document.createElement('button');
    crop.className = 'clip-crop';
    crop.type = 'button';
    crop.setAttribute('aria-pressed', 'false');
    crop.setAttribute('aria-label', `crop clip ${record.number}`);
    crop.title = 'crop — drag the marks, they can be dragged back';
    crop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'
        + '<path d="M8 4 H5 V20 H8 M16 4 H19 V20 H16" fill="none" stroke="currentColor"'
        + ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    crop.addEventListener('click', (event) => {
        event.stopPropagation();
        const on = !item.classList.contains('is-cropping');
        item.classList.toggle('is-cropping', on);
        crop.setAttribute('aria-pressed', String(on));
        paintCrop();
    });

    const download = document.createElement('button');
    download.className = 'clip-download';
    download.type = 'button';
    download.setAttribute('aria-label', `download clip ${record.number}`);
    download.textContent = '↓';
    download.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (download.disabled) return;
        download.disabled = true;
        download.classList.add('is-working');
        try {
            const mp3 = await blobToMp3(record.blob, clipSpan(record, totalSeconds),
                                       { ...splitName(record.name), track: clipPlace(record) });
            saveBlob(mp3, clipFileName(record, clipPlace(record), clipCount));
        } catch (error) {
            console.error('mp3 export failed', error);
            setRecordStatus(`mp3 failed — ${error.message}`, true);
        }
        download.disabled = false;
        download.classList.remove('is-working');
    });

    const discard = document.createElement('button');
    discard.className = 'clip-discard';
    discard.type = 'button';
    discard.setAttribute('aria-label', `discard clip ${record.number}`);
    discard.textContent = '×';
    discard.addEventListener('click', (event) => {
        event.stopPropagation();
        binClip(item, record);       // nothing asked before this one, so it has to be undoable
    });

    const handle = rowGrip(item, 'clip-handle', `reorder clip ${record.number}, use arrow keys`, clipLiftConfig);

    item.append(handle, number, playButton, trackWrap, label, offMark, crop, download, discard, player);
    paintProgress();
    if (atEnd) recordingList.append(item);
    else recordingList.prepend(item);
    refreshEmptyMessage();

    clipRows.set(record.id, {
        record,
        item,
        seconds: () => clipSpan(record, totalSeconds).length,
        rename: (words) => {
            record.name = words;
            trackText.textContent = words;
            saveClip(record);
        },
        sayOff: (off, why) => {
            offMark.hidden = !off;
            if (why) offMark.title = why;
            else offMark.removeAttribute('title');
        }
    });

    if (!alreadySaved) saveClip(record);
    if (!alreadySaved) rememberClipOrder();

    numberClips();
    paintWidgets();
}

/* --- reordering a list by hand --- */

let liftedRow = null;   // the row in your hand, if any
let lift = null;        // where it was grabbed and how far it's moved

function liftRows(list, selector) {
    return [...list.querySelectorAll(selector)];
}

const LIFT_BASE = { ms: 190, ease: 'cubic-bezier(0.33, 0, 0, 1)', mark: [0.2, 0.8] };
const LIFT_FEEL = {
    clips: { ...LIFT_BASE, grabCursor: true },
    decks: { ...LIFT_BASE, grabCursor: false },
    cards: { ...LIFT_BASE, grabCursor: true }
};

function slideRows(list, selector, feel, rearrange) {
    const rows = liftRows(list, selector);
    const before = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));
    rearrange();
    rows.forEach((row) => {
        // the old slide has to go before the new resting place is read
        row.getAnimations()
            .filter((animation) => animation.id === 'row-slide')
            .forEach((animation) => animation.cancel());

        // the row in your hand is placed by the cursor, not by this
        if (row.classList.contains('is-lifted')) return;

        const shift = before.get(row) - row.getBoundingClientRect().top;
        if (!shift) return;
        const slide = row.animate(
            [{ transform: `translateY(${shift}px)` }, { transform: 'none' }],
            { duration: feel.ms, easing: feel.ease }
        );
        slide.id = 'row-slide';
    });
}

// three lines to drag a row by, and the arrow keys for the same
function rowGrip(item, className, label, config) {
    const handle = document.createElement('button');
    handle.className = className;
    handle.type = 'button';
    handle.setAttribute('aria-label', label);
    handle.innerHTML = '<span></span><span></span><span></span>';
    handle.addEventListener('pointerdown', (event) => startLift(config(), item, event));
    handle.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        moveRow(config(), item, event.key === 'ArrowUp' ? -1 : 1);
        handle.focus();
    });
    return handle;
}

function moveRow(config, item, step) {
    const rows = liftRows(config.list, config.selector);
    const to = rows.indexOf(item) + step;
    if (to < 0 || to >= rows.length) return;
    slideRows(config.list, config.selector, config.feel, () => {
        if (step < 0) config.list.insertBefore(item, rows[to]);
        else config.list.insertBefore(item, rows[to].nextSibling);
    });
    config.onSettle();
}

function startLift(config, item, event) {
    if (event.button) return;          // left button / a finger only
    event.preventDefault();
    if (liftedRow) endLift();

    liftedRow = item;
    lift = {
        config,
        pointerId: event.pointerId,
        grab: event.clientY - item.getBoundingClientRect().top,   // where you took hold
        shift: 0,                      // how far it's moved from its slot
        pointerY: event.clientY,
        seenY: -1,                     // the last y this worked out a position for
        lastY: event.clientY,
        heading: 1,
        frame: 0
    };
    measureSlots();                    // the rows, their slots and the list's edges

    item.classList.add('is-lifted');
    config.list.classList.remove('is-arriving');
    document.documentElement.classList.add('sorting-rows');
    if (config.feel.grabCursor) document.documentElement.classList.add('sorting-grab');

    window.addEventListener('pointermove', trackLift);
    window.addEventListener('pointerup', endLift);
    window.addEventListener('pointercancel', endLift);
    lift.frame = window.requestAnimationFrame(carryRow);
}

function measureSlots() {
    const list = lift.config.list;
    const box = list.getBoundingClientRect();
    lift.listTop = box.top;
    lift.listBottom = box.bottom;
    lift.scroll = list.scrollTop;
    lift.rows = liftRows(list, lift.config.selector);
    lift.tops = lift.rows.map((row) => row.offsetTop);
    lift.heights = lift.rows.map((row) => row.offsetHeight);
    lift.pad = lift.tops.length ? lift.tops[0] : 0;
}

function slotTop(index) {
    return lift.listTop + 1 - lift.scroll + lift.tops[index];
}

function trackLift(event) {
    if (!lift || event.pointerId !== lift.pointerId) return;
    lift.pointerY = event.clientY;
}

function carryRow() {
    if (!liftedRow) return;
    const list = lift.config.list;

    // every read this frame needs happens here, before any write
    const scroll = list.scrollTop;
    const room = list.scrollHeight - list.clientHeight;
    const edge = 44;

    let wanted = scroll;
    if (lift.pointerY < lift.listTop + edge) wanted = Math.max(0, scroll - 8);
    else if (lift.pointerY > lift.listBottom - edge) wanted = Math.min(room, scroll + 8);

    const moved = Math.abs(lift.pointerY - lift.seenY) >= 1;
    if (moved || wanted !== scroll) {
        lift.scroll = wanted;
        lift.seenY = lift.pointerY;
        if (wanted !== scroll) list.scrollTop = wanted;
        placeLifted();
        shuffleForLifted();
    }
    lift.frame = window.requestAnimationFrame(carryRow);
}

function placeLifted() {
    const index = lift.rows.indexOf(liftedRow);
    if (index === -1) return;
    const height = lift.heights[index];

    // it stops where the first and last rows sit, not against the frame
    const highest = lift.listTop + 1 + lift.pad;
    const lowest = lift.listBottom - 1 - lift.pad - height;
    let wanted = lift.pointerY - lift.grab;
    wanted = Math.max(highest, Math.min(wanted, lowest));

    lift.shift = wanted - slotTop(index);
    liftedRow.style.transform = `translate3d(0, ${lift.shift}px, 0)`;
}

function shuffleForLifted() {
    if (Math.abs(lift.pointerY - lift.lastY) > 3) {
        lift.heading = lift.pointerY > lift.lastY ? 1 : -1;
        lift.lastY = lift.pointerY;
    }

    const mark = lift.config.feel.mark[lift.heading > 0 ? 0 : 1];
    let next = null;
    for (let index = 0; index < lift.rows.length; index += 1) {
        if (lift.rows[index] === liftedRow) continue;
        if (lift.pointerY < slotTop(index) + lift.heights[index] * mark) {
            next = lift.rows[index];
            break;
        }
    }

    if (liftedRow.nextElementSibling === next) return;   // already there
    const { list, selector, feel } = lift.config;
    slideRows(list, selector, feel, () => list.insertBefore(liftedRow, next));
    measureSlots();
    placeLifted();   // its slot moved; keep it under the cursor
}

function endLift() {
    if (!liftedRow) return;
    const item = liftedRow;
    const { shift, frame, config } = lift;

    window.cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', trackLift);
    window.removeEventListener('pointerup', endLift);
    window.removeEventListener('pointercancel', endLift);
    document.documentElement.classList.remove('sorting-rows', 'sorting-grab');

    liftedRow = null;
    lift = null;
    item.classList.remove('is-lifted');
    item.style.transform = '';

    // it settles into the slot it's over rather than snapping there
    if (shift) {
        item.animate(
            [{ transform: `translateY(${shift}px)` }, { transform: 'none' }],
            { duration: config.feel.ms, easing: config.feel.ease }
        );
    }
    config.onSettle();
}

/* --- reordering the clips --- */

const CLIP_ORDER_KEY = 'clip-order';

function clipLiftConfig() {
    return { list: recordingList, selector: '.recording-item', feel: LIFT_FEEL.clips, onSettle: rememberClipOrder };
}

function savedClipOrder() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(CLIP_ORDER_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

function rememberClipOrder() {
    numberClips();
    const ids = [...recordingList.querySelectorAll('.recording-item')]
        .map((row) => row.dataset.clipId);
    try {
        window.localStorage.setItem(CLIP_ORDER_KEY, JSON.stringify(ids));
    } catch (error) {
        // out of room — the order just won't survive a refresh
    }
}

/* --- recording --- */

function pickRecordingType() {
    return ['audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function startRecording() {
    if (!activeStream) return;

    const audioOnly = new MediaStream(activeStream.getAudioTracks());
    const mimeType = pickRecordingType();
    const recorder = new MediaRecorder(audioOnly, mimeType ? { mimeType } : undefined);
    mediaRecorder = recorder;

    const chunks = [];   // this clip's own list, not shared

    recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
    });

    recorder.start(500);
    const startedAt = Date.now();
    recordStartTime = startedAt;

    recorder.addEventListener('stop', () => {
        const elapsed = Date.now() - startedAt;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0 && elapsed >= MIN_CLIP_MS) {
            clipCount += 1;
            addRecording({
                id: `clip-${Date.now()}-${clipCount}`,
                number: clipCount,
                duration: formatDuration(elapsed),
                durationMs: elapsed,
                blob
            }, false);
        }
    });

    recordToggle.classList.add('recording');
    recordToggle.setAttribute('aria-label', 'stop');
    senseToggle.hidden = false;

    liveLabel.textContent = '';
    window.clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
        const elapsed = formatDuration(Date.now() - recordStartTime);
        liveLabel.textContent = `${clipCount + 1} · ${elapsed}`;
    }, 250);
}

/* --- audio level line --- */

function drawLevel() {
    levelFrame = window.requestAnimationFrame(drawLevel);
    if (!analyser) return;

    analyser.getByteTimeDomainData(levelData);

    // loudest sample in this frame, 0 to 1
    let peak = 0;
    for (let index = 0; index < levelData.length; index += 1) {
        const value = Math.abs(levelData[index] - 128) / 128;
        if (value > peak) peak = value;
    }

    const width = levelCanvas.width;
    const height = levelCanvas.height;
    levelContext.clearRect(0, 0, width, height);
    levelContext.strokeRect(0.5, 0.5, width - 1, height - 1);
    levelContext.fillRect(0, 0, width * Math.min(1, peak * 1.4), height);
}

function startLevelMeter() {
    if (activeStream.getAudioTracks().length === 0) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;   /* enough for a peak — a quarter the work per frame */
    levelData = new Uint8Array(analyser.fftSize);
    audioContext.createMediaStreamSource(activeStream).connect(analyser);
    // the canvas is never resized, so its pen is set once rather than every frame
    levelContext.strokeStyle = '#fff';
    levelContext.fillStyle = '#fff';
    levelContext.lineWidth = 1;
    drawLevel();
}

function stopLevelMeter() {
    window.cancelAnimationFrame(levelFrame);
    levelFrame = null;
    analyser = null;
    levelData = null;
    if (audioContext) audioContext.close();
    audioContext = null;
    levelContext.clearRect(0, 0, levelCanvas.width, levelCanvas.height);
}

function cutClip() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    mediaRecorder.stop();   // its stop handler saves the clip
    startRecording();       // immediately begin the next one
}

/* --- capture --- */

function stopCapture() {
    if (!activeStream) return;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    mediaRecorder = null;
    window.clearInterval(timerInterval);
    timerInterval = null;
    liveLabel.textContent = '';
    window.clearInterval(senseInterval);
    senseInterval = null;
    stopLevelMeter();
    previewWrap.classList.remove('showing-video');
    audioPanel.classList.remove('is-tuning');
    sensePop.classList.remove('is-open');
    senseControls.hidden = true;
    senseToggle.setAttribute('aria-expanded', 'false');
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
    previewVideo.srcObject = null;
    previousSample = null;
    previewWrap.hidden = true;
    audioPanel.classList.remove('is-live');
    senseReadout.hidden = true;
    senseReadout.textContent = 'change 0.0';
    recordToggle.classList.remove('recording');
    recordToggle.setAttribute('aria-label', 'record');
    senseToggle.hidden = true;
    setRecordStatus('', false);
    refreshEmptyMessage();
}

async function startCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setRecordStatus('this browser cannot record tabs — use chrome', true);
        return;
    }

    try {
        activeStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 },
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
    } catch (error) {
        activeStream = null;
        setRecordStatus('', false);
        return;
    }

    previewVideo.srcObject = activeStream;
    await previewVideo.play().catch(() => {});

    previewWrap.hidden = false;
    audioPanel.classList.add('is-live');
    refreshEmptyMessage();
    senseReadout.hidden = false;
    triggerCount = 0;
    switchCount.textContent = '0 switches';
    previousSample = null;
    applySenseSettings();

    if (activeStream.getAudioTracks().length === 0) setRecordStatus('no audio — stop, and tick "also share tab audio"', true);

    activeStream.getVideoTracks()[0].addEventListener('ended', stopCapture);

    window.clearInterval(senseInterval);
    senseInterval = window.setInterval(checkForChange, 60);

    startLevelMeter();
    startRecording();
}

recordToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (activeStream) stopCapture();
    else startCapture();
});

const clipSplitter = wireSplit({
    split: document.getElementById('clipSplit'),
    body: document.querySelector('.audio-body'),
    other: document.querySelector('.clip-column'),
    pane: document.getElementById('clipSide'),
    key: 'clip-column',
    fromRight: true,
    // each side holds where its words are still whole, and snaps shut past that
    least: () => headingRoom(document.getElementById('clipSide'), document.querySelector('#clipSide .panel-head h2')),
    leastOther: 300,
    snap: true,
    // it wears a --tight all round, like every other box
    skinAt: 36,
    fallback: 50
});

if (clipSplitter) {
    clipSplitter.load();
    // nothing saved yet: even with the clips, like every other page
    if (window.localStorage.getItem('clip-column') === null) clipSplitter.set(50);
}

loadSenseSettings();
applySenseSettings();
loadZoom();
recorderReady = true;
const typeReady = document.fonts && document.fonts.load
    ? Promise.all(['1em Amiko', '1em "Bitcount Prop Double"', '700 1em "Bitcount Prop Double"',
                   '1em VT323', '1em "Pixelify Sans"'].map((face) => document.fonts.load(face)))
    : Promise.resolve();
Promise.all([loadStoredClips(), typeReady]).catch(() => {}).finally(() => {
    window.requestAnimationFrame(() => {
        document.documentElement.classList.remove('booting');
        unfoldedSection = activeSectionId;   // a refresh just appears, by request: only switching pages slides
    });
});
senseToggle.hidden = true;

/* ---------- 13. (the player was here; it is gone) ---------- */

function clockFace(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/* ---------- 14. the bar's own three  (clock · storage · binned) ---------- */

let clockMinute = -1;
function paintClock() {
    const now = new Date();
    // the strip's clock counts seconds too, by request; the board's tiles still only change on the minute
    const told = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
    const half = told.match(/\s*([ap]m)$/);
    clockTime.textContent = half ? told.slice(0, half.index) : told;
    clockSuffix.textContent = half ? half[1] : '';
    clockDate.textContent = now
        .toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
        .toLowerCase();
    // the time tile and the board change on the turn of the minute, off this same tick
    if (now.getMinutes() !== clockMinute) { clockMinute = now.getMinutes(); paintKey(); paintWidgets(); }
}

function startClock() {
    // each tick waits for the turn of the next second, so it never drifts off it
    const tick = () => {
        paintClock();
        window.setTimeout(tick, 1000 - new Date().getMilliseconds() + 5);
    };
    tick();
}

const THEME_KEY = 'page-inverted';

let themingTimer = 0;
let themeReady = false;   // true once the page has settled on load

function paintTheme(on) {
    document.documentElement.classList.toggle('inverted', on);
    // the framed dino run is told straight out, not left to notice
    document.querySelectorAll('.home-run').forEach((frame) => {
        try { frame.contentWindow.postMessage({ lights: on }, window.location.origin); } catch (error) { /* not loaded yet */ }
    });
    themeSwap.setAttribute('aria-pressed', String(on));
    themeSwap.title = on ? 'light' : 'dark';
    themeSwap.setAttribute('aria-label', on ? 'light' : 'dark');
    try {
        window.localStorage.setItem(THEME_KEY, on ? 'yes' : 'no');
    } catch (error) {
        // it just won't be remembered
    }
}

function setInverted(on) {
    const root = document.documentElement;
    const moved = root.classList.contains('inverted') !== on && themeReady;
    if (!moved) {
        paintTheme(on);
        return;
    }

    root.classList.add('theming');
    window.clearTimeout(themingTimer);
    const done = () => root.classList.remove('theming', 'fading');

    if (typeof document.startViewTransition === 'function') {
        const swap = document.startViewTransition(() => paintTheme(on));
        swap.ready.catch(() => {});
        swap.updateCallbackDone.catch(() => {});
        // finished doesn't always report back (a tab put in the background mid-swap), so a timer
        // writes the theme and tidies up in its place — only if it never did
        let over = false;
        const finish = () => {
            if (over) return;
            over = true;
            window.clearTimeout(themingTimer);
            done();
        };
        swap.finished.then(finish, finish);
        themingTimer = window.setTimeout(() => {
            if (over) return;
            paintTheme(on);
            finish();
        }, 900);
        return;
    }

    root.classList.add('fading');
    themingTimer = window.setTimeout(done, 450);
    paintTheme(on);
    const moon = themeSwap.querySelector('svg');
    if (moon) {
        moon.animate([
            { transform: `rotate(${on ? 0 : 180}deg) scale(1)` },
            { transform: 'rotate(90deg) scale(0.76)', offset: 0.45 },
            { transform: `rotate(${on ? 180 : 0}deg) scale(1)` }
        ], { duration: 520, easing: 'cubic-bezier(0.34, 1.2, 0.45, 1)' });
    }
}

themeSwap.addEventListener('click', () => {
    setInverted(!document.documentElement.classList.contains('inverted'));
});
setInverted(window.localStorage.getItem(THEME_KEY) === 'yes');
themeReady = true;

/* ---------- 15. home widgets ---------- */

const widgetList = document.getElementById('widgetList');
const widgetPicks = document.getElementById('widgetPicks');
const widgetPickList = document.getElementById('widgetPickList');

const WIDGET_KEY = 'home-widgets';

const WIDGET_SIZES = ['small', 'wide'];

// a name no other tile on the board has, however many of a kind there are
let widgetKeyCount = 0;
function nextWidgetKey(id) {
    widgetKeyCount += 1;
    return `${id}-${Date.now().toString(36)}-${widgetKeyCount}`;
}

const WIDGETS = [
    {
        id: 'clock',
        name: 'time',
        // the two ways it can be read. pressing the tile swaps them.
        looks: [['digits', 'numbers'], ['hands', 'a face']],
        fill(body, size, look) {
            const now = new Date();
            body.innerHTML = '';
            body.classList.add('is-clock');

            if (look === 'hands') {
                body.append(clockHands(now));
                if (size !== 'small') body.append(oneLine(dayWords(now)));
                return;
            }

            const told = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
            const half = told.match(/\s*([ap]m)$/);
            const digits = half ? told.slice(0, half.index) : told;

            const read = document.createElement('p');
            read.className = 'widget-big';
            read.textContent = digits;
            body.append(read);
            if (half) {
                const under = document.createElement('p');
                under.className = 'widget-unit clock-half';
                under.textContent = half[1];
                body.append(under);
            }
            if (size === 'small') return;
            body.append(oneLine(dayWords(now)));
        }
    },
    {
        id: 'decks',
        name: 'flashcards',
        fill(body, size) {
            const cards = decks.reduce((total, deck) => total + deck.cards.length, 0);
            body.innerHTML = '';

            if (size === 'small') {
                body.append(bigReading(String(cards), cards === 1 ? 'card' : 'cards'));
                return;
            }

            body.append(tallyRow([
                [decks.length, decks.length === 1 ? 'deck' : 'decks'],
                [cards, cards === 1 ? 'card' : 'cards'],
                [activeDeck().cards.length, 'open now']
            ]));
        }
    },
    {
        id: 'jump',
        name: 'decks',
        fill(body, size) {
            body.innerHTML = '';
            const ready = decks.filter((deck) => deck.cards.length);
            if (!ready.length) {
                body.append(oneLine('no cards to practice yet'));
                return;
            }
            const room = size === 'small' ? 1 : 2;
            const lane = document.createElement('div');
            lane.className = 'widget-jumps';
            ready.slice(0, room).forEach((deck) => {
                const jump = document.createElement('button');
                jump.className = 'widget-jump';
                jump.type = 'button';
                jump.innerHTML = `<span class="deck-shape">${shapeFor(deck)}</span>`;
                const text = document.createElement('span');
                text.className = 'widget-jump-text';
                const name = document.createElement('strong');
                name.textContent = deck.name;
                const count = document.createElement('small');
                count.textContent = `${deck.cards.length} cards`;
                text.append(name, count);
                jump.append(text);
                // straight into practice on that deck, wherever you were
                jump.addEventListener('click', () => {
                    if (editingHome) return;   // in edit mode it's a tile, not a button
                    activeDeckId = deck.id;
                    saveDecks();
                    renderDecks();
                    renderCards();
                    switchSection('cards');
                    startStudy();
                });
                lane.append(jump);
            });
            body.append(lane);
        }
    },
    {
        id: 'kept',
        name: 'audio',
        fill(body, size) {
            const clips = recordingList.querySelectorAll('.recording-item').length;
            const binned = deletedStack.length;
            body.innerHTML = '';

            if (size === 'small') {
                body.append(bigReading(String(clips), clips === 1 ? 'clip' : 'clips'));
                return;
            }
            body.append(tallyRow([
                [clips, clips === 1 ? 'clip' : 'clips'],
                [binned, 'in the bin']
            ]));
        }
    }
];

// one reading in the title face, with its word beside it
function bigReading(number, word) {
    const line = document.createElement('p');
    line.className = 'widget-big';
    line.textContent = number;
    if (word) {
        const unit = document.createElement('span');
        unit.className = 'widget-unit';
        unit.textContent = word;
        line.append(unit);
    }
    return line;
}

// the day, said the same way wherever it is said
function dayWords(now) {
    return now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase();
}

function clockHands(now) {
    const wrap = document.createElement('div');
    wrap.className = 'clock-hands';

    const hour = (now.getHours() % 12) + now.getMinutes() / 60;
    const minute = now.getMinutes();

    const hand = (turn, long, wide) => {
        const x = 50 + long * Math.sin(turn * Math.PI / 180);
        const y = 50 - long * Math.cos(turn * Math.PI / 180);
        return `<path d="M50 50 ${x.toFixed(2)} ${y.toFixed(2)}" stroke-width="${wide}"`
            + ' stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
    };

    let ticks = '';
    for (let at = 0; at < 12; at += 1) {
        const turn = at * 30;
        const from = at % 3 === 0 ? 34 : 38;
        const x1 = 50 + from * Math.sin(turn * Math.PI / 180);
        const y1 = 50 - from * Math.cos(turn * Math.PI / 180);
        const x2 = 50 + 42 * Math.sin(turn * Math.PI / 180);
        const y2 = 50 - 42 * Math.cos(turn * Math.PI / 180);
        ticks += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"`
            + ` stroke-width="${at % 3 === 0 ? 1.6 : 1}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    }

    wrap.innerHTML = '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">'
        + '<circle cx="50" cy="50" r="47" stroke-width="1" vector-effect="non-scaling-stroke"/>'
        + ticks
        + hand(hour * 30, 24, 2)
        + hand(minute * 6, 34, 1.4)
        + '<circle cx="50" cy="50" r="2.4" fill="currentColor" stroke="none"/>'
        + '</svg>';
    return wrap;
}

function oneLine(words) {
    const line = document.createElement('p');
    line.className = 'widget-line';
    line.textContent = words;
    return line;
}

// three readings sharing the width, each number over its word
function tallyRow(pairs) {
    const row = document.createElement('div');
    row.className = 'widget-tallies';
    pairs.forEach(([number, word]) => {
        const cell = document.createElement('span');
        cell.className = 'widget-tally';
        const big = document.createElement('strong');
        big.textContent = String(number);
        const small = document.createElement('small');
        small.textContent = word;
        cell.append(big, small);
        row.append(cell);
    });
    return row;
}

function widgetById(id) {
    return WIDGETS.find((widget) => widget.id === id);
}

/* --- the board's own arithmetic --- */

const BOARD_COLS = 4;   // the movable four; the fixed time tile is the fifth, to their left
// the board is one row, so a tile is only as wide as its shape and starts at its column
const tileWidth = (entry) => (entry.size === 'small' ? 1 : 2);

function hits(one, two) {
    return one.col < two.col + tileWidth(two) && two.col < one.col + tileWidth(one);
}

let homeWidgets = [];
let editingHome = false;

function loadWidgets() {
    let saved = null;
    try {
        saved = JSON.parse(window.localStorage.getItem(WIDGET_KEY));
    } catch (error) {
        saved = null;
    }
    // what was saved, as far as it still makes sense; fillBoard makes it the board's three tiles
    homeWidgets = (Array.isArray(saved) ? saved : [])
        .filter((entry) => entry && typeof entry === 'object' && widgetById(entry.id))
        .map((entry) => ({
            id: entry.id,
            key: entry.key || nextWidgetKey(entry.id),
            size: WIDGET_SIZES.includes(entry.size) ? entry.size : 'wide',
            look: typeof entry.look === 'string' ? entry.look : null,
            col: Number.isInteger(entry.col) ? entry.col : 99
        }));
}

function saveWidgets() {
    try {
        window.localStorage.setItem(WIDGET_KEY, JSON.stringify(homeWidgets));
    } catch (error) {
        // it just won't be remembered
    }
}

// where a widget sits, written straight onto the tile
function placeCard(card, entry) {
    card.style.gridColumn = `${entry.col + 1} / span ${tileWidth(entry)}`;
    card.style.gridRow = '1';   // pinned to the one row, so the ghost may sit over a tile mid-carry
}

// the board is always three tiles across the four columns — one wide, two small — so the row is full.
// none can be added or taken away; a tile can only be changed to another kind, or moved along
const BOARD_TILES = 3;
const BOARD_START = ['decks', 'jump', 'kept'];
function fillBoard() {
    const seen = new Set();
    let tiles = homeWidgets.filter((entry) => widgetById(entry.id) && !seen.has(entry.key) && seen.add(entry.key));
    tiles.sort((a, b) => a.col - b.col);
    tiles = tiles.slice(0, BOARD_TILES);
    for (const id of BOARD_START) {
        if (tiles.length >= BOARD_TILES) break;
        if (!tiles.some((entry) => entry.id === id)) tiles.push({ id, key: nextWidgetKey(id), size: 'small', look: null, col: 99 });
    }
    while (tiles.length < BOARD_TILES) tiles.push({ id: 'decks', key: nextWidgetKey('decks'), size: 'small', look: null, col: 99 });
    let wide = tiles.findIndex((entry) => entry.size === 'wide');
    if (wide < 0) wide = 0;
    let col = 0;
    tiles.forEach((entry, at) => {
        entry.size = at === wide ? 'wide' : 'small';
        entry.col = col;
        col += entry.size === 'wide' ? 2 : 1;
    });
    const changed = JSON.stringify(tiles) !== JSON.stringify(homeWidgets);
    homeWidgets = tiles;
    if (changed) saveWidgets();
}

function renderWidgets() {
    if (!boardDrag) fillBoard();
    widgetList.querySelectorAll('.widget-card').forEach((card) => card.remove());

    homeWidgets.forEach((entry) => {
        const widget = widgetById(entry.id);
        if (!widget) return;

        const card = document.createElement('section');
        card.className = 'widget-card';
        card.dataset.widgetId = entry.key;
        card.dataset.size = entry.size;
        placeCard(card, entry);

        const head = document.createElement('div');
        head.className = 'widget-head';

        const name = document.createElement('h3');
        name.textContent = widget.name;
        head.append(name);

        const body = document.createElement('div');
        body.className = 'widget-body';
        widget.fill(body, entry.size, entry.look);

        card.append(head, body);
        card.addEventListener('pointerdown', (event) => startWidgetDrag(card, entry, event));

        card.addEventListener('click', (event) => {
            if (editingHome) return;
            event.stopPropagation();
            openLookPicks(entry, card);
        });
        widgetList.append(card);
    });

}

function paintWidgets() {
    widgetList.querySelectorAll('.widget-card').forEach((card) => {
        const entry = homeWidgets.find((one) => one.key === card.dataset.widgetId);
        const widget = entry && widgetById(entry.id);
        if (widget) widget.fill(card.querySelector('.widget-body'), card.dataset.size, entry.look);
    });
}

/* --- the other ways a widget can be read --- */

const lookPicks = document.getElementById('lookPicks');
const lookList = document.getElementById('lookList');

function openLookPicks(entry, card) {
    const widget = widgetById(entry.id);
    if (!widget || !widget.looks || widget.looks.length < 2) return;

    const wasOpen = !lookPicks.hidden && lookPicks.dataset.widgetId === entry.key;
    closeLookPicks();
    if (wasOpen) return;

    lookList.innerHTML = '';
    widget.looks.forEach(([name, said]) => {
        const pick = document.createElement('button');
        pick.className = 'option-pick widget-pick';
        pick.type = 'button';
        pick.textContent = said;
        if ((entry.look || widget.looks[0][0]) === name) pick.classList.add('is-on');
        pick.addEventListener('click', (event) => {
            event.stopPropagation();
            entry.look = name;
            saveWidgets();
            paintWidgets();
            closeLookPicks();
        });
        lookList.append(pick);
    });

    lookPicks.dataset.widgetId = entry.key;
    openPop(lookPicks);
    placeUnder(lookPicks, card);
}

function closeLookPicks() {
    shutPop(lookPicks);
    delete lookPicks.dataset.widgetId;
}

lookPicks.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('pointerdown', (event) => {
    if (lookPicks.hidden) return;
    if (event.target.closest('#lookPicks, .widget-card')) return;
    closeLookPicks();
});

// a press anywhere off the board stops arranging it
document.addEventListener('pointerdown', (event) => {
    if (!editingHome) return;
    if (event.target.closest && event.target.closest('.widget-card, #widgetPicks, .context-menu, .home-key')) return;
    setHomeEditing(false);
});

function setHomeEditing(on) {
    editingHome = on;
    homePanel.classList.toggle('is-editing', on);
    keyEdit.setAttribute('aria-pressed', String(on));
    if (!on) closeWidgetPicks();
}

// the tiles slide from where they were to where they now are. a slide still running is taken over
// from wherever it has got to, so a quick drag back and forth never jumps
function slideTiles(rearrange, easing = 'cubic-bezier(0.33, 0, 0, 1)') {
    const before = new Map([...widgetList.querySelectorAll('.widget-card')]
        .map((card) => [card.dataset.widgetId, card.getBoundingClientRect()]));
    rearrange();
    widgetList.querySelectorAll('.widget-card').forEach((card) => {
        const was = before.get(card.dataset.widgetId);
        if (!was || card.classList.contains('is-dragging')) return;
        card.getAnimations().filter((one) => one.id === 'tile-slide').forEach((one) => one.cancel());
        const now = card.getBoundingClientRect();
        const shiftX = was.left - now.left;
        const shiftY = was.top - now.top;
        if (!shiftX && !shiftY) return;
        card.animate([{ transform: `translate(${shiftX}px, ${shiftY}px)` }, { transform: 'none' }],
            { duration: 240, easing, id: 'tile-slide' });
    });
}

/* --- carrying a tile about the board --- */

let boardDrag = null;
let boardGhost = null;

function cellSize() {
    const box = widgetList.getBoundingClientRect();
    const style = window.getComputedStyle(widgetList);
    const gap = parseFloat(style.rowGap) || 0;
    return { box, gap, width: (box.width - gap * (BOARD_COLS - 1)) / BOARD_COLS };
}

function showGhost(entry, col) {
    if (!boardGhost) {
        boardGhost = document.createElement('div');
        boardGhost.className = 'widget-ghost';
        widgetList.append(boardGhost);
    }
    placeCard(boardGhost, { col, size: entry.size });
}

// one row, read like a list: into a gap nothing moves; onto a tile it slots in by its middle,
// and only the tiles in the way step aside — gaps elsewhere are kept
function boardIfDropped(entry, col) {
    const shadow = homeWidgets.map((one) => ({ ...one }));
    const me = shadow.find((one) => one.key === entry.key);
    const w = tileWidth(me);
    me.col = col;
    const others = shadow.filter((one) => one !== me);
    if (!others.some((one) => hits(me, one))) return shadow;

    const order = others.sort((one, two) => one.col - two.col);
    let at;
    if (col === 0) at = 0;
    else if (col + w >= BOARD_COLS) at = order.length;
    else {
        const middle = col + w / 2;
        at = order.findIndex((one) => one.col + tileWidth(one) / 2 > middle);
        if (at === -1) at = order.length;
    }
    order.splice(at, 0, me);

    // forward: nobody starts before the one ahead of it ends
    let edge = 0;
    order.forEach((one) => { one.col = Math.max(one.col, edge); edge = one.col + tileWidth(one); });
    // backward: nobody runs past the wall
    edge = BOARD_COLS;
    [...order].reverse().forEach((one) => { one.col = Math.min(one.col, edge - tileWidth(one)); edge = one.col; });
    return shadow;
}

// while a tile is carried, the others show the room it would have, sliding into it
function showRoom(shadow) {
    slideTiles(() => shadow.forEach((one) => {
        const card = widgetList.querySelector(`.widget-card[data-widget-id="${one.key}"]`);
        if (card) placeCard(card, one);
    }), 'cubic-bezier(0.4, 0.05, 0.2, 1)');
}

function hideGhost() {
    if (!boardGhost) return;
    boardGhost.remove();
    boardGhost = null;
}

function startWidgetDrag(card, entry, event) {
    if (!editingHome || event.button) return;
    event.preventDefault();
    if (boardDrag) endWidgetDrag();

    const spot = card.getBoundingClientRect();
    boardDrag = {
        card,
        entry,
        pointerId: event.pointerId,
        grabX: event.clientX - spot.left,
        grabY: event.clientY - spot.top,
        // where it started, where it is, and where it is wanted
        fromX: spot.left,
        fromY: spot.top,
        atX: spot.left,
        atY: spot.top,
        wantX: spot.left,
        wantY: spot.top,
        frame: 0,
        col: entry.col,
        cell: cellSize()               // the board's slots, read once: it doesn't move while you carry
    };

    card.style.width = `${spot.width}px`;
    card.style.height = `${spot.height}px`;
    card.style.left = `${spot.left}px`;
    card.style.top = `${spot.top}px`;
    card.classList.add('is-dragging');
    showGhost(entry, entry.col);

    document.documentElement.classList.add('sorting-rows', 'sorting-grab');
    boardDrag.frame = window.requestAnimationFrame(carryOn);
    window.addEventListener('pointermove', trackWidgetDrag);
    window.addEventListener('pointerup', endWidgetDrag);
    window.addEventListener('pointercancel', endWidgetDrag);
}

function trackWidgetDrag(event) {
    if (!boardDrag || event.pointerId !== boardDrag.pointerId) return;
    // the cursor says where it is wanted; the tile takes its time
    boardDrag.wantX = event.clientX - boardDrag.grabX;
    boardDrag.wantY = event.clientY - boardDrag.grabY;
}

const DRAG_EASE = 0.28;

function carryOn() {
    if (!boardDrag) return;
    const { card, entry } = boardDrag;
    boardDrag.atX += (boardDrag.wantX - boardDrag.atX) * DRAG_EASE;
    boardDrag.atY += (boardDrag.wantY - boardDrag.atY) * DRAG_EASE;
    card.style.left = `${boardDrag.atX}px`;
    card.style.top = `${boardDrag.atY}px`;

    const { cell } = boardDrag;
    // one row: only how far along it is in question
    const col = Math.max(0, Math.min(BOARD_COLS - tileWidth(entry),
        Math.round((boardDrag.atX - cell.box.left) / (cell.width + cell.gap))));
    if (col !== boardDrag.col) {
        boardDrag.col = col;
        showGhost(entry, col);
        boardDrag.shadow = boardIfDropped(entry, col);
        showRoom(boardDrag.shadow);
    }
    boardDrag.frame = window.requestAnimationFrame(carryOn);
}

function endWidgetDrag() {
    if (!boardDrag) return;
    const { card, entry, col, frame, shadow, fromX, fromY, wantX, wantY } = boardDrag;
    window.cancelAnimationFrame(frame);
    boardDrag = null;

    window.removeEventListener('pointermove', trackWidgetDrag);
    window.removeEventListener('pointerup', endWidgetDrag);
    window.removeEventListener('pointercancel', endWidgetDrag);
    document.documentElement.classList.remove('sorting-rows', 'sorting-grab');

    const from = card.getBoundingClientRect();
    // pressed, not carried — judged by where the pointer took it, not where the easing has got to
    const still = Math.hypot(wantX - fromX, wantY - fromY) < 6;
    hideGhost();
    card.classList.remove('is-dragging');
    ['width', 'height', 'left', 'top'].forEach((name) => card.style.removeProperty(name));
    if (still) {                     // pressed, not carried: choose what this tile shows
        renderWidgets();
        const here = widgetList.querySelector(`.widget-card[data-widget-id="${entry.key}"]`);
        openSwapPicks(entry, here || card);
        return;
    }

    const settled = shadow || boardIfDropped(entry, col);
    settled.forEach((one) => {
        const real = homeWidgets.find((item) => item.key === one.key);
        if (real) real.col = one.col;
    });
    saveWidgets();
    slideTiles(() => renderWidgets());

    // and the one in your hand slides from the air into its slot
    const landed = widgetList.querySelector(`.widget-card[data-widget-id="${entry.key}"]`);
    if (landed) {
        landed.getAnimations().forEach((one) => one.cancel());
        const to = landed.getBoundingClientRect();
        landed.animate(
            [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` },
             { transform: 'none' }],
            { duration: 240, easing: 'cubic-bezier(0.33, 0, 0, 1)' }
        );
    }
}

// a small panel fades out over 160ms before it is hidden; opening it again inside that time cancels
// the hiding, or the old close would shut the new one
function shutPop(panel) {
    if (!panel || panel.hidden || panel.classList.contains('is-leaving')) return;
    panel.classList.add('is-leaving');
    panel.popTimer = window.setTimeout(() => {
        panel.classList.remove('is-leaving');
        panel.hidden = true;
    }, 160);
}
function openPop(panel) {
    window.clearTimeout(panel.popTimer);
    panel.classList.remove('is-leaving');
    panel.hidden = false;
}

function closeWidgetPicks() {
    pickingFor = null;
    shutPop(widgetPicks);
}

function renderWidgetPicks() {
    widgetPickList.innerHTML = '';
    WIDGETS.forEach((widget) => {
        const pick = document.createElement('button');
        pick.className = 'option-pick widget-pick';
        pick.type = 'button';
        const text = document.createElement('span');
        text.textContent = widget.name;
        pick.append(text);
        if (pickingFor && pickingFor.id === widget.id) pick.classList.add('is-on');
        // what the tile shows is changed to this one
        pick.addEventListener('click', () => {
            const entry = pickingFor && homeWidgets.find((one) => one.key === pickingFor.key);
            if (entry && entry.id !== widget.id) {
                entry.id = widget.id;
                entry.key = nextWidgetKey(widget.id);
                entry.look = null;
                saveWidgets();
                renderWidgets();
            }
            closeWidgetPicks();
        });
        widgetPickList.append(pick);
    });
}
let pickingFor = null;
function openSwapPicks(entry, card) {
    pickingFor = entry;
    renderWidgetPicks();
    openPop(widgetPicks);
    placeBelowLeft(widgetPicks, card);
}

const helpToggle = document.getElementById('helpToggle');

function setHelpOpen(open) {
    helpBox.classList.toggle('is-open', open);
    helpToggle.setAttribute('aria-expanded', String(open));
}

// the bin up in the strip folds: its name opens the list below it
document.getElementById('binnedHead').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); }
});
document.getElementById('binnedHead').addEventListener('click', (event) => {
    if (event.target.closest('.empty-ask')) return;
    event.stopPropagation();
    railBinned.classList.toggle('is-open');
    if (!railBinned.classList.contains('is-open')) askToEmpty(false);
});
document.addEventListener('click', (event) => {
    if (!event.target.closest || !event.target.closest('#railBinned')) { railBinned.classList.remove('is-open'); askToEmpty(false); }
});

helpToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setHelpOpen(!helpBox.classList.contains('is-open'));
});
// a press anywhere else folds the help note — caught on the way down, so a button that keeps its own
// click to itself still folds it, and leaving the window (or pressing into the dino run's frame) does too
document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest || !event.target.closest('.help-box')) setHelpOpen(false);
}, true);
window.addEventListener('blur', () => setHelpOpen(false));

widgetPicks.addEventListener('click', (event) => event.stopPropagation());

// one search over every page. A page answers to its own name, and to any words on it — what is
// written there, what its fields say before you type, what its buttons are called.
const PAGE_ROOTS = {
    home: () => [document.getElementById('homePanel')],
    cards: () => [document.getElementById('homeBody'), document.getElementById('makerScreen'), document.getElementById('studyScreen')],
    audio: () => [document.getElementById('audioPanel')],
    chat: () => [document.getElementById('chatPanel')],
    draw: () => [document.getElementById('drawPanel')]
};
function pageWords(id) {
    const found = [];
    const note = document.querySelector(`.help-note[data-section="${id}"]`);
    if (note) found.push({ text: note.textContent.trim(), at: null });
    PAGE_ROOTS[id]().filter(Boolean).forEach((root) => {
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                if (node.nodeType === 1) {
                    const tag = node.tagName.toLowerCase();
                    if (['script', 'style', 'svg', 'iframe', 'canvas'].includes(tag) || node.closest('.page-search')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_SKIP;
                }
                return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        });
        while (walk.nextNode()) found.push({ text: walk.currentNode.textContent.trim(), at: walk.currentNode.parentElement });
        root.querySelectorAll('[placeholder], [title], button[aria-label]').forEach((el) => {
            if (el.closest('.page-search')) return;
            ['placeholder', 'title', 'aria-label'].forEach((name) => {
                const said = el.getAttribute(name);
                if (said && said.trim()) found.push({ text: said.trim(), at: el });
            });
        });
    });
    return found;
}
function snippet(text, query) {
    const at = text.toLowerCase().indexOf(query);
    const from = Math.max(0, at - 24);
    const piece = text.slice(from, at + query.length + 40);
    const lead = from > 0 ? '…' : '';
    const holder = document.createElement('span');
    const start = at - from;
    holder.append(lead + piece.slice(0, start));
    const mark = document.createElement('mark');
    mark.textContent = piece.slice(start, start + query.length);
    holder.append(mark, piece.slice(start + query.length));
    return holder;
}
const pageSearchField = document.getElementById('pageSearchField');
const pageFound = document.getElementById('pageFound');
let pageHits = [];
function goToHit(hit) {
    showFound(false);
    pageSearchField.value = '';
    pageSearchField.blur();
    switchSection(hit.id);
    if (!hit.at) return;
    window.setTimeout(() => {
        if (!hit.at.isConnected || !hit.at.getClientRects().length) return;   // there, but not on show
        hit.at.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        hit.at.classList.add('found-here');
        window.setTimeout(() => hit.at.classList.remove('found-here'), 1400);
    }, 380);
}
// the results slide down out of the bar and back up into it. played by script, so it runs every
// time — a css animation on an element coming out of display:none can be skipped — and always from
// wherever the box is, so typing, clearing and typing again mid-slide turns it round rather than jumping
const FOUND_SHUT = 'inset(0 0 100% 0)';
const FOUND_OPEN = 'inset(0 0 0 0)';
let foundMove = null;
let foundGoing = false;
function showFound(open) {
    const wrap = document.getElementById('pageSearch');
    if (open && !pageFound.hidden && !foundGoing) return;
    if (!open && (pageFound.hidden || foundGoing)) return;
    const from = foundMove ? window.getComputedStyle(pageFound).clipPath : (open ? FOUND_SHUT : FOUND_OPEN);
    if (foundMove) { foundMove.onfinish = null; foundMove.cancel(); }
    foundGoing = !open;
    if (open) {
        pageFound.hidden = false;
        wrap.classList.add('is-open');
    }
    pageFound.style.clipPath = open ? FOUND_OPEN : FOUND_SHUT;
    foundMove = pageFound.animate([{ clipPath: from === 'none' ? FOUND_OPEN : from }, { clipPath: open ? FOUND_OPEN : FOUND_SHUT }],
        { duration: open ? 260 : 190, easing: open ? 'cubic-bezier(0.2, 0.8, 0.3, 1)' : 'cubic-bezier(0.4, 0, 0.6, 1)' });
    foundMove.onfinish = () => {
        foundMove = null;
        if (!open) {
            foundGoing = false;
            pageFound.hidden = true;
            wrap.classList.remove('is-open');   // the bar's own corners round off only once the box has gone up
        }
    };
}

function searchPages() {
    const query = pageSearchField.value.trim().toLowerCase();
    pageFound.innerHTML = '';
    pageHits = [];
    if (!query) { showFound(false); return; }
    sections.forEach((section) => {
        const words = pageWords(section.id).filter((one) => one.text.toLowerCase().includes(query));
        const named = section.name.includes(query);
        if (!named && !words.length) return;
        pageHits.push({ id: section.id, name: section.name, words, named, at: words[0] ? words[0].at : null });
    });
    pageHits.sort((a, b) => (b.named - a.named) || (b.words.length - a.words.length));
    pageHits.forEach((hit) => {
        const row = document.createElement('li');
        const press = document.createElement('button');
        press.type = 'button';
        press.className = 'page-hit';
        const name = document.createElement('b');
        name.textContent = hit.name;
        const where = hit.words.length ? snippet(hit.words[0].text, query) : document.createElement('span');
        if (!hit.words.length) where.textContent = 'the page itself';
        const count = document.createElement('small');
        count.textContent = hit.words.length ? String(hit.words.length) : '';
        press.append(name, where, count);
        press.addEventListener('click', () => goToHit(hit));
        row.append(press);
        pageFound.append(row);
    });
    if (!pageHits.length) {
        const none = document.createElement('li');
        none.className = 'page-none';
        none.textContent = 'nothing on any page says that';
        pageFound.append(none);
    }
    showFound(true);
}
pageSearchField.addEventListener('input', searchPages);
// the run on home is a frame, and a frame only hears keys once it has been clicked — so space and up
// are handed to it from here, unless something else on the page wants them
const isJumpKey = (event) => event.code === 'Space' || event.code === 'ArrowUp' || event.key === ' '
    || event.key === 'Spacebar' || event.key === 'ArrowUp' || event.keyCode === 32 || event.keyCode === 38;
window.addEventListener('keydown', (event) => {
    if (!isJumpKey(event) || event.isComposing) return;
    if (activeSectionId !== 'home' || isModalOpen()) return;
    const at = document.activeElement;
    // only a box you type in keeps space for itself — a tab or button still holding focus from the
    // last click (the home tab, say) used to swallow it, so the dino never jumped
    if (at && at.matches('input, textarea, select, [contenteditable="true"]')) return;
    const run = document.querySelector('.home-run');
    if (!run || !run.contentWindow) return;
    event.preventDefault();
    if (event.repeat) return;                    // a held key is one jump
    // the frame's own jump is called outright: a made-up key event depended on it reading the key
    // the same way, and it didn't always
    try { run.contentWindow.dinoJump(); } catch (error) { /* not loaded yet */ }
}, true);
// a result picked on the front door arrives as ?spot=…: this page is already the one it named, so
// the word on it is outlined for a moment, the same as a result picked here
(() => {
    const spot = ARRIVED_WITH.spot;
    if (!spot) return;
    try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch (error) { /* stays in the bar */ }
    // once the page has drawn: the first place the word is on show (the function note doesn't count)
    // the lists are drawn again from storage as the page comes in, which throws away whatever was
    // outlined — so it is looked for afresh every beat for the moment it shows
    const began = performance.now();
    let shownAt = 0;                    // it shows for 1.8s from when it is first on screen
    let held = null;
    const beat = window.setInterval(() => {
        const first = pageWords(activeSectionId)
            .find((one) => one.at && one.at.getClientRects().length && one.text.toLowerCase().includes(spot));
        if (first && !shownAt) shownAt = performance.now();
        const over = (shownAt && performance.now() - shownAt > 1800) || performance.now() - began > 8000;
        if (held && held !== (first && first.at)) held.classList.remove('found-here');
        if (over || !first) {
            if (held) held.classList.remove('found-here');
            if (over) window.clearInterval(beat);
            return;
        }
        if (held !== first.at) {
            if (!held) first.at.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            held = first.at;
            held.classList.add('found-here');
        }
    }, 150);
})();
// words searched for on the front door arrive as ?find=…: shown here, on home, as if typed
(() => {
    const asked = ARRIVED_WITH.find;
    if (!asked) return;
    try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch (error) { /* stays in the bar */ }
    if (activeSectionId !== 'home') switchSection('home');
    pageSearchField.value = asked.trim();
    window.setTimeout(() => { searchPages(); pageSearchField.focus(); }, 120);
})();
document.getElementById('pageSearchGo').addEventListener('click', () => {
    if (!pageSearchField.value.trim()) { pageSearchField.focus(); return; }
    searchPages();
    if (pageHits[0]) goToHit(pageHits[0]);
});
pageSearchField.addEventListener('focus', () => { if (pageSearchField.value.trim()) searchPages(); });
pageSearchField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && pageHits[0]) { event.preventDefault(); goToHit(pageHits[0]); }
    if (event.key === 'Escape') { pageSearchField.value = ''; showFound(false); pageSearchField.blur(); }
});
document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest || !event.target.closest('.page-search')) showFound(false);
});

// under a tile, lined up on its left edge — the board starts against the bar, so nothing may hang left
function placeBelowLeft(panel, anchor) {
    const spot = anchor.getBoundingClientRect();
    panel.style.left = `${Math.round(spot.left)}px`;
    panel.style.top = `${Math.round(spot.bottom + 8)}px`;
}

// the fixed time tile: it tells the time, and the pen in its corner turns arranging on and off — then
// a press on a tile changes what it is, and a drag moves it
const keyEdit = document.getElementById('keyEdit');
const keyBody = document.getElementById('keyBody');
function paintKey() {
    const clock = widgetById('clock');
    clock.fill(keyBody, 'small', 'digits');
}
keyEdit.addEventListener('click', (event) => {
    event.stopPropagation();
    closeWidgetPicks();
    setHomeEditing(!editingHome);
});
startClock();
binnedEmpty.addEventListener('click', (event) => {
    event.stopPropagation();
    if (deletedStack.length) askToEmpty(true);
});
emptyYes.addEventListener('click', (event) => { event.stopPropagation(); emptyBin(); });
emptyNo.addEventListener('click', (event) => { event.stopPropagation(); askToEmpty(false); });

loadBinned();

start();

// last of all: the widgets read the decks, so the decks load first
loadWidgets();
renderWidgets();

/* ---------- 16. notes → cards ---------- */

const notesPanel = document.getElementById('notesPanel');
const notesSlot = document.getElementById('notesSlot');
const notesWide = document.getElementById('notesWide');
const notesInput = document.getElementById('notesInput');
const notesFile = document.getElementById('notesFile');
const notesBits = document.getElementById('notesBits');
const notesAttach = document.getElementById('notesAttach');
const notesGo = document.getElementById('notesGo');
const notesRead = document.getElementById('notesRead');
const notesNote = document.getElementById('notesNote');
const notesFound = document.getElementById('notesFound');
const notesKeepRow = document.getElementById('notesKeepRow');
const notesKeep = document.getElementById('notesKeep');
const notesKeepNew = document.getElementById('notesKeepNew');
const notesKeyToggle = document.getElementById('notesKeyToggle');
const keyScreen = document.getElementById('keyScreen');
const notesKey = document.getElementById('notesKey');
const notesKeySave = document.getElementById('notesKeySave');
const notesKeyForget = document.getElementById('notesKeyForget');

const KEY_STORE = 'claude-api-key';
const NOTES_HOME = notesPanel.parentElement;   // the bar it came from

let notesCards = [];       // what the last read found, waiting to be kept
let notesDeckName = '';    // what claude would call the deck
let notesBitsHeld = [];    // pictures and pdfs waiting to be read
let notesBusy = false;

/* --- reading it here, with nobody's help --- */

const CARD_SPLITS = [
    /^\s*(?:[-*•]\s*|\d+[.)]\s*)?(.+?)\s+[—–]\s+(.+?)\s*$/,   // term — meaning
    /^\s*(?:[-*•]\s*|\d+[.)]\s*)?(.+?)\s+-\s+(.+?)\s*$/,      // term - meaning
    /^\s*(?:[-*•]\s*|\d+[.)]\s*)?(.+?)\s*=\s*(.+?)\s*$/,      // term = meaning
    /^\s*(?:[-*•]\s*|\d+[.)]\s*)?(.+?)\s*:\s*(.+?)\s*$/,      // term: meaning
    /^\s*(?:[-*•]\s*|\d+[.)]\s*)?(.+?)\s*\t+(.+?)\s*$/        // term<tab>meaning
];

function tidy(words) {
    return String(words).replace(/\s+/g, ' ').replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
}

function readQAPairs(lines) {
    const cards = [];
    for (let index = 0; index < lines.length; index += 1) {
        const question = lines[index].match(/^\s*(?:q|question)\s*[:.)-]\s*(.+)$/i);
        if (!question) continue;
        for (let look = index + 1; look < Math.min(lines.length, index + 4); look += 1) {
            const answer = lines[look].match(/^\s*(?:a|ans|answer)\s*[:.)-]\s*(.+)$/i);
            if (!answer) continue;
            cards.push({ question: tidy(question[1]), answer: tidy(answer[1]) });
            index = look;
            break;
        }
    }
    return cards;
}

function readBlocks(text) {
    const blocks = text
        .split(/\n\s*\n/)
        .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
        .filter((lines) => lines.length);

    const isHeading = (line) => line.length <= 60 && !/[.,;]$/.test(line);
    const deep = blocks.filter((lines) => lines.length > 1 && isHeading(lines[0]));
    if (deep.length && blocks.length > 1) {
        return deep.map((lines) => ({
            question: tidy(lines[0].replace(/[:：]\s*$/, '')),
            answer: tidy(lines.slice(1).join(' '))
        }));
    }

    if (blocks.length >= 2 && blocks.length % 2 === 0) {
        const cards = [];
        for (let index = 0; index < blocks.length; index += 2) {
            cards.push({ question: tidy(blocks[index][0]), answer: tidy(blocks[index + 1][0]) });
        }
        return cards;
    }
    return [];
}

function readNotes(text) {
    const lines = text.split('\n').filter((line) => line.trim());
    const pairs = readQAPairs(lines);
    if (pairs.length) return pairs;

    const cards = [];
    lines.forEach((line) => {
        if (/^\s*#{1,6}\s/.test(line)) return;   // a heading is not a card
        for (const split of CARD_SPLITS) {
            const hit = line.match(split);
            if (!hit) continue;
            const question = tidy(hit[1]);
            const answer = tidy(hit[2]);
            if (!question || !answer) return;
            cards.push({ question, answer });
            return;
        }
    });
    if (cards.length) return cards;

    return readBlocks(text);
}

/* --- what it found --- */

// the same question twice is one card, whichever pass turned it up
function mergeCards(into, more) {
    const seen = new Set(into.map((card) => card.question.toLowerCase()));
    more.forEach((card) => {
        const mark = card.question.toLowerCase();
        if (!card.question || !card.answer || seen.has(mark)) return;
        seen.add(mark);
        into.push(card);
    });
    return into;
}

function renderFound(cards, said) {
    notesCards = cards;
    notesFound.innerHTML = '';
    cards.forEach((card, index) => {
        const row = document.createElement('li');
        row.className = 'notes-card';

        const text = document.createElement('span');
        text.className = 'notes-card-text';
        const question = document.createElement('strong');
        question.textContent = card.question;
        const answer = document.createElement('small');
        answer.textContent = card.answer;
        text.append(question, answer);

        const drop = document.createElement('button');
        drop.className = 'notes-card-drop';
        drop.type = 'button';
        drop.textContent = '×';
        drop.setAttribute('aria-label', `leave out ${card.question}`);
        drop.addEventListener('click', () => {
            notesCards.splice(index, 1);
            renderFound(notesCards, said);
        });

        row.append(text, drop);
        notesFound.append(row);
    });

    notesKeepRow.hidden = cards.length === 0;
    notesKeep.textContent = `keep ${cards.length} card${cards.length === 1 ? '' : 's'}`;
    if (said !== undefined) notesNote.textContent = said;
}

function keepCards(deck) {
    notesCards.forEach((card) => deck.cards.push({ question: card.question, answer: card.answer }));
    const kept = notesCards.length;
    renderDecks();
    renderCards();
    saveDecks();
    notesInput.value = '';
    clearBits();
    renderFound([], `${kept} card${kept === 1 ? '' : 's'} into ${deck.name}`);
}

notesKeep.addEventListener('click', () => {
    if (notesCards.length) keepCards(activeDeck());
});

notesKeepNew.addEventListener('click', () => {
    if (!notesCards.length) return;
    const deck = { id: `deck-${Date.now()}`, name: notesDeckName || 'from my notes', cards: [] };
    decks.push(deck);

    activeDeckId = deck.id;
    keepCards(deck);
});

notesRead.addEventListener('click', () => {
    const text = notesInput.value.trim();
    if (!text) {
        notesNote.textContent = notesBitsHeld.length
            ? 'a picture has to be looked at — use make flashcards'
            : 'paste something first';
        return;
    }
    const found = readNotes(text);
    renderFound(found, found.length
        ? `${found.length} off the list`
        : 'no list in there — use make flashcards and it will read it properly');
});

/* --- pictures and pdfs --- */

const BIT_LIMIT = 8;
const BIT_BYTES = 6 * 1024 * 1024;   // per file, before it is turned into text

function clearBits() {
    notesBitsHeld = [];
    renderBits();
}

function renderBits() {
    notesBits.innerHTML = '';
    notesBitsHeld.forEach((bit, index) => {
        const chip = document.createElement('span');
        chip.className = 'notes-bit';

        if (bit.kind === 'image') {
            const look = document.createElement('img');
            look.src = `data:${bit.mediaType};base64,${bit.data}`;
            look.alt = bit.name;
            chip.append(look);
        } else {
            const mark = document.createElement('span');
            mark.className = 'notes-bit-mark';
            mark.textContent = 'pdf';
            chip.append(mark);
        }

        const drop = document.createElement('button');
        drop.className = 'notes-bit-drop';
        drop.type = 'button';
        drop.textContent = '×';
        drop.title = bit.name;
        drop.setAttribute('aria-label', `take off ${bit.name}`);
        drop.addEventListener('click', () => {
            notesBitsHeld.splice(index, 1);
            renderBits();
        });

        chip.append(drop);
        notesBits.append(chip);
    });
    notesBits.hidden = notesBitsHeld.length === 0;
}

function asBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error(`couldn't read ${file.name}`));
        reader.readAsDataURL(file);
    });
}

async function holdFiles(files) {
    const taking = [...files].filter((file) => file && (file.type.startsWith('image/') || file.type === 'application/pdf'));
    if (!taking.length) {
        notesNote.textContent = 'pictures and pdfs only';
        return;
    }
    for (const file of taking) {
        if (notesBitsHeld.length >= BIT_LIMIT) {
            notesNote.textContent = `${BIT_LIMIT} at a time is the most it will carry`;
            break;
        }
        if (file.size > BIT_BYTES) {
            notesNote.textContent = `${file.name || 'that one'} is too big — under 6mb each`;
            continue;
        }
        try {
            notesBitsHeld.push({
                kind: file.type === 'application/pdf' ? 'pdf' : 'image',
                mediaType: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'].includes(file.type)
                    ? file.type
                    : 'image/png',
                data: await asBase64(file),
                name: file.name || 'pasted'
            });
        } catch (error) {
            notesNote.textContent = error.message;
        }
    }
    renderBits();
    if (notesBitsHeld.length) {
        notesNote.textContent = `${notesBitsHeld.length} attached — press make flashcards`;
        warmLocal();
    }
}

/* enough typed that this is a page of notes, not a stray keystroke */
notesInput.addEventListener('input', () => {
    if (notesInput.value.trim().length >= 200) warmLocal();
});

notesAttach.addEventListener('click', () => notesFile.click());
notesFile.addEventListener('change', () => {
    holdFiles(notesFile.files);
    notesFile.value = '';
});

// a photo out of the clipboard, straight into the box
notesInput.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData ? event.clipboardData.files : [])];
    if (!files.length) return;
    event.preventDefault();
    holdFiles(files);
});

function catchDrops(panel) {
    ['dragenter', 'dragover'].forEach((name) => panel.addEventListener(name, (event) => {
        event.preventDefault();
        panel.classList.add('is-catching');
    }));
    ['dragleave', 'drop'].forEach((name) => panel.addEventListener(name, (event) => {
        event.preventDefault();
        if (name === 'dragleave' && panel.contains(event.relatedTarget)) return;
        panel.classList.remove('is-catching');
    }));
}

// or dropped anywhere on the panel
catchDrops(notesPanel);
notesPanel.addEventListener('drop', (event) => {
    if (event.dataTransfer && event.dataTransfer.files.length) holdFiles(event.dataTransfer.files);
});

/* --- reading the words out of a picture, here --- */

let ocrLoading = null;

function loadOcr() {
    if (window.Tesseract) return Promise.resolve();
    if (ocrLoading) return ocrLoading;
    ocrLoading = new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = 'ocr/tesseract.min.js';
        tag.onload = () => resolve();
        tag.onerror = () => reject(new Error('the reader would not load'));
        document.head.append(tag);
    });
    return ocrLoading;
}

async function readPicture(bit) {
    await loadOcr();
    const worker = await window.Tesseract.createWorker('eng', 1, {
        workerPath: new URL('ocr/worker.min.js', document.baseURI).href,
        corePath: new URL('ocr/', document.baseURI).href,
        langPath: new URL('ocr/', document.baseURI).href,
        gzip: true
    });
    try {
        const { data } = await worker.recognize(`data:${bit.mediaType};base64,${bit.data}`);
        return (data.text || '').trim();
    } finally {
        worker.terminate();
    }
}

/* --- the model that runs here, with no account and no bill --- */

const LOCAL_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
let localEngine = null;
let localLoading = null;

async function gpuThere() {
    if (!navigator.gpu) return false;
    try {
        return Boolean(await navigator.gpu.requestAdapter());
    } catch (error) {
        return false;
    }
}

let localSay = null;      // whoever is waiting on it, if anyone
let localHeard = null;    // how far the download has got: { mb, part } while it is coming, else null

async function readyLocal(say) {
    localSay = say || localSay;
    if (localEngine) return localEngine;
    if (localLoading) {
        // it is already on its way; whoever just asked hears the rest
        if (say) say(localHeard);
        return localLoading;
    }

    localLoading = (async () => {
        const webllm = await import('./llm/web-llm.js');
        const worker = new Worker('llm-worker.js', { type: 'module' });
        const engine = await webllm.CreateWebWorkerMLCEngine(worker, LOCAL_MODEL, {
            initProgressCallback: (report) => {
                const part = report.progress || 0;
                const fetched = /(\d+)MB fetched/.exec(report.text || '');
                localHeard = fetched && Math.round(part * 100) < 100 ? { mb: Number(fetched[1]), part } : null;
                if (localSay) localSay(localHeard);
            }
        }).catch((error) => { worker.terminate(); throw error; });   // a failed load lets its worker go
        localEngine = engine;
        localHeard = null;
        return engine;
    })();

    try {
        return await localLoading;
    } finally {
        localLoading = null;
    }
}

let warmed = false;

async function warmLocal() {
    if (warmed || localEngine || localLoading || savedKey()) return;
    if (!(await gpuThere())) return;
    warmed = true;
    readyLocal(null).catch(() => { warmed = false; });
}

const LOCAL_BRIEF = [
    'you make flashcards out of study material.',
    'read the text and write a card for every fact, term, date, name or step worth remembering.',
    'question: a short prompt with one answer. answer: a word or a phrase, never a sentence.',
    'one fact per card. do not repeat a card. do not invent anything that is not in the text.',
    'write in lowercase. make as many cards as the text has facts.'
].join('\n');

/* a small model reads a smaller mouthful at a time than a large one */
const LOCAL_PIECE = 2200;

async function askLocal(text, onCards, say) {
    const engine = await readyLocal(say);
    const pieces = text.length <= LOCAL_PIECE ? [text] : cutIntoPieces(text, LOCAL_PIECE);
    const gathered = [];

    for (let index = 0; index < pieces.length; index += 1) {
        if (say) say(null);
        const answer = await engine.chat.completions.create({
            messages: [
                { role: 'system', content: LOCAL_BRIEF },
                { role: 'user', content: pieces[index] }
            ],
            // the same shape the api is held to, enforced as it writes
            response_format: { type: 'json_object', schema: JSON.stringify(NOTES_SCHEMA) },
            temperature: 0.2,
            max_tokens: 2000
        });

        let parsed;
        try {
            parsed = JSON.parse(answer.choices[0].message.content);
        } catch (error) {
            continue;   // that piece came out unreadable; the rest may not
        }
        mergeCards(gathered, cardsFrom(parsed));
        if (!notesDeckName && parsed.deck_name) notesDeckName = tidy(parsed.deck_name);
        if (onCards) onCards(gathered);
    }
    return gathered;
}

/* --- the key --- */

function savedKey() {
    try {
        return window.localStorage.getItem(KEY_STORE) || '';
    } catch (error) {
        return '';
    }
}

function paintKeyState() {
    const key = savedKey();
    notesKeyToggle.textContent = key ? 'sharper reading ✓' : 'sharper reading';
    notesRead.hidden = !key;
}

notesKeyToggle.addEventListener('click', () => {
    showScreen(keyScreen);
    notesKey.focus();
});

function tidyKey(typed) {
    return typed
        .replace(/[\u00a0\u2000-\u200b]/g, ' ')
        .replace(/^\s*(?:bearer|x-api-key|authorization)\s*[:=]?\s*/i, '')
        .replace(/\s+/g, '')
        .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, '')
        .replace(/[^\x21-\x7e]/g, '')
        .trim();
}

// what the api said was wrong, or the status on its own when it said nothing readable
async function apiTrouble(response, fallback) {
    try {
        const body = await response.json();
        if (body.error && body.error.message) return body.error.message;
    } catch (error) { /* the status will have to do */ }
    return fallback;
}

// the cards in a model's answer, tidied, with any that came back half empty left out
function cardsFrom(parsed) {
    return (parsed.cards || [])
        .map((card) => ({ question: tidy(card.question), answer: tidy(card.answer) }))
        .filter((card) => card.question && card.answer);
}

function apiHeaders(key) {
    return {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // the api refuses a call straight from a page without this
        'anthropic-dangerous-direct-browser-access': 'true'
    };
}

async function keyWorks(key) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: apiHeaders(key),
        // the smallest question there is, so this costs a rounding error
        body: JSON.stringify({
            model: 'claude-opus-5',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }]
        })
    });
    if (response.ok) return { fine: true };

    return { fine: false, said: await apiTrouble(response, `the api said ${response.status}`) };
}

notesKeySave.addEventListener('click', async () => {
    const typed = tidyKey(notesKey.value);
    if (!typed) return;

    notesKeySave.disabled = true;
    notesNote.textContent = 'trying the key...';

    let answer;
    try {
        answer = await keyWorks(typed);
    } catch (error) {
        answer = { fine: false, said: 'could not reach the api — is this machine online?' };
    }
    notesKeySave.disabled = false;

    if (!answer.fine) {
        // the api's own words, and then what to do about them
        notesNote.textContent = /x-api-key|authentication/i.test(answer.said)
            ? "that key was refused — copy it again from console.anthropic.com, keys page"
            : `that key was refused — ${answer.said}`;
        return;
    }

    try {
        window.localStorage.setItem(KEY_STORE, typed);
    } catch (error) {
        notesNote.textContent = "this browser won't keep it";
        return;
    }
    notesKey.value = '';
    closeModal();
    paintKeyState();
    notesNote.textContent = 'key saved and working';
});

notesKeyForget.addEventListener('click', () => {
    try {
        window.localStorage.removeItem(KEY_STORE);
    } catch (error) {
        // nothing to forget
    }
    notesKey.value = '';
    paintKeyState();
    notesNote.textContent = 'key forgotten';
});

/* --- asking claude --- */

const NOTES_SCHEMA = {
    type: 'object',
    properties: {
        deck_name: { type: 'string' },
        cards: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    answer: { type: 'string' }
                },
                required: ['question', 'answer'],
                additionalProperties: false
            }
        }
    },
    required: ['deck_name', 'cards'],
    additionalProperties: false
};

const NOTES_BRIEF = [
    'you turn study material into flashcards. you are thorough: your job is to cover the material, not to summarise it.',
    '',
    'what arrives is whatever the reader was studying, in whatever state they had it in:',
    'a tidy list of terms, a page of prose, an essay, a lecture transcript, a chapter, a photograph of',
    'handwritten notes, a slide, a diagram, a pdf. none of it will be laid out as cards, and it does not',
    'need to be. read it, work out what it is teaching, and write the cards yourself.',
    '',
    'write a card for every fact, term, date, name, step, formula, cause, or distinction that could be asked about.',
    'prose hides these in sentences — pull them out. a paragraph explaining one thing is still at least one card.',
    'a dense page should give you twenty cards or more, and a chapter more than that. never stop at a handful.',
    'never put two facts on one card. a list of six things is six cards, not one — plus, where it helps, one card asking for all six.',
    '',
    'the question side is a short prompt: a term to define, or a question with exactly one answer.',
    'the answer side is the shortest thing that answers it — a word or a phrase where that will do, never a paragraph.',
    'keep the wording of the source where it is already clear. do not invent anything that is not in the material.',
    'no yes/no questions, no "what did the notes say about x", and no two cards asking the same thing.',
    '',
    'skip headings, page numbers, "chapter 4", admin, and anything else nobody would revise.',
    'a picture: read everything in it, handwriting included, and take labelled diagrams apart piece by piece.',
    'a pdf: work through all of it, not only the first page.',
    'if it is genuinely not study material — a receipt, a screenshot of a chat — return no cards rather than inventing some.',
    '',
    'write everything in lowercase.',
    'deck_name is two or three lowercase words naming the subject of the material.'
].join('\n');

const NOTES_PIECE = 6000;

function cutIntoPieces(text, size) {
    const most = size || NOTES_PIECE;
    if (text.length <= most) return [text];
    const pieces = [];
    let piece = '';
    text.split(/\n\s*\n/).forEach((block) => {
        if (piece && piece.length + block.length > most) {
            pieces.push(piece);
            piece = '';
        }
        piece += (piece ? '\n\n' : '') + block;
    });
    if (piece.trim()) pieces.push(piece);
    return pieces;
}

async function askClaude(text, bits, onProgress) {
    const key = savedKey();
    if (!key) throw new Error('no key saved');

    const content = bits.map((bit) => (bit.kind === 'pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bit.data } }
        : { type: 'image', source: { type: 'base64', media_type: bit.mediaType, data: bit.data } }));
    content.push({ type: 'text', text: text || 'make cards from everything attached.' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: apiHeaders(key),
        body: JSON.stringify({
            model: 'claude-opus-5',
            max_tokens: 32000,
            stream: true,
            output_config: {
                format: { type: 'json_schema', schema: NOTES_SCHEMA }
            },
            system: NOTES_BRIEF,
            messages: [{ role: 'user', content }]
        })
    });

    if (!response.ok) throw new Error(await apiTrouble(response, `${response.status}`));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let said = '';
    let stopped = '';

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut = buffer.indexOf('\n\n');
        while (cut !== -1) {
            const block = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            block.split('\n').forEach((line) => {
                if (!line.startsWith('data:')) return;
                let event;
                try {
                    event = JSON.parse(line.slice(5).trim());
                } catch (error) {
                    return;
                }
                if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta') {
                    said += event.delta.text;
                    if (onProgress) onProgress((said.match(/"question"/g) || []).length);
                } else if (event.type === 'message_delta' && event.delta && event.delta.stop_reason) {
                    stopped = event.delta.stop_reason;
                } else if (event.type === 'error') {
                    throw new Error((event.error && event.error.message) || 'the stream broke');
                }
            });
            cut = buffer.indexOf('\n\n');
        }
    }

    if (stopped === 'refusal') throw new Error('claude declined that one');
    if (!said.trim()) throw new Error('nothing came back');

    let parsed;
    try {
        parsed = JSON.parse(said);
    } catch (error) {
        // the only way out of a schema is to have been cut off partway
        throw new Error(stopped === 'max_tokens'
            ? 'too much at once — send it in halves'
            : "couldn't read what came back");
    }

    return {
        deckName: tidy(parsed.deck_name || ''),
        cards: cardsFrom(parsed)
    };
}

// while it works, the button is the whole of what it says: 'making flashcards...', and once the
// reader is coming down the line, how much of it has arrived with a bar along the bottom — nothing
// is written under the box until the cards are there
function goSay(words, part) {
    notesGo.textContent = words;
    notesGo.classList.toggle('is-loading', typeof part === 'number');
    if (typeof part === 'number') notesGo.style.setProperty('--done', String(Math.max(0, Math.min(1, part))));
}
function setNotesBusy(busy) {
    notesBusy = busy;
    notesGo.disabled = busy;
    notesRead.disabled = busy;
    notesAttach.disabled = busy;
    if (busy) {
        notesNote.textContent = '';
        goSay('making flashcards...');
    } else {
        goSay('make flashcards');
    }
}
// the reader's own words on the way, turned into what the button shows
// the button while the reader is coming down: how much of it is here, and a bar along its foot
const LOCAL_TOTAL_MB = 1100;
function goSayLocal(info) {
    if (info && info.mb) {
        const total = LOCAL_TOTAL_MB >= 1000 ? `${(LOCAL_TOTAL_MB / 1000).toFixed(1)} gb` : `${LOCAL_TOTAL_MB} mb`;
        goSay(`${info.mb} mb / ${total}`, info.part);
    } else {
        goSay('making flashcards...');
    }
}

async function makeCards() {
    if (notesBusy) return;
    const text = notesInput.value.trim();
    if (!text && !notesBitsHeld.length) {
        shake(notesInput);
        return;
    }

    if (!savedKey()) {
        setNotesBusy(true);
        notesDeckName = '';
        try {
            let gathered = text;
            for (let index = 0; index < notesBitsHeld.length; index += 1) {
                const bit = notesBitsHeld[index];
                if (bit.kind === 'pdf') continue;
                const said = await readPicture(bit);
                if (said) gathered += (gathered ? '\n\n' : '') + said;
            }
            if (gathered !== text) {
                notesInput.value = gathered;
                clearBits();
            }

            if (!gathered.trim()) {
                renderFound([], 'nothing readable in there');
            } else if (await gpuThere()) {
                if (!localEngine) {
                    const quick = readNotes(gathered);
                    if (quick.length) renderFound(quick, '');
                }
                const cards = await askLocal(
                    gathered,
                    (sofar) => { renderFound([...sofar], ''); goSay(`making flashcards... ${sofar.length}`); },
                    goSayLocal
                );
                renderFound(cards, cards.length
                    ? `${cards.length} cards — drop any you don't want, then keep them`
                    : 'it made nothing of that one');
            } else {
                const found = readNotes(gathered);
                renderFound(found, found.length
                    ? `${found.length} off the list`
                    : "this browser can't run the reader — notes already in pairs are all it can do here");
            }
        } catch (error) {
            shake(notesGo);
        }
        setNotesBusy(false);
        return;
    }

    setNotesBusy(true);
    const gathered = [];
    notesDeckName = '';

    // every photo and pdf a call of its own (the words go with the first); words alone, cut into pieces
    const runs = notesBitsHeld.map((bit, index) => ({ bits: [bit], text: index === 0 ? text : '' }));
    if (!notesBitsHeld.length && text) cutIntoPieces(text).forEach((piece) => runs.push({ bits: [], text: piece }));

    try {
        for (const run of runs) {
            goSay('making flashcards...');
            const answer = await askClaude(run.text, run.bits, (count) => {
                goSay(`making flashcards... ${gathered.length + count}`);
            });
            if (!notesDeckName) notesDeckName = answer.deckName;
            mergeCards(gathered, answer.cards);
            renderFound(gathered, '');
        }

        renderFound(gathered, gathered.length
            ? `${gathered.length} cards — drop any you don't want, then keep them`
            : 'nothing in there worth a card');
    } catch (error) {
        shake(notesGo);
    }
    setNotesBusy(false);
}

notesGo.addEventListener('click', makeCards);

/* --- the panel, opened wide --- */

function openNotesWide() {
    if (notesScreen.contains(notesPanel)) {
        showScreen(homeScreen);
        return;
    }
    showScreen(notesScreen);
    flyPanel(notesSlot);
    notesInput.focus();
    warmLocal();
}

function flyPanel(into) {
    if (!into || into.contains(notesPanel)) return;
    const was = notesPanel.getBoundingClientRect();
    into.append(notesPanel);
    const now = notesPanel.getBoundingClientRect();
    if (!was.width || !now.width) return;
    notesPanel.animate([
        {
            width: `${was.width}px`,
            height: `${was.height}px`,
            transform: `translate(${was.left - now.left}px, ${was.top - now.top}px)`
        },
        { width: `${now.width}px`, height: `${now.height}px`, transform: 'none' }
    ], { duration: 300, easing: 'cubic-bezier(0.4, 0.05, 0.2, 1)' });
}

function returnNotesPanel() {
    if (NOTES_HOME && !NOTES_HOME.contains(notesPanel)) NOTES_HOME.append(notesPanel);
}

notesWide.addEventListener('click', (event) => {
    event.stopPropagation();
    openNotesWide();
});

renderBits();
paintKeyState();

/* ---------- 17. scratch   (a spotify playlist, spelled out) ---------- */

const scratchNote = document.getElementById('scratchNote');
const scratchList = document.getElementById('scratchList');
const scratchCopyAll = document.getElementById('scratchCopyAll');
const scratchMatch = document.getElementById('scratchMatch');
const clipSide = document.getElementById('clipSide');

const SCRATCH_KEY = 'scratch-playlist';
let scratchSongs = [];

const BY_MARK = '\u0601';

function songLine(song) {
    return song.by ? `${song.title}${BY_MARK}${song.by}` : song.title;
}

function splitName(name) {
    const at = String(name || '').indexOf(BY_MARK);
    if (at === -1) return { title: tidy(name || ''), artist: '' };
    return { title: tidy(String(name).slice(0, at)), artist: tidy(String(name).slice(at + 1)) };

}

async function copyWords(words, row) {
    let went = true;
    try {
        await navigator.clipboard.writeText(words);
    } catch (error) {
        const hold = document.createElement('textarea');
        hold.value = words;
        hold.style.position = 'fixed';
        hold.style.opacity = '0';
        document.body.append(hold);
        hold.select();
        try {
            went = document.execCommand('copy');
        } catch (other) {
            went = false;
        }
        hold.remove();
    }
    if (row) {
        row.classList.add('is-copied');
        window.setTimeout(() => row.classList.remove('is-copied'), 700);
    }
    return went;
}

let scratchSayTimer = 0;
let scratchSayHold = 0;      // how long these words asked to stay
let scratchSayUnder = false; // the pointer is resting on them

function scratchSayClock() {
    window.clearTimeout(scratchSayTimer);
    if (!scratchSayHold || scratchSayUnder) return;
    scratchSayTimer = window.setTimeout(() => scratchNote.classList.remove('is-up'), scratchSayHold);
}

function saySc(words, hold = 3600) {
    window.clearTimeout(scratchSayTimer);
    if (!words) {
        scratchSayHold = 0;
        scratchNote.classList.remove('is-up');
        return;
    }
    scratchNote.textContent = words;
    scratchNote.classList.add('is-up');
    scratchSayHold = hold;
    scratchSayClock();
}

// resting on it holds it there; leaving starts the few seconds again
scratchNote.addEventListener('pointerenter', () => {
    scratchSayUnder = true;
    window.clearTimeout(scratchSayTimer);
});
scratchNote.addEventListener('pointerleave', () => {
    scratchSayUnder = false;
    scratchSayClock();
});

function songKey(song) {
    return `${tidy(song.title)}\u0000${tidy(song.by || '')}\u0000${song.ms || 0}`.toLowerCase();
}

function countSongs(songs) {
    const seen = new Map();
    songs.forEach((song, index) => {
        const key = songKey(song);
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(index);
    });
    return seen;
}

function copiesAdrift(at) {
    return Boolean(at) && at.length > 1
        && at.some((index, n) => n > 0 && index !== at[n - 1] + 1);
}

/* ---- a list pasted in, instead of a link ---- */

// one csv line, split on its commas but not the ones inside quotes
function csvCells(line) {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let at = 0; at < line.length; at += 1) {
        const ch = line[at];
        if (quoted) {
            if (ch !== '"') cell += ch;
            else if (line[at + 1] === '"') { cell += '"'; at += 1; }
            else quoted = false;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { cells.push(cell); cell = ''; }
        else cell += ch;
    }
    cells.push(cell);
    return cells.map((one) => one.trim());
}

function msOf(text, saysMs) {
    const clock = String(text).match(/^(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?$/);
    if (clock) return ((Number(clock[1] || 0) * 3600) + (Number(clock[2]) * 60) + Number(clock[3])) * 1000;
    const plain = Number(String(text).replace(/[^\d.]/g, ''));
    if (!isFinite(plain) || !plain) return 0;
    if (saysMs) return Math.round(plain);
    return plain > 3600 ? Math.round(plain) : Math.round(plain * 1000);
}

function columnsOf(head) {
    const has = (...wants) => head.findIndex((one) => {
        const low = one.toLowerCase();
        return wants.some((want) => low.includes(want));
    });
    const exact = head.findIndex((one) => /^(track name|title|song)$/i.test(one));
    return {
        title: exact !== -1 ? exact : has('track name', 'title', 'song', 'name'),
        by: has('artist name', 'artist', 'by'),
        ms: has('duration', 'length', 'time')
    };
}

function songsFromList(text) {
    const lines = String(text).replace(/\r/g, '').split('\n')
        .map((one) => one.trim()).filter(Boolean);
    if (!lines.length) return [];

    // a csv, if its first line names the columns rather than holding a song
    const head = csvCells(lines[0]);
    const col = columnsOf(head);
    if (head.length > 1 && col.title !== -1) {
        const saysMs = col.ms !== -1 && /\bms\b|millisecond/i.test(head[col.ms] || '');
        return lines.slice(1).map((line) => {
            const cell = csvCells(line);
            const title = tidy(cell[col.title] || '');
            if (!title) return null;
            return {
                title,
                // several artists come back run together on the commas
                by: tidy(col.by === -1 ? '' : (cell[col.by] || '')).replace(/\s*,\s*/g, ', '),
                ms: col.ms === -1 ? 0 : msOf(cell[col.ms] || '', saysMs)
            };
        }).filter(Boolean);
    }

    return lines.map((line) => {
        const bare = line.replace(/^\d+\s*[.)\]]\s*/, '');
        const parts = bare.split(/\s+[-\u2013\u2014\u00b7|]\s+/);
        const title = tidy(parts[0] || '');
        if (!title) return null;
        return { title, by: tidy(parts.slice(1).join(' - ')), ms: 0 };
    }).filter(Boolean);
}

function renderScratch(songs, said) {
    scratchSongs = songs;
    const twiceOver = countSongs(songs);
    scratchList.innerHTML = '';
    songs.forEach((song, index) => {
        const item = document.createElement('li');
        const row = document.createElement('button');
        row.className = 'scratch-song';
        row.type = 'button';
        row.title = `${songLine(song)} — press to copy`;

        const at = document.createElement('span');
        at.className = 'scratch-at';
        at.textContent = String(index + 1);
        const sameAs = twiceOver.get(songKey(song)) || [];
        const adrift = copiesAdrift(sameAs);
        if (adrift) row.classList.add('is-twice');

        const words = document.createElement('span');
        words.className = 'scratch-words';
        const name = document.createElement('strong');
        name.textContent = song.title;
        const by = document.createElement('small');
        by.textContent = song.by;
        words.append(name, by);

        row.append(at, words);
        if (adrift) {
            const twice = document.createElement('span');
            twice.className = 'scratch-twice';
            twice.textContent = `\u00d7${sameAs.length}`;
            twice.title = `in the playlist ${sameAs.length} times, in different places`;
            row.append(twice);
        }
        row.addEventListener('click', (event) => {
            event.stopPropagation();
            copyWords(songLine(song), row);
        });
        item.append(row);
        scratchList.append(item);
    });
    scratchCopyAll.hidden = songs.length === 0;
    scratchMatch.hidden = songs.length === 0;
    clipSide.classList.toggle('has-songs', songs.length > 0);
    if (said !== undefined) saySc(said);
}

function keepScratch(songs) {
    try {
        window.localStorage.setItem(SCRATCH_KEY, JSON.stringify({ songs }));
    } catch (error) {
        // out of room; it just won't survive a refresh
    }
}

function loadScratch() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(SCRATCH_KEY));
        if (!saved || !Array.isArray(saved.songs)) return;
        renderScratch(saved.songs, '');
        // whichever kept list these songs are, so the window shows it as on
        const same = savedLists().find((one) => one.songs.length === saved.songs.length
            && one.songs[0] && saved.songs[0] && one.songs[0].title === saved.songs[0].title);
        if (same) currentList = same.name;
    } catch (error) {
        // nothing kept, or it didn't read
    }
}

/* --- every list you have brought in, kept --- */

const LISTS_KEY = 'scratch-lists';

function savedLists() {
    try {
        const kept = JSON.parse(window.localStorage.getItem(LISTS_KEY));
        return Array.isArray(kept) ? kept.filter((one) => one && Array.isArray(one.songs)) : [];
    } catch (error) {
        return [];
    }
}

function keepLists(lists) {
    try {
        window.localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        return true;
    } catch (error) {
        saySc('no room to keep that one');
        return false;
    }
}

// the name a file goes by, without the machinery on the end of it
function listName(from) {
    return tidy(String(from || '')
        .replace(/\.[a-z0-9]{1,5}$/i, '')
        .replace(/[_]+/g, ' ')) || 'playlist';
}

function rememberList(name, songs) {
    const called = listName(name);
    const lists = savedLists().filter((one) => one.name !== called);
    lists.unshift({ name: called, songs, when: Date.now() });
    keepLists(lists);
    return called;
}

function forgetList(name) {
    keepLists(savedLists().filter((one) => one.name !== name));
    if (currentList === name) currentList = '';
    paintLists();
}

let currentList = '';

function paintLists() {
    const lists = savedLists();
    listKept.innerHTML = '';
    listKept.hidden = lists.length === 0;

    lists.forEach((one) => {
        const row = document.createElement('li');

        const pick = document.createElement('button');
        pick.className = 'list-pick';
        pick.type = 'button';
        pick.title = 'put this one in the box';
        if (one.name === currentList) pick.classList.add('is-on');

        const name = document.createElement('strong');
        name.textContent = one.name;
        const many = document.createElement('small');
        many.textContent = `${one.songs.length}`;
        pick.append(name, many);
        pick.addEventListener('click', () => {
            currentList = one.name;
            renderScratch(one.songs, '');
            keepScratch(one.songs);
            paintLists();
            showScreen(homeScreen);
            saySc(`${one.name} — ${one.songs.length} songs`);
        });

        const drop = document.createElement('button');
        drop.className = 'list-forget';
        drop.type = 'button';
        drop.textContent = '×';
        drop.title = 'forget this one';
        drop.addEventListener('click', (event) => {
            event.stopPropagation();
            forgetList(one.name);
        });

        row.append(pick, drop);
        listKept.append(row);
    });
}

function takeList(text, how, called) {
    const songs = songsFromList(text);
    if (!songs.length) {
        saySc('no songs I could read in that');
        return false;
    }
    renderScratch(songs, '');
    keepScratch(songs);
    currentList = rememberList(called || `playlist ${savedLists().length + 1}`, songs);
    paintLists();
    saySc(`${songs.length} ${how}`);
    return true;
}

// a file of them, opened or dropped
const scratchFile = document.getElementById('scratchFile');
const scratchOpen = document.getElementById('scratchOpen');
const listKept = document.getElementById('listKept');

async function takeListFile(file) {
    if (!file) return false;
    try {
        // the file's own name is what the playlist goes by afterwards
        return takeList(await file.text(), 'read in', file.name);
    } catch (error) {
        saySc('could not read that file');
        return false;
    }
}

const listFrame = document.getElementById('listFrame');
const siteBlocked = document.getElementById('siteBlocked');
siteBlocked.addEventListener('click', (event) => {
    if (event.target.closest('a')) return;
    siteBlocked.hidden = true;
});

function fitSite() {
    const site = document.getElementById('listSite');
    const look = getComputedStyle(site);
    const wide = parseFloat(look.getPropertyValue('--site-wide')) || 1100;
    const clip = parseFloat(look.getPropertyValue('--site-clip')) || 0;
    const bar = parseFloat(look.getPropertyValue('--site-bar')) || 0;
    const room = site.clientWidth + clip + bar;
    if (room > 0) site.style.setProperty('--site-fit', String(room / wide));
}

window.addEventListener('resize', fitSite);

function wakeListSite() {
    if (listFrame.dataset.woke) return;
    listFrame.dataset.woke = 'yes';
    const here = () => document.getElementById('listSite').classList.add('is-here');
    listFrame.addEventListener('load', here);
    window.setTimeout(here, 8000);
    window.setTimeout(() => { listFrame.src = 'https://exportify.net/'; }, 380);
}

const SITE_RETURNS = 3;
let sentBack = 0;
window.addEventListener('securitypolicyviolation', (event) => {
    if (event.violatedDirective !== 'frame-src') return;
    if (!listFrame.dataset.woke) return;
    siteBlocked.hidden = false;
    if (sentBack >= SITE_RETURNS) return;
    sentBack += 1;
    document.getElementById('listSite').classList.remove('is-here');
    listFrame.src = 'https://exportify.net/';
});

scratchOpen.addEventListener('click', () => {
    paintLists();
    wakeListSite();
    showScreen(listScreen);
    fitSite();
    sentBack = 0;              // a fresh opening gets its goes again
    siteBlocked.hidden = true;
});

scratchFile.addEventListener('change', () => {
    takeListFile(scratchFile.files[0]);
    scratchFile.value = '';        // the same file again should still count
});

catchDrops(clipSide);
clipSide.addEventListener('drop', (event) => {
    const moved = event.dataTransfer;
    if (!moved) return;
    if (moved.files && moved.files.length) { takeListFile(moved.files[0]); return; }
    // some things drag as words rather than as a file
    const said = moved.getData && moved.getData('text');
    if (said && /\n/.test(said.trim())) takeList(said, 'dropped in');
});

/* --- the playlist, laid against the clips --- */

const MATCH_SLACK = 1;      // seconds either way, and no more
const MATCH_NAMED = 2;     // and a little more when the name agrees too
const MATCH_REACH = 12;    // how many songs it will step over to find one
const MATCH_STEP = 0.6;    // what skipping one of them costs, in seconds of fit

function titleWords(words) {
    return String(words || '')
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, ' ')
        .replace(/\s-\s.*$/, ' ')
        .replace(/[^\p{L}\p{N} ]+/gu, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 1);
}

function titleAgrees(name, song) {
    const mine = titleWords(splitName(name).title);
    const theirs = titleWords(song.title);
    if (!mine.length || !theirs.length) return false;
    const shared = theirs.filter((word) => mine.includes(word)).length;
    return shared / Math.min(mine.length, theirs.length) >= 0.6;
}

function clipUnnamed(record) {
    return !record.name || /^clip \d+$/.test(record.name.trim());
}

function songFor(row, from, to, anchor, claimed) {
    const seconds = row.seconds();

    const own = clipUnnamed(row.record) ? '' : row.record.name;
    const agrees = [];
    if (own) {
        for (let look = from; look < to; look += 1) {
            if (titleAgrees(own, scratchSongs[look])) agrees.push(look);
        }
    }

    let found = -1;
    let best = Infinity;
    let near = Infinity;
    for (let look = from; look < to; look += 1) {
        const song = scratchSongs[look];
        if (!song.ms) continue;
        if (claimed && claimed.has(look)) continue;
        const apart = Math.abs((song.ms / 1000) - seconds);
        near = Math.min(near, apart);
        if (agrees.length && !agrees.includes(look)) continue;
        const allowed = agrees.length ? MATCH_NAMED : MATCH_SLACK;
        if (apart > allowed) continue;
        const score = apart + (anchor === null ? 0 : Math.max(0, look - anchor) * MATCH_STEP);
        if (score < best) {
            best = score;
            found = look;
        }
    }
    return { found, near, byName: agrees.length > 0 };
}

function matchClipsToSongs() {
    const rows = [...recordingList.querySelectorAll('.recording-item')]
        .reverse()                                  // bottom of the list first
        .map((row) => clipRows.get(row.dataset.clipId))
        .filter(Boolean);

    if (!rows.length) return saySc('no clips to match');
    if (!scratchSongs.some((song) => song.ms)) return saySc('these songs came without their lengths — read the link again');

    const picks = rows.map(() => -1);
    const claimed = new Set();
    const nearest = rows.map(() => Infinity);
    let byName = 0;
    let at = 0;             // how far along the playlist the walk has got

    rows.forEach((row, index) => {
        const end = Math.min(scratchSongs.length, at + MATCH_REACH);
        const got = songFor(row, at, end, at, claimed);
        nearest[index] = got.near;
        if (got.found === -1) return;

        const next = rows[index + 1];
        if (got.found > at && next) {
            const reach = (from) => songFor(
                next, from, Math.min(scratchSongs.length, from + MATCH_REACH), null, claimed
            ).found;
            if (reach(got.found + 1) === -1 && reach(at) !== -1) return;
        }

        picks[index] = got.found;
        claimed.add(got.found);
        if (got.byName) byName += 1;
        at = got.found + 1;
    });

    rows.forEach((row, index) => {
        if (picks[index] !== -1) return;
        let low = 0;
        for (let below = index - 1; below >= 0; below -= 1) {
            if (picks[below] !== -1) { low = picks[below] + 1; break; }
        }
        let high = scratchSongs.length;
        for (let above = index + 1; above < rows.length; above += 1) {
            if (picks[above] !== -1) { high = picks[above]; break; }
        }
        if (low >= high) return;
        const got = songFor(row, low, high, null, claimed);
        nearest[index] = Math.min(nearest[index], got.near);
        if (got.found === -1) return;
        picks[index] = got.found;
        claimed.add(got.found);
        if (got.byName) byName += 1;
    });

    let named = 0;
    let off = 0;
    rows.forEach((row, index) => {
        if (picks[index] === -1) {
            off += 1;
            const miss = !Number.isFinite(nearest[index])
                ? `no songs left for ${clockFace(row.seconds())}`
                : nearest[index] <= MATCH_SLACK
                    ? `${clockFace(row.seconds())} fits a song out of turn`
                    : `no song near ${clockFace(row.seconds())} — nearest ${nearest[index].toFixed(1)}s off`;
            row.sayOff(true, miss);
            return;
        }
        row.sayOff(false, '');
        if (clipUnnamed(row.record)) {
            row.rename(songLine(scratchSongs[picks[index]]));
            named += 1;
        }
    });

    const missing = markScratch(claimed);

    const lined = rows.length - off;
    const bits = [off ? `${lined} lined up · ${off} off` : `all ${lined} lined up`];
    if (named) bits.push(`${named} named`);
    else if (byName) bits.push(`${byName} by name`);
    if (missing) bits.push(`${missing} to record`);
    saySc(bits.join(' · ') + (off || missing ? '' : ' ✓'));
}

function markScratch(claimed) {
    const rows = [...scratchList.querySelectorAll('.scratch-song')];
    let missing = 0;
    rows.forEach((row, index) => {
        const got = claimed.has(index);
        row.classList.toggle('is-got', got);
        row.classList.toggle('is-missing', !got);

        let ring = row.querySelector('.scratch-none');
        if (got && ring) ring.remove();
        if (!got && !ring) {
            ring = document.createElement('span');
            ring.className = 'scratch-none';
            ring.textContent = '\u25cb';
            row.insertBefore(ring, row.querySelector('.scratch-twice'));
        }
        if (!got) missing += 1;
        row.title = got ? 'recorded — press to copy' : 'not recorded — press to copy';
    });
    return missing;
}

scratchMatch.addEventListener('click', (event) => {
    event.stopPropagation();
    matchClipsToSongs();
});

scratchCopyAll.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (!scratchSongs.length) return;
    const went = await copyWords(scratchSongs.map(songLine).join('\n'));
    saySc(went ? `${scratchSongs.length} copied ✓` : 'the browser would not let go of the clipboard');
});

loadScratch();

/* ---------- 18. option, and what things do ---------- */

const sayWhat = document.getElementById('sayWhat');
let optionDown = false;
let pointerAt = { x: 0, y: 0 };

function whatItDoes(node) {
    const named = node && node.closest
        && node.closest('button, a, [role="button"], [title], [data-said]');
    if (!named) return '';
    if (named.matches('input, textarea, select')) return '';
    const said = named.getAttribute('title')
        || named.getAttribute('data-said')
        || named.getAttribute('aria-label')
        || named.textContent;
    return tidy(said || '').slice(0, 90);
}

let hushed = null;

function hushTitle(named) {
    if (hushed === named) return;
    sayTitleAgain();
    if (!named || !named.hasAttribute('title')) return;
    named.setAttribute('data-said', named.getAttribute('title'));
    named.removeAttribute('title');
    hushed = named;
}

function sayTitleAgain() {
    if (!hushed) return;
    if (hushed.hasAttribute('data-said')) {
        hushed.setAttribute('title', hushed.getAttribute('data-said'));
        hushed.removeAttribute('data-said');
    }
    hushed = null;
}

function placeSayWhat() {
    if (!optionDown) return;
    const under = document.elementFromPoint(pointerAt.x, pointerAt.y);
    hushTitle(under && under.closest && under.closest('[title], [data-said]'));
    const words = whatItDoes(under);
    if (!words) {
        sayWhat.classList.remove('is-up');
        return;
    }
    sayWhat.textContent = words;
    sayWhat.classList.add('is-up');

    const box = sayWhat.getBoundingClientRect();
    const right = pointerAt.x + 18;
    const left = right + box.width > window.innerWidth - 8
        ? Math.max(8, pointerAt.x - 18 - box.width)
        : right;
    // level with the pointer rather than below it: beside means beside
    const middle = pointerAt.y - box.height / 2;
    sayWhat.style.left = `${Math.round(left)}px`;
    sayWhat.style.top = `${Math.round(Math.max(8, Math.min(window.innerHeight - box.height - 8, middle)))}px`;
}

window.addEventListener('pointermove', (event) => {
    pointerAt = { x: event.clientX, y: event.clientY };
    if (optionDown) placeSayWhat();
});

// option on a mac, alt anywhere else (altgraph is the right-hand alt on many keyboards)
const isOptionKey = (event) => event.key === 'Alt' || event.key === 'AltGraph';
window.addEventListener('keydown', (event) => {
    if (!isOptionKey(event)) return;
    event.preventDefault();   // on windows a lone alt would otherwise hand focus to the browser's menu
    if (optionDown) return;
    optionDown = true;
    placeSayWhat();
});

function letGoOption() {
    optionDown = false;
    sayWhat.classList.remove('is-up');
    sayTitleAgain();
}

window.addEventListener('keyup', (event) => {
    if (!isOptionKey(event)) return;
    event.preventDefault();
    letGoOption();
});
// letting go of the window counts as letting go of the key
window.addEventListener('blur', letGoOption);

/* ---------- 19. chat   (the one page that is not only yours) ---------- */

const chatScreen = document.getElementById('chatScreen');
const accountScreen = document.getElementById('accountScreen');
const chatWhoLine = document.getElementById('chatWho');
const chatSignOut = document.getElementById('chatSignOut');
const chatMeButton = document.getElementById('chatMeButton');
const accountPop = document.getElementById('accountPop');
const roomList = document.getElementById('roomList');
const roomMake = document.getElementById('roomMake');
const roomNameField = document.getElementById('roomName');
const talkName = document.getElementById('talkName');
const talkLog = document.getElementById('talkLog');
const talkWelcome = document.getElementById('talkWelcome');
const talkStart = document.getElementById('talkStart');
const talkForm = document.getElementById('talkForm');
const talkSay = document.getElementById('talkSay');
const chatHandle = document.getElementById('chatHandle');
const chatWord = document.getElementById('chatWord');
const chatGo = document.getElementById('chatGo');
const chatSwap = document.getElementById('chatSwap');
const chatDoorTitle = document.getElementById('chatDoorTitle');
const chatNote = document.getElementById('chatNote');
const chatBody = document.getElementById('chatBody');

[roomNameField, talkSay, chatHandle].forEach(stopGuessing);

const MASK_IN_CSS = CSS.supports('-webkit-text-security', 'disc');
document.querySelectorAll('.word-field').forEach((field) => { if (!MASK_IN_CSS) field.type = 'password'; });
// the eye in a password box shows what is typed and hides it again: shut while it is hidden, open
// while it shows
document.querySelectorAll('.word-eye').forEach((eye) => {
    const field = eye.parentElement.querySelector('.word-field');
    eye.addEventListener('click', () => {
        const showing = !field.classList.contains('is-shown');
        field.classList.toggle('is-shown', showing);
        if (!MASK_IN_CSS) field.type = showing ? 'text' : 'password';
        eye.classList.toggle('is-open', showing);
        eye.setAttribute('aria-pressed', String(showing));
        eye.title = showing ? 'hide password' : 'show password';
        eye.setAttribute('aria-label', eye.title);
        field.focus();
    });
});
['copy', 'cut', 'dragstart'].forEach((kind) => chatWord.addEventListener(kind, (event) => event.preventDefault()));

const CHAT_BOARD = 'https://ntfy.sh';
// a test can point the chat at a board of its own (localStorage chat-era-test); nobody else sets it
const CHAT_ERA = (() => { try { return window.localStorage.getItem('chat-era-test') || 'v3'; } catch (error) { return 'v3'; } })();
const CHAT_TOPIC = `morie-top-chat-${CHAT_ERA}`;
const CHAT_ME = `chat-me-${CHAT_ERA}`;
const CHAT_KNOWN = `chat-known-${CHAT_ERA}`;
const CHAT_WITH = `chat-with-${CHAT_ERA}`;
const CHAT_GONE = ['chat-me', 'chat-known', 'chat-with', 'chat-room', 'chat-place',
    'chat-me-v2', 'chat-known-v2', 'chat-with-v2', 'chat-skip-v2', 'chat-accounts-v2'];   // the v2 board, reset by request
CHAT_GONE.forEach((key) => {
    try { window.localStorage.removeItem(key); } catch (error) { /* nothing kept */ }
});
// once per reset: everything else the old board left here goes too — pictures and all
try {
    if (window.localStorage.getItem(`chat-reset-${CHAT_ERA}`) !== 'yes') {
        Object.keys(window.localStorage)
            .filter((key) => key.startsWith('chat-') && !key.endsWith(`-${CHAT_ERA}`) && key !== 'chat-era-test')
            .forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.setItem(`chat-reset-${CHAT_ERA}`, 'yes');
    }
} catch (error) { /* nothing kept */ }
const TALK_KEEP = 300;          // how much of a thread each browser keeps
const SAME_BREATH = 10 * 60 * 1000;   // lines this close together share one head, as on discord

let chatOn = false;             // the board is answering
let chatMe = null;              // { name, word } — the word is the hash
let chatPeople = {};            // every account the board has told us of
let chatFriends = [];           // the ones you added — the only ones shown
let chatDms = {};               // their name (lowercased) -> the lines between you
let chatSealed = [];            // sealed posts waiting on a key to read them
// what is never to be read again: a deleted line, or a note that has already done its work.
// a public board can't forget a post, so this browser does
const CHAT_SKIP = `chat-skip-${CHAT_ERA}`;
let chatSkip = new Set((() => { try { return JSON.parse(window.localStorage.getItem(CHAT_SKIP) || '[]'); } catch (error) { return []; } })());
function keepSkip() { try { window.localStorage.setItem(CHAT_SKIP, JSON.stringify([...chatSkip].slice(-4000))); } catch (error) { /* fine */ } }
// a line can carry a note instead of words — a file, an edit, a deletion. it starts with this
const CHAT_NOTE = '\u0000';
const FILE_TOPIC = `${CHAT_TOPIC}-files`;
const CHAT_FILE_MOST = 15 * 1024 * 1024;   // what the board will carry, and it keeps it three hours
let chatProfiles = [];          // signed profile changes waiting to be checked
let chatPriv = null;            // your own private key, this browser only
let chatWith = null;            // whose thread is open, lowercased
let chatDoorNew = false;   // assume an account already exists
// pineapple or pizza: one of the two, picked once at sign-up, never changed, shown on the profile
const SIDES = ['pineapple', 'pizza'];
let pickedSide = '';
// an account's pick, followed through any renames (a renamed account's new name may not carry it yet)
function sideOf(name) {
    const key = String(name || '').toLowerCase();
    if (chatPeople[key] && chatPeople[key].side) return chatPeople[key].side;
    const home = whoIs(key);
    const found = Object.keys(chatPeople).find((one) => chatPeople[one].side && whoIs(one) === home);
    return found ? chatPeople[found].side : '';
}
let chatStarting = false;
let chatStream = null;

/* whose thread was open last time */
function whoWasOpen() {
    if (chatWith && chatFriends.includes(chatWith)) return chatWith;   // this account's own last thread
    const held = window.localStorage.getItem(CHAT_WITH);
    if (held && chatFriends.includes(held)) return held;
    return chatFriends[0] || null;
}

function saySomethingChat(words) {
    chatNote.textContent = words || '';
}

async function wordHash(word) {
    const bytes = new TextEncoder().encode(`morie:${word}`);
    const out = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(out)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* --- keeping a message to the two people in it --- */

const KEY_SHAPE = { name: 'ECDH', namedCurve: 'P-256' };
const SEAL_SHAPE = { name: 'AES-GCM', length: 256 };
const WRAP_ROUNDS = 150000;

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (text) => Uint8Array.from(atob(text), (ch) => ch.charCodeAt(0));

async function makeKeyPair() {
    const pair = await crypto.subtle.generateKey(KEY_SHAPE, true, ['deriveKey']);
    return {
        pub: await crypto.subtle.exportKey('jwk', pair.publicKey),
        priv: await crypto.subtle.exportKey('jwk', pair.privateKey)
    };
}

// the password, turned into something that can lock a key away
async function wordKey(word, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(word), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: WRAP_ROUNDS, hash: 'SHA-256' },
        base, SEAL_SHAPE, false, ['encrypt', 'decrypt']
    );
}

async function wrapPriv(privJwk, word) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await wordKey(word, salt);
    const body = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(privJwk))
    );
    return { salt: toB64(salt), iv: toB64(iv), body: toB64(body) };
}

async function unwrapPriv(kept, word) {
    const key = await wordKey(word, fromB64(kept.salt));
    const out = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(kept.iv) }, key, fromB64(kept.body)
    );
    return JSON.parse(new TextDecoder().decode(out));
}

async function betweenKey(myPrivJwk, theirPubJwk) {
    const mine = await crypto.subtle.importKey('jwk', myPrivJwk, KEY_SHAPE, false, ['deriveKey']);
    const theirs = await crypto.subtle.importKey('jwk', theirPubJwk, KEY_SHAPE, false, []);
    return crypto.subtle.deriveKey({ name: 'ECDH', public: theirs }, mine, SEAL_SHAPE, false, ['encrypt', 'decrypt']);
}

async function sealWords(key, words) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const body = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(words));
    return { iv: toB64(iv), body: toB64(body) };
}

async function openWords(key, iv, body) {
    const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(body));
    return new TextDecoder().decode(out);
}

/* profile changes are signed with the account's own key (the same p-256 key, used as ecdsa),
   so nobody else can post a new nickname, name or password for you */
const SIGN_SHAPE = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_HOW = { name: 'ECDSA', hash: 'SHA-256' };
const profileWords = (post) => [post.id, post.name, post.nick || '', post.to || '', post.word || '',
    post.keep ? JSON.stringify(post.keep) : '', post.at].join('|');

async function signProfile(post) {
    const { kty, crv, x, y, d } = chatPriv;
    const key = await crypto.subtle.importKey('jwk', { kty, crv, x, y, d, ext: true }, SIGN_SHAPE, false, ['sign']);
    const sig = await crypto.subtle.sign(SIGN_HOW, key, new TextEncoder().encode(profileWords(post)));
    return { ...post, sig: toB64(sig) };
}

async function profileIsTrue(post, pub) {
    try {
        const { kty, crv, x, y } = pub;
        const key = await crypto.subtle.importKey('jwk', { kty, crv, x, y, ext: true }, SIGN_SHAPE, false, ['verify']);
        return await crypto.subtle.verify(SIGN_HOW, key, fromB64(post.sig), new TextEncoder().encode(profileWords(post)));
    } catch (error) {
        return false;
    }
}

/* --- what this browser remembers on its own --- */

function loadKnown() {
    try {
        const held = JSON.parse(window.localStorage.getItem(CHAT_KNOWN) || 'null');
        if (!held) return;
        chatPeople = held.people || {};
        chatFriends = Array.isArray(held.friends) ? held.friends : [];
        chatDms = held.dms || {};
        chatPriv = held.priv || null;
    } catch (error) {
        // nothing kept, or kept badly. the board will fill it in.
    }
}

function keepKnown() {
    try {
        window.localStorage.setItem(CHAT_KNOWN, JSON.stringify({
            people: chatPeople,
            friends: chatFriends,
            dms: chatDms,
            priv: chatPriv
        }));
    } catch (error) {
        // out of room; it just won't survive a refresh
    }
}

/* --- the board --- */

function postToBoard(topic, body) {
    return fetch(`${CHAT_BOARD}/${topic}`, { method: 'POST', body: JSON.stringify(body) });
}

function takePost(post) {
    if (!post || !post.k) return false;
    if (post.k === 'who' && post.name && post.word) {
        const key = post.name.toLowerCase();
        if (!chatPeople[key]) {
            chatPeople[key] = { name: post.name, word: post.word, pub: post.pub || null, keep: post.keep || null };
            if (SIDES.includes(post.side)) chatPeople[key].side = post.side;   // picked once, at sign-up: the first word on it stands
        } else if (!chatPeople[key].pub && post.pub) {
            chatPeople[key].pub = post.pub;
            chatPeople[key].keep = post.keep || chatPeople[key].keep;
        }
        return true;
    }
    if (post.k === 'dm' && post.id && post.from && post.to) {
        if (!chatMe) return false;
        if (chatSkip.has(post.id)) return false;
        if (chatSealed.some((one) => one.id === post.id)) return false;
        if (Object.values(chatDms).some((lines) => lines.some((one) => one.id === post.id))) return false;
        chatSealed.push(post);          // whose it is is worked out when it is opened, after any renames
        return true;
    }
    if (post.k === 'me' && post.id && post.name && post.sig) {
        if (chatProfiles.some((one) => one.id === post.id)) return false;
        chatProfiles.push(post);
        return true;
    }
    return false;
}

/* the page is looked at. nothing before this has touched the network. */
async function wakeChat() {
    if (chatStarting || chatOn) { paintChatBar(); return; }
    chatStarting = true;
    loadKnown();
    const mine = (() => {
        try { return JSON.parse(window.localStorage.getItem(CHAT_ME) || 'null'); } catch (error) { return null; }
    })();
    if (mine && mine.name && mine.word) chatMe = mine;
    if (chatMe && !heldAccounts().some((one) => one.name.toLowerCase() === chatMe.name.toLowerCase())) stashAccount();
    paintPeople();
    // the last thread opens straight away from what this browser already holds — waiting for the
    // board drew the welcome first and then swapped it for the thread a beat later, which was the glitch
    if (chatMe) openWith(whoWasOpen());
    else { paintTalk(); paintChatShape(); }
    chatWhoLine.textContent = 'catching up…';

    const onBoard = await catchUp();
    if (!onBoard) {
        chatStarting = false;
        chatWhoLine.textContent = 'the chat board would not answer';
        paintChatShape();
        return;
    }
    sayAgainWhatIsMissing(onBoard);

    listenToBoard();
    chatStarting = false;
    paintChatBar();
    paintPeople();
    openWith(whoWasOpen());
}

async function catchUp() {
    try {
        const said = await fetch(`${CHAT_BOARD}/${CHAT_TOPIC}/json?poll=1&since=all`);
        if (!said.ok) throw new Error(String(said.status));
        const lines = (await said.text()).trim().split('\n').filter(Boolean);
        const onBoard = new Set();
        lines.forEach((line) => {
            try {
                const note = JSON.parse(line);
                if (note.event !== 'message' || !note.message) return;
                const post = JSON.parse(note.message);
                takePost(post);
                onBoard.add(`${post.k}:${post.k === 'me' ? post.id : (post.id || (post.name || '').toLowerCase())}`);
            } catch (error) {
                // somebody else posting to the same topic; not ours to read
            }
        });
        chatOn = true;
        await applyProfiles();
        await openWhatIsWaiting();
        keepKnown();
        return onBoard;
    } catch (error) {
        return null;
    }
}

async function openWhatIsWaiting() {
    if (!chatMe || !chatPriv || !chatSealed.length) return false;
    const waiting = chatSealed;
    chatSealed = [];
    const stillWaiting = [];
    let opened = false;
    let arrived = false;

    const mine = chatMe.name.toLowerCase();
    for (const post of waiting) {
        const from = whoIs(post.from);
        const to = whoIs(post.to);
        if (from !== mine && to !== mine) continue;     // not ours, and never will be
        const other = from === mine ? to : from;
        const them = chatPeople[other];
        if (!them || !them.pub) { stillWaiting.push(post); continue; }
        try {
            const key = await betweenKey(chatPriv, them.pub);
            let said = await openWords(key, post.iv, post.body);
            let file = null;
            if (said.startsWith(CHAT_NOTE)) {
                let note = null;
                try { note = JSON.parse(said.slice(1)); } catch (error) { note = null; }
                if (note && (note.gone || note.edit)) {
                    lineChanged(other, note, from);
                    chatSkip.add(post.id);
                    keepSkip();
                    opened = true;
                    continue;
                }
                if (note && note.file) { file = note.file; said = ''; } else continue;
            }
            const held = chatDms[other] || [];
            if (held.some((one) => one.id === post.id)) continue;
            chatDms[other] = [...held, { id: post.id, by: from, said, at: post.at || 0, ...(file ? { file } : {}) }]
                .sort((one, two) => (one.at || 0) - (two.at || 0))
                .slice(-TALK_KEEP);
            // someone who writes to you turns up in your list, added or not — otherwise a message
            // (one from your own other account, say) sat in a thread nothing on screen led to
            if (!chatFriends.includes(other)) { chatFriends = [...chatFriends, other]; arrived = true; }
            opened = true;
        } catch (error) {
        }
    }
    chatSealed = [...stillWaiting, ...chatSealed];   // keep anything that came in while these were opening
    if (opened) keepKnown();
    if (arrived) paintPeople();
    return opened;
}

// a deletion or an edit, from whoever wrote the line — nobody else's counts
function lineChanged(other, note, from) {
    const lines = chatDms[other] || [];
    const id = note.gone || note.edit;
    const line = lines.find((one) => one.id === id);
    if (note.gone) {
        chatSkip.add(id);
        keepSkip();
        if (line && whoIs(line.by) === from) chatDms[other] = lines.filter((one) => one.id !== id);
        return;
    }
    if (line && whoIs(line.by) === from && typeof note.said === 'string') {
        line.said = note.said.slice(0, TALK_MOST);
        line.edited = true;
    }
}

function sayAgainWhatIsMissing(onBoard) {
    const missing = [];
    if (chatMe && !onBoard.has(`who:${chatMe.name.toLowerCase()}`)) {
        const me = chatPeople[chatMe.name.toLowerCase()];
        if (me && me.pub) {
            missing.push({ k: 'who', name: me.name, word: me.word, pub: me.pub, keep: me.keep, ...(me.side ? { side: me.side } : {}), at: Date.now() });
        }
    }
    const me = chatMe && chatPeople[chatMe.name.toLowerCase()];
    if (me && me.lastMe && !onBoard.has(`me:${me.lastMe.id}`)) missing.push(me.lastMe);
    // the board forgets an account after twelve hours; whoever knows it puts it back, so a friend
    // (or another of your own accounts) who hasn't been round lately can still be found and logged into
    const known = new Set([...chatFriends, ...heldAccounts().map((one) => one.name.toLowerCase())]);
    known.forEach((key) => {
        const them = chatPeople[key];
        if (!them || !them.pub || !them.word || onBoard.has(`who:${key}`)) return;
        if (chatMe && key === chatMe.name.toLowerCase()) return;   // already handled above
        missing.push({ k: 'who', name: them.name, word: them.word, pub: them.pub, keep: them.keep, ...(them.side ? { side: them.side } : {}), at: Date.now() });
    });
    missing.slice(0, 12).forEach((post, at) => {
        window.setTimeout(() => postToBoard(CHAT_TOPIC, post).catch(() => {}), at * 400);
    });
}

function listenToBoard() {
    if (chatStream) chatStream.close();
    chatStream = new EventSource(`${CHAT_BOARD}/${CHAT_TOPIC}/sse`);
    chatStream.addEventListener('message', (event) => {
        let post;
        try {
            post = JSON.parse(JSON.parse(event.data).message);
        } catch (error) {
            return;
        }
        if (!takePost(post)) return;
        keepKnown();
        if (post.k === 'who') paintPeople();
        if (post.k === 'me') {
            applyProfiles().then(() => { keepKnown(); paintPeople(); paintTalk(); paintChatBar(); openWith(chatWith); });
        }
        if (post.k === 'dm' || post.k === 'who') {
            openWhatIsWaiting().then((opened) => { if (opened) { paintTalk(); paintPeople(); } });
        }
    });
    chatStream.addEventListener('error', () => paintChatBar());
}

/* --- the people you added, and nobody else --- */

function paintPeople() {
    roomList.innerHTML = '';
    chatFriends.forEach((key) => {
        const them = chatPeople[key];
        const line = document.createElement('li');
        const tap = document.createElement('button');
        tap.className = 'room-row';
        tap.type = 'button';
        tap.dataset.key = key;
        // like any messaging app: their picture, their name, and the last thing said with the time
        const face = document.createElement('span');
        face.className = 'room-face';
        face.innerHTML = PERSON_MARK;
        const words = document.createElement('span');
        words.className = 'room-words';
        const name = document.createElement('b');
        name.textContent = displayName(key);
        const last = (chatDms[key] || []).slice(-1)[0];
        const line2 = document.createElement('small');
        line2.textContent = last ? `${chatMe && whoIs(last.by) === chatMe.name.toLowerCase() ? 'you: ' : ''}${last.file ? `file · ${last.file.name}` : last.said}` : (them && them.pub ? 'say hi' : 'hasn\'t opened the chat yet');
        words.append(name, line2);
        const when = document.createElement('span');
        when.className = 'room-when';
        when.textContent = last && last.at ? shortWhen(last.at) : '';
        tap.append(face, words, when);
        // no key of theirs means nothing can be sealed to them yet
        tap.title = them && them.pub ? displayName(key) : `${displayName(key)} — no key yet`;
        if (!(them && them.pub)) tap.classList.add('is-waiting');
        if (chatWith === key) tap.classList.add('is-on');
        tap.addEventListener('click', () => openWith(key));
        line.append(tap);
        roomList.append(line);
    });
    // nobody yet: one line in the emptiness, and nothing else
    if (!chatFriends.length) {
        const hint = document.createElement('li');
        hint.className = 'room-hint';
        hint.textContent = 'you have no friends...';
        roomList.append(hint);
    }
    paintChatShape();
}

// 3:04 pm today, otherwise the day
function shortWhen(ms) {
    const when = new Date(ms);
    if (when.toDateString() === new Date().toDateString()) {
        return when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    }
    return when.toLocaleDateString([], { day: 'numeric', month: 'short' }).toLowerCase();
}

/* the log-in form lives in the log-in window, and is carried onto the page while signed out —
   one form, so nothing has to be kept in step */
const chatLogin = document.getElementById('chatLogin');
const doorBody = chatScreen.querySelector('.ask-body');
function placeDoor(onPage) {
    const home = onPage ? document.getElementById('loginSlot') : chatScreen;
    if (doorBody.parentElement !== home) home.append(doorBody);
}

// the empty talk side: how many friends and lines you have, and the last person you talked to
function paintWelcome() {
    const tally = document.getElementById('welcomeTally');
    const figure = document.createElement('span');
    figure.className = 'welcome-num';
    figure.textContent = String(chatFriends.length);
    tally.replaceChildren(figure, ` ${chatFriends.length === 1 ? 'friend' : 'friends'}`);
    let latest = null;
    chatFriends.forEach((key) => {
        const last = (chatDms[key] || []).slice(-1)[0];
        if (last && (!latest || last.at > latest.at)) latest = { key, at: last.at };
    });
    const back = document.getElementById('welcomeBack');
    back.hidden = !latest;
    if (latest) {
        back.dataset.who = latest.key;
        back.textContent = `back to ${displayName(latest.key)}`;
    }
}

/* signed out: a log-in screen. signed in: the app, with a welcome until a thread is open */
function paintChatShape() {
    const ready = Boolean(chatMe);
    chatLogin.hidden = ready;
    chatBody.hidden = !ready;
    if (!ready && chatScreen.hidden) { placeDoor(true); paintChatDoor(); }
    talkWelcome.hidden = Boolean(chatWith);
    document.getElementById('talkForm').hidden = !chatWith;   // no thread, no box to type in
    paintWelcome();
    roomMake.classList.toggle('is-off', !ready);
    roomNameField.disabled = !ready;
    if (!chatWith) {
        talkSay.disabled = true;
        talkSay.placeholder = ready ? '' : 'log in to send messages';
    }
    if (chatSplitter) chatSplitter.reclamp();
}

// a field that has something wrong with it shakes, rather than a line of words appearing under it
// several fields shaken together: only the first takes the focus
function shakeAlong(field, first) {
    if (!field) return;
    if (first) { shake(field); return; }
    field.classList.remove('is-shaking');
    void field.offsetWidth;
    field.classList.add('is-shaking');
    field.addEventListener('animationend', () => field.classList.remove('is-shaking'), { once: true });
}
// a name already taken says so beside its label: 'taken' shows at once and fades away over a second
function flagTaken() {
    const flag = document.getElementById('takenFlag');
    if (!flag) return;
    flag.getAnimations().forEach((move) => move.cancel());
    flag.animate([{ opacity: 1 }, { offset: 0.15, opacity: 1 }, { opacity: 0 }], { duration: 1180, easing: 'ease-out', fill: 'forwards' });
}
function shake(field) {
    if (!field) return;
    field.classList.remove('is-shaking');
    void field.offsetWidth;                 // so a second slip shakes again
    field.classList.add('is-shaking');
    field.addEventListener('animationend', () => field.classList.remove('is-shaking'), { once: true });
    if (typeof field.focus === 'function' && field.matches('input')) field.focus();
}

async function addSomeone(typed, complain) {
    const called = typed.trim();
    if (!called) return false;
    if (!chatMe) { openChatDoor(); return false; }
    let key = whoIs(called.toLowerCase());      // an old name lands on the one it moved to
    if (key === chatMe.name.toLowerCase()) { shake(roomNameField); return false; }
    if (chatFriends.includes(key)) { openWith(key); return false; }

    if (!chatPeople[key]) { await catchUp(); key = whoIs(called.toLowerCase()); }
    if (!chatPeople[key]) { shake(roomNameField); return false; }
    if (chatFriends.includes(key)) { openWith(key); return false; }

    chatFriends = [...chatFriends, key];
    keepKnown();
    complain('');
    paintPeople();
    openWith(key);
    return true;
}

roomMake.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (await addSomeone(roomNameField.value, saySomethingChat)) roomNameField.value = '';
});

// back to whoever you talked to last
document.getElementById('welcomeBack').addEventListener('click', (event) => {
    const who = event.currentTarget.dataset.who;
    if (who) openWith(who);
});

function openWith(who) {
    // files waiting in the tray were meant for the thread they were added in
    try { if (who !== chatWith && traying.length) clearTray(); } catch (error) { /* not set up yet */ }
    chatWith = who && chatFriends.includes(who) ? who : null;
    if (chatWith) window.localStorage.setItem(CHAT_WITH, chatWith);
    else window.localStorage.removeItem(CHAT_WITH);

    roomList.querySelectorAll('.room-row').forEach((row) => {
        row.classList.toggle('is-on', row.dataset.key === chatWith);
    });
    paintTalk();
    paintChatShape();

    const handle = document.getElementById('talkHandle');
    document.getElementById('talkFace').hidden = !chatWith;   // only the person you're talking to has a face up here
    if (!chatWith) {
        talkName.textContent = '';
        handle.textContent = '';
        talkSay.disabled = true;
        return;
    }
    const them = chatPeople[chatWith];
    talkName.textContent = displayName(chatWith);
    handle.textContent = `@${them ? them.name : chatWith}`;
    talkSay.disabled = !chatOn || !them || !them.pub || !chatPriv;
    talkSay.placeholder = talkSay.disabled && them && !them.pub
        ? 'they have not opened the chat yet'
        : `message @${them ? them.name : chatWith}`;
}

// files: the clip opens the picker, and anything dropped on the thread is sent too
const talkFile = document.getElementById('talkFile');
document.getElementById('talkAttach').addEventListener('click', () => {
    if (!chatMe || !chatWith) return;
    talkFile.click();
});
talkFile.addEventListener('change', () => {
    const files = [...talkFile.files];
    talkFile.value = '';
    files.forEach(trayFile);
});
// anywhere on the talk side takes a dropped file — the thread, the message box, the header —
// and a picture pasted into the message box is sent too (png, jpg, webp, gif, anything)
const talkSide = document.getElementById('talkSide');
const carriesFiles = (event) => event.dataTransfer && [...event.dataTransfer.types].includes('Files');
talkSide.addEventListener('dragover', (event) => {
    if (!carriesFiles(event)) return;
    event.preventDefault();
    if (chatWith) talkLog.classList.add('is-dropping');
});
talkSide.addEventListener('dragleave', (event) => {
    if (!talkSide.contains(event.relatedTarget)) talkLog.classList.remove('is-dropping');
});
talkSide.addEventListener('drop', async (event) => {
    talkLog.classList.remove('is-dropping');
    if (!carriesFiles(event)) return;
    event.preventDefault();
    if (!chatWith) return;
    [...event.dataTransfer.files].forEach(trayFile);
});
talkSay.addEventListener('paste', async (event) => {
    const files = event.clipboardData ? [...event.clipboardData.files] : [];
    if (!files.length || !chatWith) return;
    event.preventDefault();
    files.forEach(trayFile);
});
// a file let go anywhere else on the page must not open in place of the site
window.addEventListener('dragover', (event) => { if (carriesFiles(event)) event.preventDefault(); });
window.addEventListener('drop', (event) => { if (carriesFiles(event)) event.preventDefault(); });

// how long a line may be. the board turns any post over 4096 bytes into a file nobody can read as
// a line, which is why very long messages used to vanish: sealed and base64'd, a line grows by
// about a third, so 1000 characters — and no more than 2800 bytes, for emoji — stays under it
const TALK_MOST = 1000;
const fitsBoard = (words) => new TextEncoder().encode(words).length <= 2800;
const talkLeft = document.getElementById('talkLeft');
function paintLeft() {
    const left = TALK_MOST - talkSay.value.length;
    const heavy = !fitsBoard(talkSay.value);
    talkLeft.hidden = left > 150 && !heavy;     // only near the end
    talkLeft.textContent = heavy ? 'too long' : String(left);
}
talkSay.addEventListener('input', paintLeft);

talkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const words = talkSay.value.trim();
    if ((!words && !traying.length) || !chatMe || !chatWith) return;
    if (words && !fitsBoard(words)) { shake(talkForm); return; }
    const to = chatWith;     // switching thread mid-send must not carry the rest to someone else
    // the files first, each one marked on its own chip; any that fail stay in the tray to try again
    const going = traying.filter((one) => !one.chip.classList.contains('is-sending'));
    for (const held of going) {
        if (chatWith !== to || !traying.includes(held)) break;
        if (held.file.size > CHAT_FILE_MOST) { shake(held.chip); continue; }
        held.chip.classList.remove('is-failed');
        held.chip.classList.add('is-sending');
        const sent = await sendFile(to, held.file);
        held.chip.classList.remove('is-sending');
        if (sent) {
            traying = traying.filter((one) => one !== held);
            held.chip.remove();
        } else {
            held.chip.classList.add('is-failed');
            shake(held.chip);
        }
    }
    paintTray();
    if (words) {
        talkSay.value = '';
        await sendSealed(to, words.slice(0, TALK_MOST));
        paintLeft();
    }
});

// seals words for the two of you and makes the post; nothing is sent yet
async function sealedPost(other, words) {
    const them = chatPeople[other];
    if (!them || !them.pub) { saySomethingChat('no key for them yet — they need to open the chat once'); return null; }
    if (!chatPriv) { saySomethingChat('this browser has no key of yours. sign in again'); return null; }
    const post = { k: 'dm', id: newId(), from: chatMe.name, to: them.name, at: Date.now() };
    try {
        const key = await betweenKey(chatPriv, them.pub);
        const sealed = await sealWords(key, words);
        post.iv = sealed.iv;
        post.body = sealed.body;
    } catch (error) {
        saySomethingChat('that would not seal');
        return null;
    }
    return post;
}

async function sendSealed(other, words, file, blob) {
    const post = await sealedPost(other, file ? CHAT_NOTE + JSON.stringify({ file }) : words);
    if (!post) return null;
    if (blob) filesOpen.set(post.id, blob);    // so drawing it doesn't fetch back what was just sent
    chatDms[other] = [...(chatDms[other] || []), { id: post.id, by: chatMe.name, said: file ? '' : words, at: post.at, ...(file ? { file } : {}) }]
        .slice(-TALK_KEEP);
    keepKnown();
    paintTalk();
    paintPeople();
    postToBoard(CHAT_TOPIC, post).catch(() => saySomethingChat('that line did not reach the board'));
    return post;
}

// a note that changes a line already said (an edit, a deletion); it is never a line itself
async function sendNote(other, note) {
    const post = await sealedPost(other, CHAT_NOTE + JSON.stringify(note));
    if (!post) return;
    chatSkip.add(post.id);
    keepSkip();
    postToBoard(CHAT_TOPIC, post).catch(() => saySomethingChat('that did not reach the board'));
}

/* --- files: sealed in this browser, carried by the board for three hours, kept here after --- */
function fileShelf(mode) {
    return new Promise((resolve, reject) => {
        const open = indexedDB.open('chat-files', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('files');
        open.onsuccess = () => resolve(open.result.transaction('files', mode).objectStore('files'));
        open.onerror = () => reject(open.error);
    });
}
async function fileKept(id) {
    try {
        const shelf = await fileShelf('readonly');
        return await new Promise((resolve) => {
            const ask = shelf.get(id);
            ask.onsuccess = () => resolve(ask.result || null);
            ask.onerror = () => resolve(null);
        });
    } catch (error) { return null; }
}
async function keepFile(id, blob) {
    try { (await fileShelf('readwrite')).put(blob, id); } catch (error) { /* it will be fetched again */ }
}
const filesOpen = new Map();   // id -> the file, opened, for this visit
async function fileOf(other, line) {
    if (filesOpen.has(line.id)) return filesOpen.get(line.id);
    let blob = await fileKept(line.id);
    if (!blob) {
        const them = chatPeople[other];
        if (!them || !them.pub || !chatPriv || !line.file || !line.file.url) return null;
        try {
            const got = await fetch(line.file.url);
            if (!got.ok) return null;
            const key = await betweenKey(chatPriv, them.pub);
            const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(line.file.iv) }, key, await got.arrayBuffer());
            blob = new Blob([plain], { type: line.file.type || 'application/octet-stream' });
            keepFile(line.id, blob);
        } catch (error) { return null; }
    }
    filesOpen.set(line.id, blob);
    return blob;
}
function fileSize(bytes) {
    if (bytes < 1024) return `${bytes} b`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kb`;
    return `${(bytes / 1024 / 1024).toFixed(1)} mb`;
}
// sends one file; answers true or false — the tray shows which, on the file itself
async function sendFile(other, file) {
    if (!file || file.size > CHAT_FILE_MOST) return false;
    const them = chatPeople[other];
    if (!them || !them.pub || !chatPriv) return false;
    try {
        const key = await betweenKey(chatPriv, them.pub);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await file.arrayBuffer());
        const put = await fetch(`${CHAT_BOARD}/${FILE_TOPIC}`, { method: 'PUT', body: new Blob([sealed]), headers: { Filename: 'sealed.bin' } });
        if (!put.ok) throw new Error(String(put.status));
        const answer = await put.json();
        if (!answer.attachment || !answer.attachment.url) throw new Error('no file');
        const meta = { url: answer.attachment.url, iv: toB64(iv), name: file.name.slice(0, 120), type: file.type || '', size: file.size };
        const post = await sendSealed(other, '', meta, file);
        if (!post) return false;
        filesOpen.set(post.id, file);
        keepFile(post.id, file);
        paintTalk();
        return true;
    } catch (error) {
        return false;
    }
}

/* --- the tray: files picked, dropped or pasted wait just above the message box until the send --- */
const talkTray = document.getElementById('talkTray');
let traying = [];          // { file, chip }
function paintTray() {
    talkTray.hidden = !traying.length;
}
function trayFile(file) {
    if (!file || !chatWith) return;
    const chip = document.createElement('li');
    chip.className = 'tray-chip';
    const look = document.createElement('span');
    look.className = 'tray-look';
    look.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v4h4"/></svg>';
    if ((file.type || '').startsWith('image/')) {
        smallPicture(file, 240).then((pic) => {
            if (!pic) return;
            look.innerHTML = '';
            const img = document.createElement('img');
            img.src = pic;
            img.alt = '';
            look.append(img);
        });
    }
    const words = document.createElement('span');
    words.className = 'tray-words';
    const name = document.createElement('span');
    name.textContent = file.name || 'file';
    const size = document.createElement('small');
    size.textContent = fileSize(file.size || 0);
    words.append(name, size);
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'tray-out';
    out.title = 'take it off';
    out.setAttribute('aria-label', 'take it off');
    out.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
    const held = { file, chip };
    out.addEventListener('click', () => {
        traying = traying.filter((one) => one !== held);
        chip.remove();
        paintTray();
    });
    chip.append(look, words, out);
    talkTray.append(chip);
    traying.push(held);
    if (file.size > CHAT_FILE_MOST) { chip.classList.add('is-failed'); size.textContent = 'over 15 mb'; shake(chip); }
    paintTray();
    talkSay.focus();
}
function clearTray() {
    traying = [];
    talkTray.innerHTML = '';
    paintTray();
}
// a picture, in black and white only — dithered the way the faces are
// a picture file, opened as an image (and its address let go of once it has loaded or failed)
function openPicture(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not a picture')); };
        img.src = url;
    });
}
// floyd–steinberg over whatever is drawn on the canvas, so a photo survives the no-grey rule
function ditherCanvas(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const pen = canvas.getContext('2d');
    const data = pen.getImageData(0, 0, w, h);
    const px = data.data;
    const lum = new Float32Array(w * h);
    for (let i = 0; i < lum.length; i += 1) lum[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            const at = y * w + x;
            const v = lum[at] < 128 ? 0 : 255;
            const err = lum[at] - v;
            lum[at] = v;
            if (x + 1 < w) lum[at + 1] += err * 7 / 16;
            if (y + 1 < h) {
                if (x > 0) lum[at + w - 1] += err * 3 / 16;
                lum[at + w] += err * 5 / 16;
                if (x + 1 < w) lum[at + w + 1] += err / 16;
            }
        }
    }
    for (let i = 0; i < lum.length; i += 1) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = lum[i]; px[i * 4 + 3] = 255; }
    pen.putImageData(data, 0, 0);
    return canvas.toDataURL('image/png');
}
// a picture in a chat line: a small copy in its own colours, no wider than it needs, on white; null if it isn't a picture
async function smallPicture(blob, widest) {
    let img;
    try { img = await openPicture(blob); } catch (error) { return null; }
    const scale = Math.min(1, widest / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const pen = canvas.getContext('2d');
    pen.fillStyle = '#fff';
    pen.fillRect(0, 0, canvas.width, canvas.height);
    pen.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.86);
}
// the one way anything leaves the page as a download. the address is let go of well after, since a
// big file (a zip of every clip) can still be being read out when a short wait is up
function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name || 'file';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 20000);
}
function fileBox(other, line) {
    const box = document.createElement('button');
    box.type = 'button';
    box.className = 'said-file';
    box.title = 'save the file';
    const name = document.createElement('span');
    name.className = 'said-file-name';
    name.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v4h4"/></svg>';
    const called = document.createElement('span');
    called.textContent = line.file.name || 'file';
    const size = document.createElement('small');
    size.textContent = fileSize(line.file.size || 0);
    name.append(called, size);
    box.append(name);
    if ((line.file.type || '').startsWith('image/')) {
        fileOf(other, line).then(async (blob) => {
            if (!blob) { gone(); return; }
            const pic = await smallPicture(blob, 960);
            if (!pic) return;
            const img = document.createElement('img');
            img.src = pic;
            img.alt = line.file.name || 'picture';
            box.append(img);
        });
    }
    const gone = () => {
        if (box.querySelector('.said-file-note')) return;
        const note = document.createElement('span');
        note.className = 'said-file-note';
        note.textContent = 'gone from the board — files keep three hours';
        box.append(note);
    };
    box.addEventListener('click', async () => {
        const blob = await fileOf(other, line);
        if (blob) saveBlob(blob, line.file.name);
        else gone();
    });
    return box;
}

/* --- the three dots on a line --- */
const TOOL_MARKS = {
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4 20l.6-3.8 11-11 3.2 3.2-11 11zM13.6 7.2l3.2 3.2"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
    bin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 6.5h15M10 6.5V4.5h4v2M6.8 6.5l.9 13h8.6l.9-13"/></svg>'
};
function lineTools(row, other, line, words) {
    const mine = chatMe && whoIs(line.by) === chatMe.name.toLowerCase();
    const tools = document.createElement('div');
    tools.className = 'said-tools';
    const mark = (name, title, act) => {
        const press = document.createElement('button');
        press.type = 'button';
        press.className = 'tool-mark';
        press.title = title;
        press.setAttribute('aria-label', title);
        press.innerHTML = TOOL_MARKS[name];
        press.addEventListener('click', (event) => { event.stopPropagation(); act(press); });
        tools.append(press);
        return press;
    };
    if (line.said) mark('copy', 'copy', () => {
        navigator.clipboard.writeText(line.said).then(() => saySomethingChat('copied'), () => {});
        tools.classList.remove('is-open');
    });
    if (line.file) mark('save', 'save the file', async () => {
        const blob = await fileOf(other, line);
        if (blob) saveBlob(blob, line.file.name); else saySomethingChat('that file has gone from the board');
    });
    if (mine && line.said) mark('edit', 'edit', () => { tools.classList.remove('is-open'); editLine(row, other, line, words); });
    mark('bin', mine ? 'delete' : 'remove for me', () => deleteLine(other, line, mine));
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'said-more';
    more.title = 'more';
    more.setAttribute('aria-label', 'more');
    more.innerHTML = TOOL_MARKS.more;
    more.addEventListener('click', (event) => {
        event.stopPropagation();
        talkLog.querySelectorAll('.said-tools.is-open').forEach((one) => { if (one !== tools) one.classList.remove('is-open'); });
        tools.classList.toggle('is-open');
    });
    tools.append(more);
    row.append(tools);
}
// a deleted line can be had back with ctrl/cmd+z for thirty seconds. the deletion only goes to the
// board once those are up, so an undo never has to chase a note the other side already obeyed
const UNDO_FOR = 30000;
let lineUndo = [];
function deleteLine(other, line, mine) {
    const lines = chatDms[other] || [];
    const at = lines.findIndex((one) => one.id === line.id);
    if (at < 0) return;
    chatDms[other] = lines.filter((one) => one.id !== line.id);
    chatSkip.add(line.id);
    keepSkip();
    keepKnown();
    paintTalk();
    paintPeople();
    const held = { other, line, at, timer: 0 };
    held.timer = window.setTimeout(() => {
        lineUndo = lineUndo.filter((one) => one !== held);
        if (mine) sendNote(other, { gone: line.id });
    }, UNDO_FOR);
    lineUndo.push(held);
}
function undoDelete() {
    const held = lineUndo.pop();
    if (!held) return false;
    window.clearTimeout(held.timer);
    chatSkip.delete(held.line.id);
    keepSkip();
    const lines = [...(chatDms[held.other] || [])];
    lines.splice(Math.min(held.at, lines.length), 0, held.line);
    chatDms[held.other] = lines;
    keepKnown();
    paintTalk();
    paintPeople();
    return true;
}
// leaving the page sends what is still waiting, so a deletion isn't lost with the tab
window.addEventListener('pagehide', () => {
    lineUndo.forEach((held) => {
        window.clearTimeout(held.timer);
        if (chatMe && whoIs(held.line.by) === chatMe.name.toLowerCase()) sendNote(held.other, { gone: held.line.id });
    });
    lineUndo = [];
});
document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return;
    if (activeSectionId !== 'chat' || !lineUndo.length) return;
    const tag = event.target.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && event.target.value) return;   // a field's own undo first
    event.preventDefault();
    event.stopImmediatePropagation();
    undoDelete();
}, true);

function editLine(row, other, line, words) {
    // a box that wraps the words and grows with them, so a long line is edited as the long line it is
    const from = words.getBoundingClientRect().height;      // how tall the words were, to open out from
    const field = document.createElement('textarea');
    field.className = 'said-edit';
    field.rows = 1;
    field.maxLength = TALK_MOST;
    field.value = line.said;
    field.setAttribute('aria-label', 'edit the message');
    row.classList.add('is-editing');                         // the dots step aside while the box is open
    words.replaceWith(field);
    // border-box, so the two edges are added to what the words need
    const fit = () => { field.style.height = 'auto'; field.style.height = `${field.scrollHeight + 2}px`; };
    fit();
    // one movement, worked out from where the words were to where the box ends up: height, padding and
    // the room above and below all travel together, so nothing jumps half-way
    const end = getComputedStyle(field);
    field.animate([
        { height: `${from}px`, paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px' },
        { height: field.style.height, paddingTop: end.paddingTop, paddingBottom: end.paddingBottom, marginTop: end.marginTop, marginBottom: end.marginBottom }
    ], { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    field.addEventListener('input', fit);
    field.focus();
    field.select();
    let closed = false;                                      // enter closes it, and so does the blur that follows
    const done = (keep) => {
        if (closed) return;
        closed = true;
        const said = field.value.trim();
        if (keep && said && said !== line.said) {
            line.said = said.slice(0, TALK_MOST);
            line.edited = true;
            keepKnown();
            sendNote(other, { edit: line.id, said: line.said });
        }
        paintTalk();
        paintPeople();
    };
    field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); done(true); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); done(false); }
    });
    field.addEventListener('blur', () => done(true), { once: true });
}
document.addEventListener('click', () => {
    talkLog.querySelectorAll('.said-tools.is-open').forEach((one) => one.classList.remove('is-open'));
});

function whatIsSaid() {
    return (chatWith && chatDms[chatWith]) || [];
}

function paintTalk() {
    // a line being edited is left alone; closing the edit draws the thread again anyway
    const editing = document.activeElement;
    if (editing && editing.classList.contains('said-edit') && talkLog.contains(editing)) return;
    // where the reader was, read before the rows go — afterwards the log is short and always 'at the bottom'
    const stuck = talkLog.scrollHeight - talkLog.scrollTop - talkLog.clientHeight < 60;
    const was = talkLog.scrollTop;
    talkLog.querySelectorAll('.said-row, .said-day').forEach((row) => row.remove());
    const said = whatIsSaid();
    // like discord: an open thread begins with who it is with
    talkStart.hidden = !chatWith;
    if (chatWith) {
        const them = chatPeople[chatWith];
        document.getElementById('talkStartName').textContent = displayName(chatWith);
        document.getElementById('talkStartSay').textContent = `this is the start of your messages with @${them ? them.name : chatWith}. only the two of you can read them.`;
        const side = sideOf(chatWith);
        const sideLine = document.getElementById('talkStartSide');
        sideLine.hidden = !side;
        sideLine.textContent = side ? `team ${side}` : '';
    }
    if (!said.length) return;

    let lastBy = '';
    let lastAt = 0;
    let lastDay = '';
    said.forEach((one) => {
        const day = one.at ? new Date(one.at).toDateString() : '';
        if (day && day !== lastDay) {
            const divide = document.createElement('div');
            divide.className = 'said-day';
            divide.textContent = new Date(one.at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
            talkLog.append(divide);
            if (lastDay) lastBy = '';     // a new day starts a new head
            lastDay = day;
        }
        const row = document.createElement('article');
        row.className = 'said-row';
        const runOn = one.by === lastBy && (one.at || 0) - lastAt < SAME_BREATH;
        if (runOn) {
            // like discord: a grouped line shows its own short time in the gutter on hover
            row.classList.add('is-run-on');
            const gutter = document.createElement('span');
            gutter.className = 'said-gutter';
            gutter.textContent = one.at ? new Date(one.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s?[ap]m$/, '') : '';
            row.append(gutter);
        } else {
            const face = document.createElement('span');
            face.className = 'said-face';
            wearFace(face, chatMe && whoIs(one.by) === chatMe.name.toLowerCase());
            const head = document.createElement('p');
            head.className = 'said-head';
            const who = document.createElement('b');
            who.textContent = displayName(one.by) || 'someone';
            const when = document.createElement('span');
            when.className = 'said-when';
            when.textContent = saidAt(one.at);
            head.append(who, when);
            row.append(face, head);
        }
        const words = document.createElement('p');
        words.className = 'said-words';
        words.textContent = one.said || '';
        if (one.edited) {
            const was = document.createElement('span');
            was.className = 'said-edited';
            was.textContent = '(edited)';
            words.append(was);
        }
        if (one.file) {
            words.textContent = '';
            words.append(fileBox(chatWith, one));
        }
        row.append(words);
        lineTools(row, chatWith, one, words);
        talkLog.append(row);
        lastBy = one.by;
        lastAt = one.at || 0;
    });

    talkLog.scrollTop = stuck ? talkLog.scrollHeight : was;
}

function saidAt(ms) {
    if (!ms) return '';
    const when = new Date(ms);
    const sameDay = when.toDateString() === new Date().toDateString();
    const clock = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    if (sameDay) return `today at ${clock}`;
    const yesterday = new Date(Date.now() - 86400000).toDateString() === when.toDateString();
    if (yesterday) return `yesterday at ${clock}`;
    return `${when.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: '2-digit' })} ${clock}`;
}

/* --- who you are --- */

function paintChatBar() {
    const said = chatMe ? 'account' : 'log in';
    chatMeButton.classList.toggle('is-solid', Boolean(chatMe));
    chatMeButton.setAttribute('aria-label', said);
    chatMeButton.title = said;
    if (!chatMe) chatWhoLine.textContent = chatOn ? 'not signed in' : 'the chat board would not answer';
    else chatWhoLine.textContent = chatOn ? chatMe.name : `${chatMe.name} — offline`;
    paintFaces();
    if (!accountPop.hidden) paintAccount();
}

/* --- names: who someone is now, and what to call them --- */

// follows renames to whoever the name belongs to now, lowercased
function whoIs(name) {
    let key = String(name || '').toLowerCase();
    for (let hops = 0; hops < 12 && chatPeople[key] && chatPeople[key].movedTo; hops += 1) key = chatPeople[key].movedTo;
    return key;
}

function displayName(name) {
    const them = chatPeople[whoIs(name)];
    return (them && (them.nick || them.name)) || name || '';
}

const NAME_OK = /^[a-z0-9_.-]{1,20}$/;   // usernames: lowercase letters, digits, _ - .

async function applyProfiles() {
    const waiting = chatProfiles.sort((one, two) => (one.at || 0) - (two.at || 0));
    chatProfiles = [];
    for (const post of waiting) {
        const key = whoIs(post.name);
        const them = chatPeople[key];
        if (!them || !them.pub) { chatProfiles.push(post); continue; }      // their account isn't here yet
        if ((them.profileAt || 0) >= post.at) continue;
        if (!await profileIsTrue(post, them.pub)) continue;                  // not signed by them: ignored
        them.profileAt = post.at;
        if (post.nick !== undefined) them.nick = post.nick;
        if (post.word && post.keep) { them.word = post.word; them.keep = post.keep; }
        if (chatMe && key === chatMe.name.toLowerCase()) them.lastMe = post;
        if (post.to) moveAccount(key, post.to);
    }
}

function moveAccount(fromKey, toName) {
    const toKey = toName.toLowerCase();
    const was = chatPeople[fromKey];
    const there = chatPeople[toKey];
    if (there && there.pub && JSON.stringify(there.pub) !== JSON.stringify(was.pub)) return;   // taken by someone else
    chatPeople[toKey] = { ...was, name: toName, movedTo: undefined };
    chatPeople[fromKey] = { ...was, movedTo: toKey };
    chatFriends = chatFriends.map((one) => (one === fromKey ? toKey : one));
    if (chatDms[fromKey]) { chatDms[toKey] = [...(chatDms[toKey] || []), ...chatDms[fromKey]]; delete chatDms[fromKey]; }
    if (chatWith === fromKey) chatWith = toKey;
    if (chatMe && chatMe.name.toLowerCase() === fromKey) {
        keepAccounts(heldAccounts().filter((one) => one.name.toLowerCase() !== fromKey));
        try {
            const pic = window.localStorage.getItem(faceKey(fromKey));
            if (pic) { window.localStorage.setItem(faceKey(toName), pic); window.localStorage.removeItem(faceKey(fromKey)); }
        } catch (error) { /* fine */ }
        chatMe = { ...chatMe, name: toName };
        window.localStorage.setItem(CHAT_ME, JSON.stringify(chatMe));
        stashAccount();
    }
}

// posts one signed change of your own, and takes it here at once
async function postProfile(change) {
    const me = chatPeople[chatMe.name.toLowerCase()];
    const post = await signProfile({ k: 'me', id: newId(), name: chatMe.name, nick: me.nick || '', at: Date.now(), ...change });
    chatProfiles.push(post);
    await applyProfiles();
    keepKnown();
    await postToBoard(CHAT_TOPIC, post);
}

function paintAccount() {
    if (!chatMe) return;
    document.getElementById('accName').textContent = displayName(chatMe.name);
    document.getElementById('accHandle').textContent = `@${chatMe.name}`;
    const side = sideOf(chatMe.name);
    const accSide = document.getElementById('accSide');
    accSide.hidden = !side;
    accSide.textContent = side ? `team ${side}` : '';
    paintFaces();
    paintAccountList();
}

function paintAccountSettings() {
    const me = chatPeople[chatMe.name.toLowerCase()] || {};
    document.getElementById('setNickNow').textContent = me.nick || '';
    document.getElementById('setNameNow').textContent = `@${chatMe.name}`;
    document.getElementById('accFaceClear').disabled = !myFace();
}

/* your picture: kept in this browser only, squeezed to 96px and dithered to pure black and white */
const FACE_KEY = 'chat-face';
const PERSON_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="9" r="3.6"/><path d="M5.2 19.2a7.2 6.2 0 0 1 13.6 0"/></svg>';
// one picture per account, under its own name
function faceKey(name) { return `${FACE_KEY}:${String(name || '').toLowerCase()}`; }
function faceOf(name) {
    try { return window.localStorage.getItem(faceKey(name)) || ''; } catch (error) { return ''; }
}
function myFace() { return chatMe ? faceOf(chatMe.name) : ''; }

// a picture if it is yours and you have set one; the person mark otherwise — never a letter
function wearFace(slot, mine) {
    const face = mine ? myFace() : '';
    slot.style.backgroundImage = face ? `url("${face}")` : '';
    slot.innerHTML = face ? '' : PERSON_MARK;
}

function paintFaces() {
    const signed = Boolean(chatMe);
    wearFace(document.getElementById('chatMePic'), signed);
    if (signed) wearFace(document.getElementById('accFacePic'), true);
}
// a face: the middle square of the picture at 96px, dithered
async function ditherFace(file) {
    const img = await openPicture(file);
    const size = 96;
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return ditherCanvas(canvas);
}

const accFaceFile = document.getElementById('accFaceFile');
document.getElementById('setFacePick').addEventListener('click', () => accFaceFile.click());
accFaceFile.addEventListener('change', async () => {
    const file = accFaceFile.files && accFaceFile.files[0];
    accFaceFile.value = '';
    if (!file) return;
    try {
        window.localStorage.setItem(faceKey(chatMe.name), await ditherFace(file));
    } catch (error) {
        return;
    }
    paintFaces();
    paintTalk();
    if (!accountScreen.hidden) { paintAccountSettings(); setSay('picture changed'); }
});
document.getElementById('accFaceClear').addEventListener('click', () => {
    try { window.localStorage.removeItem(faceKey(chatMe.name)); } catch (error) {}
    paintFaces();
    paintTalk();
    paintAccountSettings();
});
// the picture is the way into account settings, the pencil on it says it can be edited
document.getElementById('accFace').addEventListener('click', () => {
    closeAccount();
    paintAccountSettings();
    openSetRow(null);
    setSay('');
    showScreen(accountScreen);
});

/* --- the settings window: one row open at a time --- */

const setNote = document.getElementById('setNote');
const setSay = (words) => { setNote.textContent = words || ''; };

function openSetRow(row) {
    accountScreen.querySelectorAll('.set-row').forEach((one) => {
        const open = one === row;
        one.classList.toggle('is-open', open);
        one.querySelector('.set-edit').hidden = !open;
        one.querySelectorAll('input').forEach((field) => { field.value = ''; });
    });
    const first = row && row.querySelector('input');
    if (first) first.focus();
}

accountScreen.querySelectorAll('.set-row').forEach((row) => {
    row.querySelector('.set-open').addEventListener('click', () => {
        setSay('');
        openSetRow(row.classList.contains('is-open') ? null : row);
    });
    const form = row.querySelector('form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const [one, two] = [...form.querySelectorAll('input')].map((field) => field.value);
        const go = form.querySelector('button');
        go.disabled = true;
        try {
            const said = await changeAccount(row.dataset.set, one, two);
            setSay(said);
        } catch (error) {
            setSay('that did not reach the board — try again');
        } finally {
            go.disabled = false;
        }
        paintAccountSettings();
        paintAccount();
    });
});

async function changeAccount(what, one, two) {
    if (!chatMe || !chatPriv) return 'sign in again first';
    if (!chatOn) return 'the chat board is not answering';
    const me = chatPeople[chatMe.name.toLowerCase()];

    if (what === 'nick') {
        const nick = one.trim().slice(0, 32);
        await postProfile({ nick });
        openSetRow(null);
        paintPeople(); paintTalk();
        return nick ? `you are ${nick} now` : 'nickname cleared';
    }
    if (what === 'name') {
        const to = one.trim().toLowerCase();
        if (!NAME_OK.test(to)) return 'usernames are letters, numbers, _ - and . only';
        if (to === chatMe.name.toLowerCase()) return 'that is already your username';
        await catchUp();
        if (chatPeople[to]) return `${to} is taken`;
        await postProfile({ to });
        // the new name is claimed the ordinary way too, so nobody can sign up over it
        const now = chatPeople[to];
        const side = sideOf(chatMe.name) || sideOf(to);
        if (side && !now.side) now.side = side;
        postToBoard(CHAT_TOPIC, { k: 'who', name: to, word: now.word, pub: now.pub, keep: now.keep, ...(side ? { side } : {}), at: Date.now() }).catch(() => {});
        openSetRow(null);
        paintPeople(); paintTalk();
        return `you are @${to} now`;
    }
    if (what === 'word') {
        if (await wordHash(one) !== me.word) return 'the current password is not right';
        if (!two) return 'type a new password';
        await postProfile({ word: await wordHash(two), keep: await wrapPriv(chatPriv, two) });
        chatMe = { ...chatMe, word: chatPeople[chatMe.name.toLowerCase()].word };
        window.localStorage.setItem(CHAT_ME, JSON.stringify(chatMe));
        openSetRow(null);
        return 'password changed';
    }
    return '';
}

function closeAccount() {
    accountPop.hidden = true;
    accList.querySelectorAll('.acc-menu').forEach((menu) => { menu.hidden = true; });
    chatMeButton.setAttribute('aria-expanded', 'false');
    shutLeave();
}

/* log out asks inside its own button: it splits into confirm and cancel */
const leaveSplit = document.getElementById('leaveSplit');
function shutLeave() {
    leaveSplit.hidden = true;
    chatSignOut.hidden = false;
}
document.getElementById('leaveNo').addEventListener('click', shutLeave);
document.getElementById('leaveYes').addEventListener('click', () => { closeAccount(); logOut(); });
/* --- every account logged in on this browser ---
   the one in use lives in the usual places (chatMe, chatPriv, chatFriends, chatDms); the others
   wait in chat-accounts with their own key, people and threads, and switching swaps them over */
const ACCOUNTS_KEY = `chat-accounts-${CHAT_ERA}`;
let addingFrom = null;              // the account to fall back to if adding one is abandoned

function heldAccounts() {
    try { return JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || '[]'); } catch (error) { return []; }
}
function keepAccounts(list) {
    try { window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); } catch (error) { /* no room */ }
}
// the account in use, written back into the list
function stashAccount() {
    if (!chatMe) return;
    const list = heldAccounts().filter((one) => one.name.toLowerCase() !== chatMe.name.toLowerCase());
    list.push({ name: chatMe.name, word: chatMe.word, priv: chatPriv, friends: chatFriends, dms: chatDms, with: chatWith });
    keepAccounts(list);
}
function clearSignedIn() {
    chatMe = null;
    chatPriv = null;
    chatFriends = [];
    chatDms = {};
    chatSealed = [];
    chatWith = null;
    window.localStorage.removeItem(CHAT_ME);
}
async function useAccount(name) {
    const held = heldAccounts().find((one) => one.name.toLowerCase() === name.toLowerCase());
    if (!held) return;
    stashAccount();
    chatMe = { name: held.name, word: held.word };
    chatPriv = held.priv || null;
    chatFriends = held.friends || [];
    chatDms = held.dms || {};
    chatSealed = [];
    chatWith = held.with || null;
    window.localStorage.setItem(CHAT_ME, JSON.stringify(chatMe));
    keepKnown();
    paintChatBar();
    paintPeople();
    if (chatOn) await catchUp();         // reads this account's sealed posts off the board
    openWith(whoWasOpen());
    paintAccount();
}
function forgetAccount(name) {
    keepAccounts(heldAccounts().filter((one) => one.name.toLowerCase() !== name.toLowerCase()));
    if (chatMe && chatMe.name.toLowerCase() === name.toLowerCase()) { logOut(); return; }
    paintAccount();
}

const accList = document.getElementById('accList');
function paintAccountList() {
    accList.innerHTML = '';
    const list = heldAccounts();
    if (chatMe && !list.some((one) => one.name.toLowerCase() === chatMe.name.toLowerCase())) list.unshift({ name: chatMe.name });
    list.forEach((one) => {
        const here = chatMe && one.name.toLowerCase() === chatMe.name.toLowerCase();
        const row = document.createElement('li');
        row.className = `acc-row${here ? ' is-here' : ''}`;
        const pick = document.createElement('button');
        pick.className = 'acc-pick';
        pick.type = 'button';
        const face = document.createElement('span');
        face.className = 'acc-face';
        const pic = faceOf(one.name);
        face.style.backgroundImage = pic ? `url("${pic}")` : '';
        face.innerHTML = pic ? '' : PERSON_MARK;
        const words = document.createElement('span');
        words.className = 'acc-words';
        const nick = document.createElement('b');
        nick.textContent = displayName(one.name);
        const handle = document.createElement('small');
        handle.textContent = `@${one.name}`;
        words.append(nick, handle);
        pick.append(face, words);
        pick.addEventListener('click', () => { if (!here) useAccount(one.name); });
        const dots = document.createElement('button');
        dots.className = 'acc-dots';
        dots.type = 'button';
        dots.setAttribute('aria-label', `more for @${one.name}`);
        dots.title = 'more';
        dots.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></svg>';
        const menu = document.createElement('div');
        menu.className = 'acc-menu';
        menu.hidden = true;
        const drop = document.createElement('button');
        drop.type = 'button';
        drop.textContent = 'remove';
        drop.addEventListener('click', () => forgetAccount(one.name));
        menu.append(drop);
        dots.addEventListener('click', () => {
            const open = menu.hidden;
            accList.querySelectorAll('.acc-menu').forEach((other) => { other.hidden = true; });
            menu.hidden = !open;
        });
        row.append(pick, dots, menu);
        accList.append(row);
    });
}

document.getElementById('accAdd').addEventListener('click', () => {
    stashAccount();
    addingFrom = chatMe ? chatMe.name : null;
    clearSignedIn();
    keepKnown();
    paintChatBar();
    paintPeople();
    paintTalk();
    paintChatShape();
    openChatDoor(false);
});

// the log-in window shut without logging anyone in: back to the account you were using
function addingAbandoned() {
    if (!addingFrom || chatMe) { addingFrom = null; return; }
    const back = addingFrom;
    addingFrom = null;
    useAccount(back);
}

chatMeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!chatMe) { openChatDoor(false); return; }   // signed out: straight to log in
    if (!accountPop.hidden) { closeAccount(); return; }
    paintAccount();
    accountPop.hidden = false;
    chatMeButton.setAttribute('aria-expanded', 'true');
    placeUnder(accountPop, chatMeButton);   // the top-right corner, where an account lives on every site
});
accountPop.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', closeAccount);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAccount(); });

function paintChatDoor() {
    if (doorBusy) return;      // it is saying what it is doing
    chatDoorTitle.textContent = chatDoorNew ? 'sign up' : 'log in';
    document.getElementById('loginTitle').textContent = chatDoorNew ? 'register' : 'login';
    document.getElementById('loginSay').textContent = chatDoorNew ? 'create a nice account' : 'sign in with username and password';
    chatGo.textContent = chatDoorNew ? 'sign up' : 'sign in';
    chatSwap.textContent = chatDoorNew ? 'already have an account?' : 'dont have an account?';
    document.querySelector('.chat-door').classList.toggle('is-new', chatDoorNew);
}
document.querySelectorAll('#chatSide .side-pick').forEach((pick) => {
    pick.addEventListener('click', () => {
        pickedSide = pick.dataset.side;
        document.querySelectorAll('#chatSide .side-pick').forEach((one) => {
            const on = one === pick;
            one.classList.toggle('is-on', on);
            one.setAttribute('aria-checked', String(on));
        });
    });
});

function openChatDoor(signingUp) {
    closeAccount();
    chatDoorNew = signingUp === true;
    saySomethingChat('');
    paintChatDoor();
    // signed out the form is already on the page; adding a second account still uses the window
    if (!chatMe && !addingFrom) {
        placeDoor(true);
        if (activeSectionId !== 'chat') switchSection('chat');
        chatHandle.focus();
        return;
    }
    placeDoor(false);
    showScreen(chatScreen);
}

chatSwap.addEventListener('click', () => {
    chatDoorNew = !chatDoorNew;
    saySomethingChat('');
    paintChatDoor();
});

let doorBusy = false;
function doorWorking(busy) {
    doorBusy = busy;
    chatGo.disabled = doorBusy;
    chatSwap.disabled = doorBusy;
    // the button keeps its own word the whole time — no 'unlocking your key…' flashing past;
    // it is only locked, so a second press can't start a second account
    chatGo.textContent = chatDoorNew ? 'sign up' : 'log in';
}

chatGo.addEventListener('click', async () => {
    if (doorBusy) return;
    let called = chatHandle.value.trim().slice(0, 20);
    const word = chatWord.value;
    const nick = chatDoorNew ? document.getElementById('chatNick').value.trim().slice(0, 32) : '';
    // everything missing or wrong shakes at once, not just the first of them
    const wrong = [];
    if (!called) wrong.push(chatHandle);
    if (!word) wrong.push(chatWord);
    if (chatDoorNew) {
        const again = document.getElementById('chatWord2');
        if (!again.value || again.value !== word) wrong.push(again);
        if (!SIDES.includes(pickedSide)) wrong.push(document.getElementById('chatSide'));
    }
    if (wrong.length) { wrong.forEach((field, at) => shakeAlong(field, at === 0)); return; }

    saySomethingChat('');
    doorWorking(true);
    try {
        if (!chatOn) await wakeChat();
        // a press while the chat is still starting waits for it rather than calling it dead
        for (let tries = 0; chatStarting && tries < 150; tries += 1) await new Promise((done) => window.setTimeout(done, 100));
        if (!chatOn) { shake(chatGo); return; }

        await catchUp();

        const hash = await wordHash(word);
        if (!chatDoorNew) called = chatPeople[whoIs(called)] ? chatPeople[whoIs(called)].name : called;
        const known = chatPeople[called.toLowerCase()];

        if (chatDoorNew) {
            if (!NAME_OK.test(called.toLowerCase())) {
                shake(chatHandle);
                return;
            }
            called = called.toLowerCase();
            if (known) {
                shake(chatHandle);
                flagTaken();
                return;
            }
            const pair = await makeKeyPair();
            chatPriv = pair.priv;
            const post = {
                k: 'who',
                name: called,
                word: hash,
                pub: pair.pub,
                keep: await wrapPriv(pair.priv, word),
                side: pickedSide,
                at: Date.now()
            };
            takePost(post);
            await postToBoard(CHAT_TOPIC, post).catch(() => {});
        } else {
            if (!known) { shake(chatHandle); return; }
            if (known.word !== hash) { shake(chatWord); return; }
            // this account's own key, never whichever one this browser held last — a key left over
            // from another account sealed every line to the wrong person and opened none
            const heldHere = heldAccounts().find((one) => one.name.toLowerCase() === known.name.toLowerCase());
            chatPriv = (heldHere && heldHere.priv) || null;
            if (!chatPriv && known.keep) {
                try {
                    chatPriv = await unwrapPriv(known.keep, word);
                } catch (error) {
                    saySomethingChat('logged in, but your old messages cannot be opened here');
                }
            }
        }

        chatMe = { name: known ? known.name : called, word: hash };
        window.localStorage.setItem(CHAT_ME, JSON.stringify(chatMe));
        const held = heldAccounts().find((one) => one.name.toLowerCase() === chatMe.name.toLowerCase());
        if (held) { chatFriends = held.friends || []; chatDms = held.dms || {}; chatWith = held.with || null; if (!chatPriv) chatPriv = held.priv || null; }
        addingFrom = null;
        stashAccount();
        keepKnown();
        // a nickname given at sign-up is posted the way any later change is, signed
        if (chatDoorNew && nick && chatPriv) await postProfile({ nick }).catch(() => {});
        chatWord.value = '';
        document.getElementById('chatWord2').value = '';
        document.getElementById('chatNick').value = '';
        saySomethingChat('');
        paintChatBar();
        paintPeople();
        // the board was read before anyone was logged in, and lines nobody owned were passed over —
        // read it again as this account, so a new browser has your threads straight away
        await catchUp();   // which also opens whatever was waiting for this account
        paintPeople();
        openWith(whoWasOpen());
        closeModal();
    } finally {
        // whatever happened, the button goes back to being a button
        doorWorking(false);
    }
});

chatSignOut.addEventListener('click', () => {
    chatSignOut.hidden = true;
    leaveSplit.hidden = false;
});

function logOut() {
    closeAccount();
    if (chatMe) keepAccounts(heldAccounts().filter((one) => one.name.toLowerCase() !== chatMe.name.toLowerCase()));
    clearSignedIn();      // the key goes with the account, not the browser
    keepKnown();
    const next = heldAccounts()[0];
    if (next) { useAccount(next.name); return; }
    paintChatBar();
    paintPeople();
    paintTalk();
    paintChatShape();
}

chatSplitter = wireSplit({
    split: document.getElementById('chatSplit'),
    body: document.getElementById('chatBody'),
    other: document.getElementById('talkSide'),
    pane: document.getElementById('roomSide'),
    key: 'room-column',
    keepOther: 50,
    // the list never closes: its field and the plus need this much, and the gap stays a full step
    least: 250,
    skinAt: 36,
    fallback: 26
});

if (chatSplitter) {
    chatSplitter.load();
    if (window.localStorage.getItem('room-column') === null) chatSplitter.set(26);
}

chatReady = true;
paintChatBar();
paintChatDoor();
if (activeSectionId === 'chat') wakeChat();
