/* ============================================================
   recall — script.js
   ------------------------------------------------------------
   1. elements
   2. state
   3. storage
   4. sections   (the home / cards / audio / player tabs)
   5. decks      (the list, and the split beside it)
   6. cards      (the create window)
   7. practice   (the practice window)
   8. context menu
   9. keyboard
   10. wiring    (includes deck codes — copy one out, paste one in)
   11. start     (its body runs at the very bottom of the file)
   12. capture, sensing, recording   (the audio section)
         status · sensing box · change detection
         clip storage · mp3 export · clip rows
         recording · level meter · capture
   13. player    (songs off your own disk, and the bar's short copy)
   14. the bar's own three   (clock · storage · recently binned)
   15. home widgets   (the home page, yours to arrange)
   16. notes → cards  (the left bar; reads notes, or asks claude)
   ============================================================ */

/* ---------- 1. elements ---------- */

// screens
const homeScreen = document.getElementById('homeScreen');
const modalVeil = document.getElementById('modalVeil');
const makerScreen = document.getElementById('makerScreen');
const studyScreen = document.getElementById('studyScreen');
const notesScreen = document.getElementById('notesScreen');

// sections
const sectionTabs = document.getElementById('sectionTabs');
const audioPanel = document.getElementById('audioPanel');

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
const storeAmount = document.getElementById('storeAmount');
const storeFill = document.getElementById('storeFill');
const railBinned = document.getElementById('railBinned');
const binnedList = document.getElementById('binnedList');
const binnedCount = document.getElementById('binnedCount');
const binnedEmpty = document.getElementById('binnedEmpty');
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

const sections = [
    { id: 'home', name: 'home' },
    { id: 'cards', name: 'cards' },
    { id: 'audio', name: 'audio' },
    { id: 'player', name: 'player' }
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
let waitingForContinue = false;
let editingCardIndex = null;
/* the answers this card is allowed to be mixed up with, while it's
   being written. empty means "anything in the deck". */
let pendingOptions = new Set();
let editingDeckId = null;
/* everything binned in the last week, oldest first. ctrl+z walks back
   down it, and the bar lists the newest few. it is a real bin, held in
   its own database: a clip or a song keeps its audio in here, which is
   the only way one can come back after a refresh. nothing leaves until
   it is a week old, put back, or the bin is emptied by hand. */
let deletedStack = [];
const BIN_DB = 'recall-bin';
const BIN_STORE = 'binned';
const BIN_KEEP_MS = 7 * 24 * 60 * 60 * 1000;
let binDbPromise = null;

let audioContext = null;
let analyser = null;
let levelFrame = null;
let levelData = null;
const MIN_CLIP_MS = 2000;   // clips shorter than this are thrown away
let clipCount = 0;
let changeArmed = false;    // a change was seen, waiting for it to settle
let lastCutAt = 0;
let recorderReady = false;

function activeDeck() {
    return decks.find((deck) => deck.id === activeDeckId) || decks[0];
}

/* ---------- 3. storage ---------- */

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

function loadSection() {
    const saved = window.localStorage.getItem('active-section');
    if (sections.some((section) => section.id === saved)) activeSectionId = saved;
}

/* nothing on this site wants the browser guessing at what you meant —
   no autocomplete list, no autocorrect, no capitalising the first
   letter of a lowercase site, no red squiggles under a kaomoji. */
function stopGuessing(field) {
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.setAttribute('autocorrect', 'off');
    field.setAttribute('autocapitalize', 'off');
    return field;
}

/* ---------- 4. sections ---------- */

// the swap happens on the click — waiting for the old panels to leave
// first just read as lag. the new ones come in from the side you're
// heading instead, staggered, so it's smooth without costing anything.
function switchSection(id) {
    if (isModalOpen()) showScreen(homeScreen);   // tabs work from anywhere
    if (id === activeSectionId) return;

    const tabs = [...sectionTabs.querySelectorAll('.section-tab')];
    const before = tabs.map((tab) => tab.getBoundingClientRect());

    activeSectionId = id;
    window.localStorage.setItem('active-section', activeSectionId);
    renderSections();

    if (!tabs[0] || typeof tabs[0].animate !== 'function') return;
    const after = tabs.map((tab) => tab.getBoundingClientRect());
    tabs.forEach((tab, index) => {
        const from = before[index];
        const to = after[index];
        if (!from.height || !to.height) return;
        // only the size, and only in place: each tab holds its quarter
        // of the strip, so the word grows and shrinks where it stands
        const scale = from.height / to.height;
        if (Math.abs(scale - 1) < 0.01) return;
        tab.animate(
            [{ transform: `scale(${scale})` }, { transform: 'none' }],
            { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
    });
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
    playerPanel.hidden = activeSectionId !== 'player';
    if (activeSectionId !== 'audio' && recorderReady) stopCapture();

    // one tab per section; whichever is active grows, the rest shrink.
    // tabs are only built once so the size change can animate.
    if (!sectionTabs.children.length) {
        sections.forEach((section) => {
            const tab = document.createElement('button');
            tab.className = 'section-tab';
            tab.type = 'button';
            tab.dataset.section = section.id;
            tab.textContent = section.name;
            tab.addEventListener('click', () => switchSection(section.id));
            sectionTabs.appendChild(tab);
        });
    }
    sectionTabs.querySelectorAll('.section-tab').forEach((tab) => {
        const active = tab.dataset.section === activeSectionId;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-current', active ? 'page' : 'false');
    });
}

/* ---------- 5. decks ---------- */

// the code on show always belongs to the deck on show
function refreshShareForActiveDeck() {
    if (!sharePanel.hidden) refreshShareCode();
}

// a deck's "look" is one of eight outline shapes. it starts off derived
// from the deck's id so two decks rarely match, and right-click cycles it.
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

// the deck entries under the deck bar — same face as the smiley wears,
// plus the name, the card count and how long the deck is
let deckCardsShape = '';
let deckArrivalTimer = 0;

function deckCardsShapeNow() {
    return decks.map((deck) => `${deck.id}:${deck.name}:${lookFor(deck)}:${deck.cards.length}:${deck.cards[0] ? deck.cards[0].question : ''}`).join('|');
}

function renderDeckCards() {
    // rebuilding replays every entry's arrival animation, so when only
    // the selection moved, just move the highlight
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

// the picked deck, spelled out card by card. editing happens in
// place — the row's own two fields — so nothing leaves the page.
let editingStageIndex = null;
let editingStageField = 'question';   // which line of it took the caret

/* --- a draggable divider between two panes --- */

/* both the cards page and the player page are a pair of columns with a
   grip between them. the width is kept as a percentage rather than
   pixels, so the two keep their proportions when the window changes.
   whatever the grip is told to size, the other side's own min-width is
   the floor it can never push past — without that, dragging kept going
   and shoved the far column out under the side bar. */
function wireSplit({ split, body, other, variable, key, min = 15, max = 75, fallback = 50, onDrag }) {
    if (!split || !body || !other) return null;

    const ceiling = () => {
        const box = body.getBoundingClientRect();
        if (!box.width) return max;
        const grip = split.getBoundingClientRect().width;
        const floor = parseFloat(window.getComputedStyle(other).minWidth) || 0;
        return Math.max(min, Math.min(max, (box.width - grip - floor) / box.width * 100));
    };

    const set = (percent) => {
        const width = Math.min(ceiling(), Math.max(min, percent));
        body.style.setProperty(variable, `${width}%`);
        return width;
    };

    const now = () => parseFloat(body.style.getPropertyValue(variable)) || fallback;
    const remember = (width) => {
        try {
            window.localStorage.setItem(key, width);
        } catch (error) {
            // out of room; the split just won't survive a refresh
        }
    };

    split.addEventListener('pointerdown', (event) => {
        if (event.button) return;
        event.preventDefault();
        split.classList.add('is-dragging');
        document.documentElement.classList.add('splitting');

        const drag = (move) => {
            if (move.pointerId !== event.pointerId) return;
            const box = body.getBoundingClientRect();
            if (!box.width) return;
            // the left pane is the one being sized, so its width is
            // however far the cursor has come from that edge
            set((move.clientX - box.left) / box.width * 100);
            if (onDrag) onDrag();
        };
        const drop = () => {
            window.removeEventListener('pointermove', drag);
            window.removeEventListener('pointerup', drop);
            window.removeEventListener('pointercancel', drop);
            split.classList.remove('is-dragging');
            document.documentElement.classList.remove('splitting');
            remember(now());
        };
        window.addEventListener('pointermove', drag);
        window.addEventListener('pointerup', drop);
        window.addEventListener('pointercancel', drop);
    });

    // the arrow keys nudge it too, once it has focus
    split.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        remember(set(now() + (event.key === 'ArrowLeft' ? -2 : 2)));
    });

    return {
        set,
        // a narrower window can put a stored width past the new ceiling
        reclamp: () => set(now()),
        load: () => {
            const saved = Number(window.localStorage.getItem(key));
            if (saved) set(saved);
        }
    };
}

const deckSplit = wireSplit({
    split: paneSplit,
    body: homeBody,
    other: cardSide,
    variable: '--deck-col',
    key: 'deck-column',
    fallback: 55,
    onDrag: () => { if (!sharePanel.hidden) placeSharePanel(); }
});

function loadDeckColumn() {
    if (deckSplit) deckSplit.load();
}

window.addEventListener('resize', () => {
    if (deckSplit) deckSplit.reclamp();
    if (typeof playerSplitter !== 'undefined' && playerSplitter) playerSplitter.reclamp();
    if (!sharePanel.hidden) placeSharePanel();
});

/* --- dragging a deck up or down the list --- */

/* the whole entry is the grip — there's no handle to aim at — so a
   press only becomes a drag once it's travelled a few pixels. under
   that it's still a click, and the deck just gets picked. */
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
        // the lift wants a press, and this is a move — it only reads
        // the button, the pointer and where the cursor is right now
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

// the entries are the order now, so the decks array is read back off
// them. the shape is rewritten too, or the next render would see a
// different order and rebuild the list you just sorted by hand.
function settleDeckOrder() {
    const order = [...deckListSlot.querySelectorAll('.deck-card')]
        .map((entry) => decks.find((deck) => deck.id === entry.dataset.deckId))
        .filter(Boolean);
    if (order.length !== decks.length) return;
    decks = order;
    deckCardsShape = deckCardsShapeNow();
    renderDecks();
    saveDecks();

    // the click that ends the drag fires after this, so the guard has
    // to outlive it by a beat
    window.setTimeout(() => { deckWasDragged = false; }, 0);
}

function renderStage() {
    const deck = activeDeck();
    const total = deck.cards.length;

    armedDeleteRow = null;   // the rows it pointed at are about to go
    deckCardList.innerHTML = '';
    if (total === 0) {
        // a line of context over the face, so an empty deck says what
        // to do about it rather than just sitting there
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

        // three lines to drag it by, on every row
        const handle = document.createElement('button');
        handle.className = 'card-handle';
        handle.type = 'button';
        handle.setAttribute('aria-label', `reorder ${card.question}, use arrow keys`);
        handle.innerHTML = '<span></span><span></span><span></span>';
        handle.addEventListener('pointerdown', (event) => startLift(cardLiftConfig(), item, event));
        handle.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            moveRow(cardLiftConfig(), item, event.key === 'ArrowUp' ? -1 : 1);
            handle.focus();
        });
        item.append(handle);

        {
            const text = stageWords(item, card);

            /* the bin asks on the spot rather than raising a popup: the
               × turns itself into a tick, and a cancel × appears beside
               it. the two marks live inside the button so the spin can
               carry one out and the other in. */
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
            /* the same press-not-click reason as the words above: with a
               field open, a click on here landed after the blur had
               already put the row back, so the first press did nothing
               visible. the click is kept for the keyboard, and guarded
               so a mouse press doesn't run it twice. */
            let pressed = 0;
            const act = () => {
                if (armedDeleteRow === item) {
                    deleteStageCard(rowIndex(item));
                    return;
                }
                armStageDelete(item);
            };
            remove.addEventListener('pointerdown', (event) => {
                if (event.button) return;
                event.stopPropagation();
                // the press is taken here rather than let through, so the
                // field keeps its caret until we say otherwise — and then
                // the open row is put away by hand, in one press
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
        }

        deckCardList.appendChild(item);
    });
}

/* a card's two lines, and what pressing one of them does */
function stageWords(item, card) {
    const text = document.createElement('span');
    text.className = 'stage-card-text';
    // each line is tagged the way the create window tags its fields, so
    // which of the two you're reading is never a guess — and each line
    // is its own target
    text.append(
        stageLine('Q', 'strong', card.question),
        stageLine('A', 'small', card.answer)
    );
    text.title = 'click a line to edit it';
    /* on the press, not the click: a click lands after the field you
       were in has taken its blur and put the row back, so the press
       would be spent closing the last one instead of opening this one.
       a drag renumbers the rows, so the row itself is asked for its
       index. */
    text.addEventListener('pointerdown', (event) => {
        if (event.button) return;
        const line = event.target.closest('.stage-line');
        beginStageEdit(rowIndex(item), line && line.dataset.field === 'answer' ? 'answer' : 'question');
    });
    return text;
}

/* one line of a card: its tag, then the words. the tag is the same
   mark the create window puts beside its fields. */
function stageLine(tag, kind, words) {
    const line = document.createElement('span');
    line.className = 'stage-line';
    line.dataset.field = tag === 'Q' ? 'question' : 'answer';
    const mark = document.createElement('b');
    mark.className = 'line-tag';
    mark.textContent = tag;
    mark.setAttribute('aria-hidden', 'true');
    const said = document.createElement(kind);
    said.textContent = words;
    line.append(mark, said);
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
    const questionLine = document.createElement('span');
    questionLine.className = 'stage-line';
    const answerLine = document.createElement('span');
    answerLine.className = 'stage-line';
    ['Q', 'A'].forEach((tag, index2) => {
        const mark = document.createElement('b');
        mark.className = 'line-tag';
        mark.textContent = tag;
        mark.setAttribute('aria-hidden', 'true');
        (index2 ? answerLine : questionLine).append(mark);
    });
    questionLine.append(question);
    answerLine.append(answer);

    // enter commits, escape backs out, and clicking away commits too —
    // but only once the focus has actually left both fields
    const commit = () => {
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
        /* the row is put back by hand rather than by rebuilding the
           list: a rebuild drops the × and paints a new one, so it
           blinked out and in. swapping the editor for the words leaves
           the button where it is, and its own transition carries it. */
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
            window.setTimeout(() => {
                if (editingStageIndex !== index) return;
                if (wrap.contains(document.activeElement)) return;
                commit();
            }, 0);
        });
    });

    wrap.append(questionLine, answerLine);
    // the line you pressed takes the caret — pressing the answer used
    // to open the question, because the row only knew it was pressed
    const taking = field === 'answer' ? answer : question;
    window.setTimeout(() => {
        taking.focus();
        // caret at the end, not the whole line selected — clicking a
        // card is to fix a word, not usually to replace the lot
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

/* the rows are the order now, so the deck's cards are read back off
   them. renderStage() isn't called — the list is already right, and
   rebuilding it would throw away the row that just settled. */
function settleCardOrder() {
    const deck = activeDeck();
    const rows = [...deckCardList.querySelectorAll('.stage-card')];
    const order = rows.map((row) => deck.cards[rowIndex(row)]).filter(Boolean);
    if (order.length !== deck.cards.length) return;
    deck.cards = order;
    rows.forEach((row, index) => { row.dataset.cardIndex = index; });
    // the entry on the right shows the deck's first question, and that
    // may well be a different card now
    renderDeckCards();
    renderCards();
    saveDecks();
}

function beginStageEdit(index, field) {
    if (editingStageIndex === index) return;
    const deck = activeDeck();
    const card = deck.cards[index];
    if (!card) return;

    // close whatever else was open the slow way, then take this row apart
    // by hand so its marks stay put long enough to bow out
    if (editingStageIndex !== null) {
        editingStageIndex = null;
        renderStage();
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
    item.classList.add('editing');
    text.replaceWith(buildStageEditor(deck, card, index, field));
}

/* the row waiting on a yes, if any. only ever one — arming another
   puts the first one back. */
let armedDeleteRow = null;

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
    const deck = activeDeck();
    const card = deck.cards[index];
    if (!card) return;
    disarmStageDelete();

    rememberDeleted({ type: 'card', item: card, index, deckId: deck.id });
    deck.cards.splice(index, 1);
    editingStageIndex = null;
    renderDecks();
    renderCards();
    saveDecks();
}

function renderDecks() {
    renderDeckCards();
    renderStage();
    refreshShareForActiveDeck();
}

/* renaming happens on the entry itself: the button is swapped for a
   plain row holding the same face and a field, and put back when you
   are done. a <button> can't hold an input, which is why the whole
   element is replaced rather than just its name. */
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
        // an unchanged name leaves the shape identical, and renderDeckCards
        // skips a rebuild when the shape matches — which would leave this
        // row in place. clearing it forces the entry back.
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

/* home is always there underneath; create and practice are windows
   laid over it, so "showing" one is really just raising the veil. */
function isModalOpen() {
    // one on its way out doesn't count as open — pressing the tile
    // again mid-exit should bring it back, not toggle it shut twice
    return !modalVeil.hidden && !modalVeil.classList.contains('is-leaving');
}

const MODAL_EXIT_MS = 320;   // matches panel-drop, the arrival reversed
let modalExitTimer = 0;

function closeModal() {
    if (modalVeil.hidden || modalVeil.classList.contains('is-leaving')) return;
    modalVeil.classList.add('is-leaving');
    window.clearTimeout(modalExitTimer);
    modalExitTimer = window.setTimeout(() => {
        modalVeil.hidden = true;
        modalVeil.classList.remove('is-leaving');
        makerScreen.hidden = true;
        studyScreen.hidden = true;
        notesScreen.hidden = true;
        returnNotesPanel();
    }, MODAL_EXIT_MS);
}

function showScreen(screen) {
    if (screen === homeScreen) {
        waitingForContinue = false;
        closeModal();
        return;
    }

    // catch one that was mid-exit, so a quick tap out and back in picks
    // straight up rather than waiting for the old one to finish leaving
    window.clearTimeout(modalExitTimer);
    modalVeil.classList.remove('is-leaving');
    modalVeil.hidden = false;
    makerScreen.hidden = screen !== makerScreen;
    studyScreen.hidden = screen !== studyScreen;
    notesScreen.hidden = screen !== notesScreen;
    // the notes panel is borrowed from the left bar; anything else
    // opening means it is wanted back
    if (screen !== notesScreen) returnNotesPanel();

    // the tile you pressed still holds the focus, so a space would
    // press it a second time and shut the window again. the window
    // takes the focus off it.
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

/* every other answer in the deck, each a switch. the card being edited
   can't be mixed up with itself, so it isn't offered. */
function renderOptionPicker() {
    const deck = decks.find((item) => item.id === editingDeckId) || activeDeck();
    const own = editingCardIndex === null ? null : deck.cards[editingCardIndex];
    const answers = [...new Set(deck.cards.map((card) => card.answer))]
        .filter((answer) => answer && answer !== (own ? own.answer : answerInput.value.trim()));

    // only the pills are rebuilt — the line above them is written in
    // index.html so it can be reworded without coming in here
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

/* the + is the whole control now, so it carries the state itself: it
   fills in once anything is picked, and says how many on hover */
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

function closeOptionPops() {
    closeOptionPicker();
}

function resetCardForm() {
    editingCardIndex = null;
    editingDeckId = null;
    cardForm.reset();
    cardFormNote.textContent = '';
    cardSubmitButton.querySelector('span').textContent = 'add';
    pendingOptions = new Set();
    closeOptionPops();
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

function startStudy() {
    recentQuestions = [];
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

    currentCard = shuffle(availableCards)[0];
    recentQuestions.push(currentCard);
    if (recentQuestions.length > cooldownSize) recentQuestions.shift();

    studyQuestion.textContent = currentCard.question;
    studyFeedback.textContent = '';
    answerOptions.classList.remove('is-answered');
    answerOptions.innerHTML = '';

    // three wrong answers borrowed from other cards in the deck — or,
    // if this card names the ones it wants to be confused with, from
    // that list instead. a pick can be any size; three are drawn from
    // it each time. answers that have since been edited away are
    // dropped, and the rest of the deck tops the three up.
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
    /* a deck with four answers or fewer offers the same four every
       time, so shuffling them only moves them about under you with
       nothing being hidden. they sort instead, backwards down the
       alphabet, and the order holds until you write another answer.
       past four there is something to hide, so they're drawn. */
    const all = [currentCard.answer, ...wrongAnswers];
    const options = deckAnswers.length + 1 > 4
        ? shuffle(all)
        : all.sort((one, two) => two.localeCompare(one));

    /* a small deck can't always find three wrong answers, so the grid
       takes the shape of however many it has: four fill the quarters,
       three leave the last to run the whole bottom, two sit side by
       side, and one takes the lot. */
    answerOptions.dataset.count = String(options.length);
    const wideIndex = options.length === 3 ? 2 : -1;

    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = `answer-button${index === wideIndex ? ' is-wide' : ''}`;
        button.type = 'button';
        button.dataset.answer = option;
        // the word is its own element so it can slide down and leave
        // room for the mark above it
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

/* the answer speaks for itself: the right one fills in black either
   way, so there is nothing left for a line of text to add. right is a
   stamp and a ring off the tile you pressed; wrong is a knock — the
   tile flashes over and settles back a size, with the black one beside
   it saying what it should have been. */
/* the mark that goes over a word: a tick when you were right, a cross
   when you weren't. only ever on the tile you pressed — the right
   answer is shown by being filled in, and a tick on a tile you didn't
   press only muddles which of the two things just happened. */
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
    document.querySelectorAll('.answer-button').forEach((button) => {
        if (button.dataset.answer === currentCard.answer) button.classList.add('correct');
    });
    answerOptions.classList.add('is-answered');
    studyFeedback.textContent = '';

    if (selectedAnswer === currentCard.answer) {
        selectedButton.classList.add('is-right');
        markAnswer(selectedButton, true);
        document.querySelectorAll('.answer-button').forEach((button) => {
            button.disabled = true;
        });
        // long enough for the stamp to land and the ring to go out
        setTimeout(showNextQuestion, 620);
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

    if (target.type === 'page') {
        // the browser's own moves, in the site's own menu. whether back
        // or forward lead anywhere isn't knowable from in here, so they
        // are always offered and simply do nothing at the ends.
        [
            ['back', () => window.history.back()],
            ['forward', () => window.history.forward()],
            ['reload', () => window.location.reload()]
        ].forEach(([label, run]) => {
            const action = document.createElement('button');
            action.className = 'context-action';
            action.type = 'button';
            action.textContent = label;
            action.addEventListener('click', () => {
                hideContextMenu();
                run();
            });
            contextMenu.append(action);
        });
    }

    if (target.type === 'deck') {
        const renameButton = document.createElement('button');
        renameButton.className = 'context-action';
        renameButton.type = 'button';
        renameButton.textContent = 'rename';
        renameButton.addEventListener('click', () => {
            hideContextMenu();
            beginDeckRename(target.deck);
        });

        const deleteDeckButton = document.createElement('button');
        deleteDeckButton.className = 'context-action';
        deleteDeckButton.type = 'button';
        deleteDeckButton.textContent = 'delete';
        deleteDeckButton.disabled = decks.length === 1;
        deleteDeckButton.addEventListener('click', () => {
            if (decks.length === 1) return;
            const deletedIndex = decks.findIndex((deck) => deck.id === target.deck.id);
            rememberDeleted({ type: 'deck', item: target.deck, index: deletedIndex });
            decks.splice(deletedIndex, 1);
            if (target.deck.id === activeDeckId) activeDeckId = decks[Math.max(0, deletedIndex - 1)].id;
            renderDecks();
            renderCards();
            saveDecks();
            hideContextMenu();
        });

        const lookButton = document.createElement('button');
        lookButton.className = 'context-action';
        lookButton.type = 'button';
        lookButton.textContent = 'new icon';
        lookButton.addEventListener('click', () => {
            target.deck.look = (lookFor(target.deck) + 1) % LOOK_COUNT;
            renderDecks();
            saveDecks();
            hideContextMenu();
        });

        contextMenu.append(renameButton, lookButton, deleteDeckButton);
    }

    if (target.type === 'card') {
        const editButton = document.createElement('button');
        editButton.className = 'context-action';
        editButton.type = 'button';
        editButton.textContent = 'edit';
        editButton.addEventListener('click', () => {
            editCard(target.index);
            hideContextMenu();
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'context-action';
        deleteButton.type = 'button';
        deleteButton.textContent = 'delete';
        deleteButton.addEventListener('click', () => {
            rememberDeleted({
                type: 'card',
                item: target.deck.cards[target.index],
                index: target.index,
                deckId: target.deck.id
            });
            target.deck.cards.splice(target.index, 1);
            renderCards();
            renderDecks();
            saveDecks();
            hideContextMenu();
        });

        contextMenu.append(editButton, deleteButton);
    }

    if (target.type === 'widget') {
        const removeButton = document.createElement('button');
        removeButton.className = 'context-action';
        removeButton.type = 'button';
        removeButton.textContent = 'remove';
        removeButton.addEventListener('click', () => {
            removeWidget(target.id);
            hideContextMenu();
        });
        contextMenu.append(removeButton);
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

/* the keys are quarters of the keyboard, so they have to point at
   whatever is actually in that quarter of the screen — which is not
   the dom order once the grid changes shape. */
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

/* everything that goes without asking first comes back the same way:
   put the record back where it was, in the page and in storage. */
function openBinDb() {
    if (binDbPromise) return binDbPromise;
    binDbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(BIN_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(BIN_STORE)) {
                db.createObjectStore(BIN_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return binDbPromise;
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

/* one entry goes in the bin and the bar redraws. everything that bins
   something without asking first comes through here. */
function rememberDeleted(entry) {
    entry.id = `bin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    entry.when = Date.now();
    deletedStack.push(entry);
    keepBinned(entry);
    renderBinned();
    paintStorage();
}

/* on the way in, anything already a week old is thrown out for real */
async function loadBinned() {
    let kept = [];
    try {
        const db = await openBinDb();
        kept = await new Promise((resolve, reject) => {
            const request = db.transaction(BIN_STORE, 'readonly').objectStore(BIN_STORE).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
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
    const sure = await askConfirm(`empty the bin? ${deletedStack.length} thing${deletedStack.length === 1 ? '' : 's'}, no undo`, binnedEmpty);
    if (!sure) return;
    try {
        const db = await openBinDb();
        db.transaction(BIN_STORE, 'readwrite').objectStore(BIN_STORE).clear();
    } catch (error) {
        // the list still clears; the store will age out on its own
    }
    deletedStack = [];
    renderBinned();
    paintStorage();
}

function undoLastDelete() {
    const undone = deletedStack.pop();
    if (!undone) return;
    restoreDeleted(undone);
    renderBinned();
    paintStorage();
}

/* a short name for a thing, for the list in the bar */
function binnedLabel(entry) {
    if (entry.type === 'deck') return `deck · ${entry.item.name}`;
    if (entry.type === 'card') return `card · ${entry.item.question}`;
    if (entry.type === 'clip') return `clip · ${entry.item.name || entry.item.number}`;
    return `song · ${entry.item.name}`;
}

/* newest first, and pressing one puts back that one rather than
   walking the whole stack back to it */
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

function renderBinned() {
    railBinned.hidden = deletedStack.length === 0;
    binnedCount.textContent = deletedStack.length > 5 ? `${deletedStack.length}` : '';
    binnedList.innerHTML = '';
    [...deletedStack].reverse().slice(0, 5).forEach((entry) => {
        const row = document.createElement('li');
        const button = document.createElement('button');
        button.className = 'binned-item';
        button.type = 'button';
        button.textContent = binnedLabel(entry);
        button.title = 'put this back';
        button.addEventListener('click', () => {
            const at = deletedStack.indexOf(entry);
            if (at === -1) return;
            deletedStack.splice(at, 1);
            restoreDeleted(entry);
            renderBinned();
        });
        button.title = `binned ${sinceWhen(entry.when)} — press to put it back`;
        row.append(button);
        binnedList.append(row);
    });
}

function restoreDeleted(undone) {
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

    if (undone.type === 'track') {
        tracks.splice(Math.min(undone.index, tracks.length), 0, undone.item);
        saveTrack(undone.item).catch(() => {});
        renderTrackRows();
        rememberTrackOrder();
        return;
    }

    if (undone.type === 'deck') {
        decks.splice(Math.min(undone.index, decks.length), 0, undone.item);
        activeDeckId = undone.item.id;
    } else {
        const deck = decks.find((item) => item.id === undone.deckId);
        if (deck) {
            deck.cards.splice(undone.index, 0, undone.item);
            activeDeckId = deck.id;
        }
    }
    renderDecks();
    renderCards();
    saveDecks();
}

/* ---------- 10. wiring ---------- */

// the press. every button gets the squash-and-spring except the icon
// squares, the deck entries and the tiles, which have their own.
/* .field-add turns from a plus into a cross on a transform of its own,
   and the press animation is a transform too — it won the cascade, so
   the turn only happened once the squash had finished playing */
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

// --- deck codes ---
// a deck travels as one string: a tag, then base64url of the json,
// deflated when the browser can do it (chrome can).

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
    shareOut.value = await deckToCode(deck);
    shareOut.setAttribute('aria-label', `code for ${deck.name}`);
}

function closeSharePanel() {
    sharePanel.hidden = true;
    shareToggle.setAttribute('aria-expanded', 'false');
}

/* under the button, right edges lined up, but never off the window.
   the panel is wider than the deck column ever gets, so on a narrow
   column it simply slides right rather than being cut in half. */
function placeSharePanel() {
    // held inside the content column, not merely inside the window —
    // the side bars are solid, and a panel lying over one reads as a
    // mistake even though nothing is actually clipping it
    // the column's own gutter, so the panel stops where the page's
    // boxes stop rather than running up against the scalloped bar
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
        // clipboard is blocked on file:// and without focus — the text
        // is selected either way, so ctrl+c still works
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

// navigation. there's no back arrow — the tile that took you to a
// screen is the way off it too, so pressing it again lands you home.
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
        waitingForContinue = false;
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
    placeUnder(optionsPanel, optionsToggle);
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
    // only carried when there is one; a card without it behaves as it
    // always has, drawing from the whole deck
    const chosen = [...pendingOptions].filter((option) => option !== answer);
    if (chosen.length) card.options = chosen;
    if (editingCardIndex === null) {
        activeDeck().cards.push(card);
    } else {
        const deck = decks.find((item) => item.id === editingDeckId) || activeDeck();
        deck.cards[editingCardIndex] = card;
    }

    const landed = editingCardIndex === null ? activeDeck().cards.length - 1 : editingCardIndex;
    resetCardForm();
    renderCards();
    renderDecks();
    saveDecks();
    // the list only shows four rows, so a fifth card would land out of
    // sight. it slides down to whatever you just wrote instead.
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
    // anywhere else on the page gets the site's own menu. a text field
    // is the exception — its native menu is the only way to paste, and
    // the share panel exists to have codes pasted into it.
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
    closeOptionPops();
    closeWidgetPicks();
});

/* pressing away from the board is how you finish arranging it. the
   tiles, the two circles and the picker are all part of it; anything
   else is somewhere else, and the board settles. */
document.addEventListener('click', (event) => {
    if (!editingHome) return;
    if (event.target.closest('.widget-card, .widget-edit, .widget-add, #widgetPicks, .context-menu')) return;
    setHomeEditing(false);
});

// the backdrop is the way out; a click inside a panel is not
modalVeil.addEventListener('click', (event) => {
    if (event.target === modalVeil) showScreen(homeScreen);
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
    // typing owns every key but escape, which still closes the window
    // — otherwise a field you are in traps you in the create screen
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && event.key !== 'Escape') return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && deletedStack.length) {
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
            closeOptionPops();
            return;
        }
        if (!widgetPicks.hidden) {
            closeWidgetPicks();
            widgetAdd.focus();
            return;
        }
        if (!sharePanel.hidden) {
            closeSharePanel();
            shareToggle.focus();
            return;
        }
        if (isModalOpen()) {
            waitingForContinue = false;
            showScreen(homeScreen);
            return;
        }
    }

    if (waitingForContinue) {
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

// the body of this runs at the very bottom of the file, once section
// 12 has declared its elements — renderSections() reads the clip list
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
const previewWrap = document.getElementById('previewWrap');
const previewVideo = document.getElementById('previewVideo');
const senseBox = document.getElementById('senseBox');
const senseControls = document.getElementById('senseControls');
const senseReadout = document.getElementById('senseReadout');
const switchCount = document.getElementById('switchCount');
const liveLabel = document.getElementById('liveLabel');
const downloadAllButton = document.getElementById('downloadAll');
const senseToggle = document.getElementById('senseToggle');
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

/* how far in the picture is blown up, kept apart from the region's own
   numbers: it is about seeing what you are doing, not about what gets
   sampled. it is remembered on its own key and nothing but the reader's
   hand ever moves it. */
const ZOOM_KEY = 'sense-zoom';
let senseZoomAt = 100;

function applyZoom() {
    previewStage.style.width = `${senseZoomAt}%`;
    senseZoom.value = senseZoomAt;
    senseZoomOut.textContent = `${senseZoomAt}%`;
    previewWrap.classList.toggle('is-zoomed', senseZoomAt > 100);
}

function loadZoom() {
    const saved = Number(window.localStorage.getItem(ZOOM_KEY));
    if (saved >= 100 && saved <= 500) senseZoomAt = saved;
    applyZoom();
}

/* zooming keeps the middle of what you are looking at in the middle,
   rather than sliding the picture out from under you */
senseZoom.addEventListener('input', () => {
    const was = senseZoomAt;
    const middleX = (previewWrap.scrollLeft + previewWrap.clientWidth / 2) / was;
    const middleY = (previewWrap.scrollTop + previewWrap.clientHeight / 2) / was;
    senseZoomAt = Number(senseZoom.value);
    applyZoom();
    previewWrap.scrollLeft = middleX * senseZoomAt - previewWrap.clientWidth / 2;
    previewWrap.scrollTop = middleY * senseZoomAt - previewWrap.clientHeight / 2;
    try {
        window.localStorage.setItem(ZOOM_KEY, String(senseZoomAt));
    } catch (error) {
        // it just won't be remembered
    }
});

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
    /* the box is kept inside the frame by moving it, not by shrinking
       it. the other way round, sliding it towards a wall cut the width
       down to whatever was left — and sliding back didn't give it
       returned, because the number had already been written over. the
       size is what you set; the position gives way. */
    senseSettings.width = Math.max(2, Math.min(100, senseSettings.width));
    senseSettings.height = Math.max(2, Math.min(100, senseSettings.height));
    senseSettings.left = Math.max(0, Math.min(senseSettings.left, 100 - senseSettings.width));
    senseSettings.bottom = Math.max(0, Math.min(senseSettings.bottom, 100 - senseSettings.height));

    SENSE_KEYS.forEach((key) => {
        senseInputs[key].value = senseSettings[key];
        senseOutputs[key].textContent = key === 'threshold'
            ? senseSettings[key]
            : `${senseSettings[key]}%`;
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

senseToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const nowOpen = senseControls.hidden;
    senseControls.hidden = !nowOpen;
    senseToggle.setAttribute('aria-expanded', String(nowOpen));
    previewWrap.classList.toggle('showing-video', nowOpen);
    audioPanel.classList.toggle('is-tuning', nowOpen);
});

senseReset.addEventListener('click', (event) => {
    event.stopPropagation();
    // the zoom is how you are looking, not what is being watched, so
    // resetting the region leaves it where you had it
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

/* zoomed in you are looking through a window at something larger than
   the window. a press anywhere but on the box itself takes hold of the
   picture and slides it; the box keeps the press that lands on it. */
let pushStart = null;

previewWrap.addEventListener('pointerdown', (event) => {
    if (senseZoomAt <= 100) return;
    if (event.target.closest('.sense-box, .sense-controls')) return;
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

/* which part of the box the cursor is on. every edge and every corner
   can be taken hold of, not just the two it used to be, and the grab
   band shrinks on a small box so a thin strip is still mostly middle. */
function boxPointerMode(event, box) {
    const sideways = Math.min(12, Math.max(4, box.width / 3));
    const upright = Math.min(12, Math.max(4, box.height / 3));
    const west = event.clientX - box.left <= sideways;
    const east = box.right - event.clientX <= sideways;
    const north = event.clientY - box.top <= upright;
    const south = box.bottom - event.clientY <= upright;

    if (north && west) return 'nw';
    if (north && east) return 'ne';
    if (south && west) return 'sw';
    if (south && east) return 'se';
    if (north) return 'n';
    if (south) return 's';
    if (west) return 'w';
    if (east) return 'e';
    return 'move';
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
        /* an edge moves that edge and leaves the other three where they
           are, which for the left and the bottom means the position
           changes as well as the size. each is held to 2% and to the
           far edge it is coming towards, so a side can't pass its
           opposite number. */
        if (holds('e')) {
            senseSettings.width = clamp(dragStart.width + dx, 2, 100 - dragStart.left);
        }
        if (holds('w')) {
            const right = dragStart.left + dragStart.width;
            const left = clamp(dragStart.left + dx, 0, right - 2);
            senseSettings.left = left;
            senseSettings.width = right - left;
        }
        if (holds('n')) {
            senseSettings.height = clamp(dragStart.height - dy, 2, 100 - dragStart.bottom);
        }
        if (holds('s')) {
            const top = dragStart.bottom + dragStart.height;
            const bottom = clamp(dragStart.bottom - dy, 0, top - 2);
            senseSettings.bottom = bottom;
            senseSettings.height = top - bottom;
        }
    }

    applySenseSettings();
});

senseBox.addEventListener('pointerup', (event) => {
    if (!dragMode) return;
    dragMode = null;
    dragStart = null;
    senseBox.releasePointerCapture(event.pointerId);
    saveSenseSettings();
});

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
        total += Math.abs(sample[index] - previousSample[index]);
        total += Math.abs(sample[index + 1] - previousSample[index + 1]);
        total += Math.abs(sample[index + 2] - previousSample[index + 2]);
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

// keeps the empty line, the bin button and the subtitle in step with
// however many clips are actually in the list
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

/* the ask before anything that can't be taken back, or that runs for a
   while. it's a popup off the button rather than a browser alert —
   nothing is blocked, and anything that isn't a yes closes it: the
   button again, a click anywhere else, escape, or just ignoring it. */
const confirmChip = document.getElementById('confirmChip');
const confirmChipText = document.getElementById('confirmChipText');
const confirmChipYes = document.getElementById('confirmChipYes');
const confirmChipNo = document.getElementById('confirmChipNo');
let openConfirm = null;   // { button, settle } while one is up

/* it's fixed to the window and put under whichever button asked, rather
   than being absolutely placed inside one bar. that's what lets a card
   in the scrolling deck list raise one without the list cutting it off. */
/* every popup on the site is fixed to the window and put under the
   button that opened it, rather than absolutely placed inside some bar.
   that's what lets one open from a row in a scrolling list, or from
   inside a modal, without either of them cutting it off. */
function placeUnder(panel, button, bounds) {
    if (!panel || !button) return;
    const spot = button.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
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
    placeUnder(confirmChip, button);
}

function askConfirm(question, button) {
    // the same button again means "never mind"; a different one swaps
    if (openConfirm) {
        const wasAsking = openConfirm.button;
        openConfirm.settle(false);
        if (wasAsking === button) return Promise.resolve(false);
    }

    confirmChipText.textContent = question;
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
        // the button that asked is left alone here — its own click
        // closes the popup on the way through askConfirm
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

    try {
        const db = await openClipDb();
        const tx = db.transaction(CLIP_STORE, 'readwrite');
        tx.objectStore(CLIP_STORE).clear();
    } catch (error) {
        setRecordStatus('could not clear the saved clips', true);
    }
    clipCount = 0;
    refreshEmptyMessage();
}

clearClipsButton.addEventListener('click', clearAllClips);

// every clip as an mp3, oldest first. they go one at a time — chrome
// drops a burst of downloads, and encoding them all at once would
// stall the page anyway.
async function storedClipsInOrder() {
    const db = await openClipDb();
    const stored = await new Promise((resolve, reject) => {
        const request = db.transaction(CLIP_STORE, 'readonly').objectStore(CLIP_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
    // the list's order, top to bottom — it's what you can see
    const shown = [...recordingList.querySelectorAll('.recording-item')]
        .map((row) => row.dataset.clipId);
    return stored.sort((a, b) => {
        const left = shown.indexOf(a.id);
        const right = shown.indexOf(b.id);
        if (left === -1 || right === -1) return a.number - b.number;
        return left - right;
    });
}

/* saving the whole list takes a while, so the button becomes a pause
   while it runs: hit it again to hold after the clip it's on, and once
   more to carry on from there. */
let batchRunning = false;
let batchPaused = false;

function showBatchState() {
    const packing = batchRunning && !batchPaused;
    downloadAllButton.classList.toggle('is-packing', packing);
    const label = !batchRunning ? 'download every clip'
        : packing ? 'pause the download' : 'carry on downloading';
    downloadAllButton.setAttribute('aria-label', label);
    downloadAllButton.title = label;
}

async function downloadAllClips() {
    if (downloadAllButton.disabled) return;
    let clips;
    try {
        clips = await storedClipsInOrder();
    } catch (error) {
        setRecordStatus('could not read the saved clips', true);
        return;
    }
    if (!clips.length) return;

    const sure = await askConfirm(`download ${clips.length} clip${clips.length === 1 ? '' : 's'}? one at a time`, downloadAllButton);
    if (!sure) return;

    // it stays live — it's the pause button now
    batchRunning = true;
    batchPaused = false;
    showBatchState();

    let done = 0;
    for (const record of clips) {
        while (batchPaused) {
            setRecordStatus(`held at ${done} of ${clips.length}`);
            await new Promise((resolve) => window.setTimeout(resolve, 200));
        }
        setRecordStatus(`packing ${done + 1} of ${clips.length}...`);
        try {
            // a cropped clip goes out cropped here too
            const mp3 = await blobToMp3(record.blob, clipSpan(record, record.durationMs / 1000));
            const href = URL.createObjectURL(mp3);
            const link = document.createElement('a');
            link.href = href;
            link.download = clipFileName(record);
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(href), 10000);
            done += 1;
        } catch (error) {
            setRecordStatus(`clip ${record.number} failed — ${error.message}`, true);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 400));
    }
    setRecordStatus(done === clips.length ? '' : `only ${done} of ${clips.length} worked`, done !== clips.length);
    batchRunning = false;
    batchPaused = false;
    showBatchState();
    refreshEmptyMessage();
}

downloadAllButton.addEventListener('click', () => {
    if (batchRunning) {
        batchPaused = !batchPaused;
        showBatchState();
        return;
    }
    downloadAllClips();
});

/* --- clip storage (survives refresh) --- */

const CLIP_DB = 'recall-clips';
const CLIP_STORE = 'clips';
let clipDbPromise = null;

function openClipDb() {
    if (clipDbPromise) return clipDbPromise;
    clipDbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(CLIP_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CLIP_STORE)) {
                db.createObjectStore(CLIP_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return clipDbPromise;
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
        const stored = await new Promise((resolve, reject) => {
            const request = db.transaction(CLIP_STORE, 'readonly')
                .objectStore(CLIP_STORE)
                .getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        stored.forEach((record) => {
            if (record.number > clipCount) clipCount = record.number;
        });

        // whatever you last dragged them into; anything it doesn't know
        // about is newer, so it goes on top
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

/* chrome throws away a handful of characters on the way to disk — a name
   like "3/31" lands as "3_31". swapping each one for a unicode twin that
   looks the same gets the name through intact. */
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

function clipFileName(record) {
    const raw = record.name || `clip-${record.number}`;
    const safe = raw
        .replace(/[/\\:*?"<>|]/g, (char) => FILE_NAME_TWINS[char])
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/^\.+/, '')
        .trim();
    return `${safe || `clip-${record.number}`}.mp3`;
}

/* --- webm/opus -> mp3, only when a clip is downloaded --- */

/* decoding has to happen here (a worker has no AudioContext), but the
   encoding is the slow part, so that goes to mp3-worker.js and the page
   stays responsive while it runs. */
async function blobToMp3(blob, span) {
    const context = new AudioContext();
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    context.close();

    /* a cropped clip is exported cropped: the whole thing is decoded,
       and only the stretch between the marks is handed on. the copies
       are needed anyway, because the worker takes ownership of whatever
       it is given. */
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
        return new Blob([mp3], { type: 'audio/mpeg' });
    } finally {
        worker.terminate();
    }
}

/* --- recordings list --- */

/* a clip can be cropped without being cut: the recording stays whole in
   storage and the crop is two numbers kept beside it. playing, the
   duration shown and the mp3 you download all read those two, so the
   crop can be taken back by dragging the handles out again. */
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

function addRecording(record, alreadySaved, atEnd) {
    const item = document.createElement('li');
    item.className = 'recording-item';
    item.dataset.clipId = record.id;

    // the clip is only handed to the audio element on first play, so opening
    // the page with a full list doesn't start a decoder for every row
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

    /* the two marks you drag, and the stretch outside them. they live
       inside the bar, so the bar's own rounding clips them. */
    const shadeLeft = document.createElement('span');
    shadeLeft.className = 'crop-shade is-left';
    const shadeRight = document.createElement('span');
    shadeRight.className = 'crop-shade is-right';
    const handleStart = document.createElement('span');
    handleStart.className = 'crop-handle is-start';
    const handleEnd = document.createElement('span');
    handleEnd.className = 'crop-handle is-end';

    track.append(fill, shadeLeft, shadeRight, trackText);

    /* the marks hang off a wrapper rather than off the bar: the bar
       clips whatever leaves it, and the mark at the far end is half
       outside — clipped, that half stopped taking the pointer, so the
       end mark could be seen but not dragged. */
    const trackWrap = document.createElement('div');
    trackWrap.className = 'clip-track-wrap';
    trackWrap.append(track, handleStart, handleEnd);

    const totalSeconds = record.durationMs ? record.durationMs / 1000 : 0;

    const isEditing = () => trackText.classList.contains('is-editing');

    // the bar is the whole recording; the crop only says which stretch
    // of it is played, and where the fill starts and stops
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
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    /* dragging a mark. it writes straight into the record as it moves,
       so what you hear while dragging is what the crop will be, and it
       is only written to storage once you let go. the two can't cross,
       and can't leave less than half a second between them. */
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
        // the tail past the crop is never played: it stops at the mark
        // and waits at the head, ready to go again
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
    label.textContent = `00:00 / ${record.duration}`;

    /* crop: it doesn't cut anything, it shows the two marks and lets you
       drag them. the clip keeps its whole self either way. */
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
        // the mark it waits under is drawn by the stylesheet, so it sits
        // in the middle of the button rather than wherever a glyph's own
        // line box happens to put it
        download.classList.add('is-working');
        try {
            const mp3 = await blobToMp3(record.blob, clipSpan(record, totalSeconds));
            const href = URL.createObjectURL(mp3);
            const a = document.createElement('a');
            a.href = href;
            a.download = clipFileName(record);
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(href), 10000);
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
        player.pause();
        player.src = '';
        if (url) URL.revokeObjectURL(url);
        // nothing asked before this one, so it has to be undoable
        const rows = [...recordingList.querySelectorAll('.recording-item')];
        rememberDeleted({ type: 'clip', item: record, index: rows.indexOf(item) });
        item.remove();
        deleteClip(record.id);
        refreshEmptyMessage();
        rememberClipOrder();
    });

    // three lines, same grip the decks have
    const handle = document.createElement('button');
    handle.className = 'clip-handle';
    handle.type = 'button';
    handle.setAttribute('aria-label', `reorder clip ${record.number}, use arrow keys`);
    handle.innerHTML = '<span></span><span></span><span></span>';
    handle.addEventListener('pointerdown', (event) => liftClip(item, handle, event));
    handle.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        moveClipRow(item, event.key === 'ArrowUp' ? -1 : 1);
        handle.focus();
    });

    item.append(handle, playButton, trackWrap, label, crop, download, discard, player);
    paintProgress();
    if (atEnd) recordingList.append(item);
    else recordingList.prepend(item);
    refreshEmptyMessage();

    if (!alreadySaved) saveClip(record);
    if (!alreadySaved) rememberClipOrder();
    paintStorage();
}

/* --- reordering a list by hand --- */

/* the lift. the row you're holding follows the cursor up and down and
   nothing else: it can't leave the list, it can't go sideways, and it
   stays the same row rather than becoming a ghost of one. its own slot
   in the list is the space, and the other rows shuffle around it.

   it's pointer events rather than html drag and drop because the
   browser's drag image follows the cursor everywhere on the page, and
   that's the flying about we don't want.

   two lists use this — the clips and the decks — so the list, the row
   selector and what to do once it settles all come in from the caller. */

let liftedRow = null;   // the row in your hand, if any
let lift = null;        // where it was grabbed and how far it's moved

function liftRows(list, selector) {
    return [...list.querySelectorAll(selector)];
}

/* how a list gives way. the clips are quick and snappy because they're
   short rows you sort in a hurry; the decks are big tiles, so they take
   longer and swap nearer the middle of a row — an early swap on a tall
   tile reads as the list twitching. */
const LIFT_FEEL = {
    clips: { ms: 190, ease: 'cubic-bezier(0.33, 0, 0, 1)', mark: [0.2, 0.8], grabCursor: true },
    decks: { ms: 190, ease: 'cubic-bezier(0.33, 0, 0, 1)', mark: [0.2, 0.8], grabCursor: false },
    cards: { ms: 190, ease: 'cubic-bezier(0.33, 0, 0, 1)', mark: [0.2, 0.8], grabCursor: true }
};

// moving a row re-lays the list out in one pass; this then slides every
// row that shifted from where it was to where it landed, so the gap
// looks like it travels rather than teleports
function slideRows(list, selector, feel, rearrange) {
    const rows = liftRows(list, selector);
    // where each row looks like it is right now — a rect includes
    // whatever transform is mid-flight, so a swap during a swap picks
    // up from where the eye left it instead of snapping
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
        scroll: config.list.scrollTop,
        lastY: event.clientY,
        heading: 1,
        frame: 0,
        rows: [], tops: [], heights: [], listTop: 0, listBottom: 0
    };
    measureSlots();

    item.classList.add('is-lifted');
    config.list.classList.remove('is-arriving');
    document.documentElement.classList.add('sorting-rows');
    if (config.feel.grabCursor) document.documentElement.classList.add('sorting-grab');

    // the moves are followed on the window, not on the handle. capturing
    // the pointer looks like the tidier way, but the first swap moves
    // this row in the dom — and moving an element drops the capture, so
    // the drag went dead the moment the list first gave way.
    window.addEventListener('pointermove', trackLift);
    window.addEventListener('pointerup', endLift);
    window.addEventListener('pointercancel', endLift);
    lift.frame = window.requestAnimationFrame(carryRow);
}

/* where the rows sit when nothing is moving. offsetTop and offsetHeight
   are layout, so a row halfway through a slide still measures at the
   slot it's heading for — which is what the swap should be judged on.
   reading them per frame would be the lag, so it's measured once here
   and again only when the order actually changes. */
function measureSlots() {
    const list = lift.config.list;
    const box = list.getBoundingClientRect();
    lift.listTop = box.top;
    lift.listBottom = box.bottom;
    lift.scroll = list.scrollTop;
    lift.rows = liftRows(list, lift.config.selector);
    lift.tops = lift.rows.map((row) => row.offsetTop);
    lift.heights = lift.rows.map((row) => row.offsetHeight);
    // the top row's own offset is the list's padding — it's how far a
    // row sits off the wall, and the carried one stops there too
    lift.pad = lift.tops.length ? lift.tops[0] : 0;
}

// the list is the rows' offset parent, so a slot is its own top plus
// the list's, less however far the list is scrolled. the 1 is the
// border. the scroll is read once a frame in carryRow and kept — asking
// the list for it again after a transform is written forces a layout.
function slotTop(index) {
    return lift.listTop + 1 - lift.scroll + lift.tops[index];
}

function trackLift(event) {
    if (!lift || event.pointerId !== lift.pointerId) return;
    lift.pointerY = event.clientY;
}

// one frame: scroll if it's held against an end, and if anything has
// actually changed, put the row under the cursor and give way if it's
// far enough onto its neighbour
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

// the row sits where the cursor holds it, but never past either end of
// the list. its slot comes from the measurement, so this stays right
// after the list has reordered or scrolled.
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
    // which way you're going, with a few pixels of slack so a twitch
    // doesn't flip it back and forth
    if (Math.abs(lift.pointerY - lift.lastY) > 3) {
        lift.heading = lift.pointerY > lift.lastY ? 1 : -1;
        lift.lastY = lift.pointerY;
    }

    // the space goes above the first row the cursor hasn't cleared. the
    // mark sits near the edge you're coming at, so a row gives way as
    // soon as you're onto it either way up
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

// the list keeps its own order once you've touched it. it's a list of
// ids in localStorage rather than a field on each clip — rewriting a
// record means rewriting its blob, and that's a lot of copying to
// remember one number.
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
    const ids = [...recordingList.querySelectorAll('.recording-item')]
        .map((row) => row.dataset.clipId);
    try {
        window.localStorage.setItem(CLIP_ORDER_KEY, JSON.stringify(ids));
    } catch (error) {
        // out of room — the order just won't survive a refresh
    }
}

function liftClip(item, handle, event) {
    startLift(clipLiftConfig(), item, event);
}

function moveClipRow(item, step) {
    moveRow(clipLiftConfig(), item, step);
}


/* --- recording --- */

function pickRecordingType() {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm'
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function startRecording() {
    if (!activeStream) return;

    // the video track stays on activeStream for the pixel sampling,
    // but only the audio goes into the clip
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
    recordToggle.textContent = 'stop';
    senseToggle.hidden = false;

    showLiveRow();
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

    const barHeight = 8;
    const y = (height - barHeight) / 2;
    levelContext.globalAlpha = 1;
    levelContext.strokeStyle = '#fff';
    levelContext.lineWidth = 1;
    levelContext.strokeRect(0.5, 0.5, width - 1, height - 1);
    levelContext.fillStyle = '#fff';
    levelContext.fillRect(0, 0, width * Math.min(1, peak * 1.4), height);
}

function startLevelMeter() {
    if (activeStream.getAudioTracks().length === 0) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;   /* enough for a peak — a quarter the work per frame */
    levelData = new Uint8Array(analyser.fftSize);
    audioContext.createMediaStreamSource(activeStream).connect(analyser);
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

/* --- the clip being recorded right now --- */

function showLiveRow() {
    liveLabel.textContent = '';
}

function hideLiveRow() {
    liveLabel.textContent = '';
}

/* --- capture --- */

function stopCapture() {
    if (!activeStream) return;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    mediaRecorder = null;
    window.clearInterval(timerInterval);
    timerInterval = null;
    hideLiveRow();
    window.clearInterval(senseInterval);
    senseInterval = null;
    stopLevelMeter();
    previewWrap.classList.remove('showing-video');
    audioPanel.classList.remove('is-tuning');
    if (activeStream) activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
    previewVideo.srcObject = null;
    previousSample = null;
    previewWrap.hidden = true;
    audioPanel.classList.remove('is-live');
    senseReadout.hidden = true;
    senseReadout.textContent = 'change 0.0';
    senseControls.hidden = true;
    senseToggle.setAttribute('aria-expanded', 'false');
    recordToggle.classList.remove('recording');
    recordToggle.textContent = 'record';
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
    changeArmed = false;
    previousSample = null;
    applySenseSettings();

    if (activeStream.getAudioTracks().length === 0) {
        setRecordStatus('no audio — stop, and tick "also share tab audio"', true);
    }

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

loadSenseSettings();
applySenseSettings();
loadZoom();
recorderReady = true;
loadStoredClips();
senseToggle.hidden = true;

/* ---------- 13. player   (songs off your own disk) ---------- */

const playerPanel = document.getElementById('playerPanel');
const trackList = document.getElementById('trackList');
const trackInput = document.getElementById('trackInput');
const addTracksButton = document.getElementById('addTracks');
const clearTracksButton = document.getElementById('clearTracks');
const playerBody = document.getElementById('playerBody');
const playerSplit = document.getElementById('playerSplit');
const stageSide = document.querySelector('.stage-side');
const railNow = document.querySelector('.rail-now');
const railTitle = document.getElementById('railTitle');
const railTrack = document.getElementById('railTrack');
const railFill = document.getElementById('railFill');
const railToggle = document.getElementById('railToggle');
const railPrev = document.getElementById('railPrev');
const railNext = document.getElementById('railNext');
const linkClipsButton = document.getElementById('linkClips');
const nowDisc = document.getElementById('nowDisc');
const nowTitle = document.getElementById('nowTitle');
const nowElapsed = document.getElementById('nowElapsed');
const nowTotal = document.getElementById('nowTotal');
const playerVolume = document.getElementById('playerVolume');
const playerNote = document.getElementById('playerNote');
const playToggle = document.getElementById('playToggle');
const playPrev = document.getElementById('playPrev');
const playNext = document.getElementById('playNext');
const playerTrack = document.getElementById('playerTrack');
const playerFill = document.getElementById('playerFill');
const shuffleToggle = document.getElementById('shuffleToggle');
const repeatToggle = document.getElementById('repeatToggle');

/* one audio element for the lot — swapping its source is far cheaper
   than holding one per song, and only one can play at a time anyway. */
const songPlayer = new Audio();
songPlayer.preload = 'metadata';

let tracks = [];            // { id, name, blob, duration }
let playingId = null;
let playingUrl = '';
let shuffleOn = false;
let repeatOn = false;

const TRACK_DB = 'recall-tracks';
const TRACK_STORE = 'tracks';
const TRACK_ORDER_KEY = 'track-order';
let trackDbPromise = null;

/* its own database rather than a second store in the clips one: adding
   a store means a version bump, and a bad migration would take the
   recordings with it. */
function openTrackDb() {
    if (trackDbPromise) return trackDbPromise;
    trackDbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(TRACK_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(TRACK_STORE)) {
                db.createObjectStore(TRACK_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return trackDbPromise;
}

async function saveTrack(record) {
    const db = await openTrackDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TRACK_STORE, 'readwrite');
        tx.objectStore(TRACK_STORE).put(record);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function forgetTrack(id) {
    try {
        const db = await openTrackDb();
        db.transaction(TRACK_STORE, 'readwrite').objectStore(TRACK_STORE).delete(id);
    } catch (error) {
        // the row has already gone from the page; nothing else to do
    }
}

function savedTrackOrder() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(TRACK_ORDER_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

function rememberTrackOrder() {
    tracks = [...trackList.querySelectorAll('.track-item')]
        .map((row) => tracks.find((item) => item.id === row.dataset.trackId))
        .filter(Boolean);
    try {
        window.localStorage.setItem(TRACK_ORDER_KEY, JSON.stringify(tracks.map((t) => t.id)));
    } catch (error) {
        // out of room — the order just won't survive a refresh
    }
}

/* --- adding songs --- */

function clockFace(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/* a file gives up its length only once something has tried to read it,
   so each one is loaded into a throwaway element first. a file that
   won't decode is dropped rather than added as a row that can't play. */
function readDuration(blob) {
    return new Promise((resolve) => {
        const probe = new Audio();
        const url = URL.createObjectURL(blob);
        const done = (value) => {
            probe.src = '';
            URL.revokeObjectURL(url);
            resolve(value);
        };
        probe.addEventListener('loadedmetadata', () => done(probe.duration), { once: true });
        probe.addEventListener('error', () => done(null), { once: true });
        probe.src = url;
    });
}

async function addTrackFiles(files) {
    const picked = [...files].filter((file) => file.type.startsWith('audio/'));
    if (!picked.length) return;

    // a library worth keeping shouldn't be thrown away the first time
    // the disk gets tight, and the browser only promises that if asked
    if (navigator.storage && navigator.storage.persist) {
        try { await navigator.storage.persist(); } catch (error) { /* not fatal */ }
    }

    let added = 0;
    for (const file of picked) {
        setPlayerStatus(`reading ${file.name}...`);
        const duration = await readDuration(file);
        if (duration === null) continue;
        const record = {
            id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            blob: file,
            duration
        };
        try {
            await saveTrack(record);
        } catch (error) {
            setPlayerStatus('out of room — that one was not kept', true);
            continue;
        }
        tracks.push(record);
        addTrackRow(record);
        added += 1;
    }
    rememberTrackOrder();
    refreshPlayerState();
    setPlayerStatus(added ? '' : "none of those would play");
    paintStorage();
}

function setPlayerStatus(text) {
    playerNote.textContent = text || '';
}


/* --- the list --- */

function trackLiftConfig() {
    return {
        list: trackList,
        selector: '.track-item',
        feel: LIFT_FEEL.clips,
        onSettle: rememberTrackOrder
    };
}

function addTrackRow(record) {
    const item = document.createElement('li');
    item.className = 'track-item';
    item.dataset.trackId = record.id;

    const handle = document.createElement('button');
    handle.className = 'clip-handle track-handle';
    handle.type = 'button';
    handle.setAttribute('aria-label', `reorder ${record.name}, use arrow keys`);
    handle.innerHTML = '<span></span><span></span><span></span>';
    handle.addEventListener('pointerdown', (event) => startLift(trackLiftConfig(), item, event));
    handle.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        moveRow(trackLiftConfig(), item, event.key === 'ArrowUp' ? -1 : 1);
        handle.focus();
    });

    const play = document.createElement('button');
    play.className = 'clip-play';
    play.type = 'button';
    play.setAttribute('aria-label', `play ${record.name}`);
    play.textContent = '▶';
    play.addEventListener('click', (event) => {
        event.stopPropagation();
        if (playingId === record.id) togglePlayback();
        else playTrack(record.id);
    });

    const name = document.createElement('span');
    name.className = 'track-name';
    name.textContent = record.name;
    name.title = record.name;

    // a linked row says so, so a recording that has since been binned
    // isn't a mystery when it won't play
    let mark = null;
    if (record.clipId) {
        mark = document.createElement('span');
        mark.className = 'track-mark';
        mark.textContent = 'clip';
        mark.title = 'linked to a recording on the audio page';
    }

    const length = document.createElement('span');
    length.className = 'clip-label';
    length.textContent = clockFace(record.duration);

    const remove = document.createElement('button');
    remove.className = 'track-drop';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `bin ${record.name}`);
    remove.title = 'bin this song';
    remove.addEventListener('click', (event) => {
        event.stopPropagation();
        dropTrack(record.id);
    });

    item.append(handle, play, name, ...(mark ? [mark] : []), length, remove);
    item.addEventListener('dblclick', () => playTrack(record.id));
    trackList.append(item);
}

function renderTrackRows() {
    trackList.innerHTML = '';
    tracks.forEach(addTrackRow);
    refreshPlayerState();
}

function dropTrack(id) {
    if (playingId === id) stopPlayback();
    const record = tracks.find((item) => item.id === id);
    const at = tracks.findIndex((item) => item.id === id);
    if (record) rememberDeleted({ type: 'track', item: record, index: at });
    const row = trackList.querySelector(`[data-track-id="${id}"]`);
    if (row) row.remove();
    tracks = tracks.filter((item) => item.id !== id);
    forgetTrack(id);
    rememberTrackOrder();
    refreshPlayerState();
}

/* --- playing --- */

/* a linked clip keeps no audio of its own — it points at the recording
   on the audio page, and the sound is fetched when you press play. two
   copies of the same minutes would be a waste of the disk quota, and
   binning the clip should take its entry with it. */
async function trackAudio(record) {
    if (record.blob) return record.blob;
    if (!record.clipId) return null;
    try {
        const db = await openClipDb();
        const clip = await new Promise((resolve, reject) => {
            const request = db.transaction(CLIP_STORE, 'readonly')
                .objectStore(CLIP_STORE).get(record.clipId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return clip ? clip.blob : null;
    } catch (error) {
        return null;
    }
}

async function playTrack(id) {
    const record = tracks.find((item) => item.id === id);
    if (!record) return;
    const sound = await trackAudio(record);
    if (!sound) {
        setPlayerStatus(`"${record.name}" is a link to a clip that's gone`);
        return;
    }
    if (playingUrl) URL.revokeObjectURL(playingUrl);
    playingUrl = URL.createObjectURL(sound);
    playingId = id;
    songPlayer.src = playingUrl;
    songPlayer.play().catch(() => setPlayerStatus('that one would not play'));
    refreshPlayerState();
}

function togglePlayback() {
    if (!playingId) {
        if (tracks.length) playTrack(tracks[0].id);
        return;
    }
    if (songPlayer.paused) songPlayer.play().catch(() => {});
    else songPlayer.pause();
    refreshPlayerState();
}

function stopPlayback() {
    songPlayer.pause();
    songPlayer.removeAttribute('src');
    songPlayer.load();
    if (playingUrl) URL.revokeObjectURL(playingUrl);
    playingUrl = '';
    playingId = null;
    refreshPlayerState();
}

function stepTrack(step) {
    if (!tracks.length) return;
    if (shuffleOn && tracks.length > 1) {
        let next;
        do {
            next = tracks[Math.floor(Math.random() * tracks.length)];
        } while (next.id === playingId);
        playTrack(next.id);
        return;
    }
    const at = tracks.findIndex((item) => item.id === playingId);
    const to = (at + step + tracks.length) % tracks.length;
    playTrack(tracks[to].id);
}

/* the row that's on wears the black, the way an open deck does */
function refreshPlayerState() {
    const playing = Boolean(playingId) && !songPlayer.paused;
    playToggle.textContent = playing ? '⏸' : '▶';
    playToggle.setAttribute('aria-label', playing ? 'pause' : 'play');
    playToggle.title = playing ? 'pause' : 'play';

    trackList.querySelectorAll('.track-item').forEach((row) => {
        const on = row.dataset.trackId === playingId;
        row.classList.toggle('is-playing', on);
        const mark = row.querySelector('.clip-play');
        if (mark) mark.textContent = on && playing ? '⏸' : '▶';
    });

    const current = tracks.find((item) => item.id === playingId);
    nowTitle.textContent = current ? current.name : '';
    nowTitle.title = current ? current.name : '';
    // the record turns only while something is actually running
    nowDisc.classList.toggle('is-spinning', playing);

    // the bar carries the same state in shorter form, and isn't there
    // at all when there's nothing to say
    railNow.hidden = !current;
    railTitle.textContent = current ? current.name : '';
    railTitle.title = current ? current.name : '';
    railToggle.textContent = playing ? '\u23f8' : '\u25b6';
    railToggle.setAttribute('aria-label', playing ? 'pause' : 'play');
    railToggle.title = playing ? 'pause' : 'play';

    clearTracksButton.disabled = tracks.length === 0;
    [playToggle, playPrev, playNext, railToggle, railPrev, railNext].forEach((button) => {
        button.disabled = tracks.length === 0;
    });
    if (!playingId) {
        playerFill.style.width = '0%';
        railFill.style.width = '0%';
        nowElapsed.textContent = '0:00';
        nowTotal.textContent = '0:00';
    } else if (Number.isFinite(songPlayer.duration)) {
        nowElapsed.textContent = clockFace(songPlayer.currentTime);
        nowTotal.textContent = clockFace(songPlayer.duration);
    }
    refreshTrackEmpty();
}

function refreshTrackEmpty() {
    const existing = trackList.querySelector('.empty-message');
    if (!tracks.length && !existing) {
        const note = document.createElement('li');
        note.className = 'empty-message';
        note.textContent = 'no songs yet ʕ•ᴥ•ʔ';
        trackList.append(note);
    } else if (tracks.length && existing) {
        existing.remove();
    }
}

songPlayer.addEventListener('timeupdate', () => {
    if (!songPlayer.duration || !Number.isFinite(songPlayer.duration)) return;
    const through = `${(songPlayer.currentTime / songPlayer.duration) * 100}%`;
    playerFill.style.width = through;
    railFill.style.width = through;
    nowElapsed.textContent = clockFace(songPlayer.currentTime);
    nowTotal.textContent = clockFace(songPlayer.duration);
});
songPlayer.addEventListener('play', refreshPlayerState);
songPlayer.addEventListener('pause', refreshPlayerState);
songPlayer.addEventListener('ended', () => {
    if (repeatOn) {
        songPlayer.currentTime = 0;
        songPlayer.play().catch(() => {});
        return;
    }
    stepTrack(1);
});


/* --- wiring --- */

addTracksButton.addEventListener('click', () => trackInput.click());
trackInput.addEventListener('change', () => {
    addTrackFiles(trackInput.files);
    trackInput.value = '';   // the same file can be picked again
});
[playToggle, railToggle].forEach((b) => b.addEventListener('click', togglePlayback));
[playPrev, railPrev].forEach((b) => b.addEventListener('click', () => stepTrack(-1)));
[playNext, railNext].forEach((b) => b.addEventListener('click', () => stepTrack(1)));

// both scrubbers seek
[playerTrack, railTrack].forEach((bar) => {
    bar.addEventListener('click', (event) => {
        if (!playingId || !Number.isFinite(songPlayer.duration)) return;
        const box = bar.getBoundingClientRect();
        const at = (event.clientX - box.left) / box.width;
        songPlayer.currentTime = Math.max(0, Math.min(1, at)) * songPlayer.duration;
    });
});

shuffleToggle.addEventListener('click', () => {
    shuffleOn = !shuffleOn;
    shuffleToggle.classList.toggle('is-on', shuffleOn);
    shuffleToggle.setAttribute('aria-pressed', String(shuffleOn));
});
repeatToggle.addEventListener('click', () => {
    repeatOn = !repeatOn;
    repeatToggle.classList.toggle('is-on', repeatOn);
    repeatToggle.setAttribute('aria-pressed', String(repeatOn));
});

/* everything on the audio page that isn't already in the list. it
   links rather than copies, so this is safe to press twice. */
linkClipsButton.addEventListener('click', async () => {
    let clips = [];
    try {
        const db = await openClipDb();
        clips = await new Promise((resolve, reject) => {
            const request = db.transaction(CLIP_STORE, 'readonly').objectStore(CLIP_STORE).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        setPlayerStatus('could not read the clips');
        return;
    }

    const linked = new Set(tracks.map((item) => item.clipId).filter(Boolean));
    const fresh = clips.filter((clip) => !linked.has(clip.id));
    if (!fresh.length) {
        setPlayerStatus(clips.length ? 'every clip is already here' : 'no clips recorded yet');
        return;
    }

    for (const clip of fresh) {
        const record = {
            id: `track-${clip.id}`,
            name: clip.name || `clip ${clip.number}`,
            clipId: clip.id,
            duration: await readDuration(clip.blob)
        };
        try {
            await saveTrack(record);
        } catch (error) {
            continue;
        }
        tracks.push(record);
        addTrackRow(record);
    }
    rememberTrackOrder();
    refreshPlayerState();
    setPlayerStatus(`linked ${fresh.length} clip${fresh.length === 1 ? '' : 's'}`);
});

playerVolume.addEventListener('input', () => {
    songPlayer.volume = Number(playerVolume.value) / 100;
});


const playerSplitter = wireSplit({
    split: playerSplit,
    body: playerBody,
    other: stageSide,
    variable: '--queue-col',
    key: 'player-column',
    min: 18,
    fallback: 42
});

clearTracksButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (clearTracksButton.disabled) return;
    const total = tracks.length;
    const sure = await askConfirm(`bin all ${total} song${total === 1 ? '' : 's'}? no undo`, clearTracksButton);
    if (!sure) return;
    stopPlayback();
    tracks.forEach((item) => forgetTrack(item.id));
    tracks = [];
    renderTrackRows();
    rememberTrackOrder();
});

// songs the browser is already holding, back in the order you left them
async function loadStoredTracks() {
    try {
        const db = await openTrackDb();
        const stored = await new Promise((resolve, reject) => {
            const request = db.transaction(TRACK_STORE, 'readonly').objectStore(TRACK_STORE).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
        const order = savedTrackOrder();
        stored.sort((a, b) => {
            const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
            return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
        });
        tracks = stored;
    } catch (error) {
        tracks = [];
    }
    renderTrackRows();
}

if (playerSplitter) playerSplitter.load();
loadStoredTracks();

/* ---------- 14. the bar's own three  (clock · storage · binned) ---------- */

/* lowercase, like everything else here. it ticks on the minute rather
   than every second — nothing on this page needs the seconds, and a
   number changing in the corner is a distraction. */
function paintClock() {
    const now = new Date();
    // the am/pm is set apart from the digits, in the body face. the hour
    // is padded so the digits never change width on the turn of an hour
    const told = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    const half = told.match(/\s*([ap]m)$/);
    clockTime.textContent = half ? told.slice(0, half.index) : told;
    clockSuffix.textContent = half ? half[1] : '';
    clockDate.textContent = now
        .toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
        .toLowerCase();
    paintWidgets();
}

function startClock() {
    paintClock();
    // line the first tick up with the turn of the minute, then keep to it
    const toTheMinute = (60 - new Date().getSeconds()) * 1000;
    window.setTimeout(() => {
        paintClock();
        window.setInterval(paintClock, 60000);
    }, toTheMinute);
}

/* what the clips and the songs are actually costing. the browser gives
   a quota rather than the disk's own size, and it only updates once a
   write has settled, so this is refreshed after anything is kept. */
function roundSize(bytes) {
    if (!bytes) return '0 mb';
    const mb = bytes / 1048576;
    if (mb < 1) return 'under 1 mb';
    if (mb < 1024) return `${Math.round(mb)} mb`;
    return `${(mb / 1024).toFixed(1)} gb`;
}

async function paintStorage() {
    if (!navigator.storage || !navigator.storage.estimate) {
        storeAmount.textContent = 'not measurable';
        return;
    }
    try {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        storeAmount.textContent = quota
            ? `${roundSize(usage)} of ${roundSize(quota)}`
            : roundSize(usage);
        const share = quota ? Math.min(100, (usage / quota) * 100) : 0;
        // a sliver so the bar reads as "something" rather than empty
        storeFill.style.width = usage && share < 0.5 ? '2px' : `${share}%`;
        paintWidgets();
    } catch (error) {
        storeAmount.textContent = 'not measurable';
    }
}

/* the whole page turns over: one filter on the root, so every black
   becomes white and every white black, and nothing has to be restyled
   twice. the choice is remembered. */
const THEME_KEY = 'page-inverted';

let themingTimer = 0;
let themeReady = false;   // true once the page has settled on load

function setInverted(on) {
    const root = document.documentElement;
    // nothing is animated unless the page is actually changing sides —
    // the call on load would otherwise spin the moon at every refresh
    const moved = root.classList.contains('inverted') !== on && themeReady;
    // the transition is only on while the swap is happening — see the
    // note beside .theming in the stylesheet
    if (moved) {
        root.classList.add('theming');
        window.clearTimeout(themingTimer);
        themingTimer = window.setTimeout(() => root.classList.remove('theming'), 450);
    }
    root.classList.toggle('inverted', on);
    themeSwap.setAttribute('aria-pressed', String(on));
    /* the moon turns over as the page does: a half turn the way you're
       heading, with a dip through the middle so it reads as being
       flipped rather than spun. it starts and ends exactly where the
       stylesheet rests it, so nothing jumps when it hands back. on a
       page load there is nothing to play — the moon is simply already
       the way round it was left. */
    const moon = themeSwap.querySelector('svg');
    if (moved && moon && typeof moon.animate === 'function') {
        moon.animate([
            { transform: `rotate(${on ? 0 : 180}deg) scale(1)` },
            { transform: 'rotate(90deg) scale(0.76)', offset: 0.45 },
            { transform: `rotate(${on ? 180 : 0}deg) scale(1)` }
        ], { duration: 520, easing: 'cubic-bezier(0.34, 1.2, 0.45, 1)' });
    }
    themeSwap.title = on ? 'back to the light' : 'turn the lights off';
    themeSwap.setAttribute('aria-label', on ? 'back to the light' : 'turn the lights off');
    try {
        window.localStorage.setItem(THEME_KEY, on ? 'yes' : 'no');
    } catch (error) {
        // it just won't be remembered
    }
}

themeSwap.addEventListener('click', () => {
    setInverted(!document.documentElement.classList.contains('inverted'));
});
setInverted(window.localStorage.getItem(THEME_KEY) === 'yes');
themeReady = true;

/* ---------- 15. home widgets ---------- */

/* home is a board rather than a list. every widget takes one of three
   sizes on a four-column grid — a square, a wide one, or a big one
   two rows deep — and each writes itself differently at each size, so
   a small one is a single number and a large one is the whole story.

   nothing is draggable until you turn on edit, in the corner. that's
   the only mode with handles in it: out of edit the board is just the
   board, and a widget's own buttons work normally. */

const widgetList = document.getElementById('widgetList');
const widgetAdd = document.getElementById('widgetAdd');
const widgetPicks = document.getElementById('widgetPicks');
const widgetPickList = document.getElementById('widgetPickList');
const widgetEdit = document.getElementById('widgetEdit');
const homePanel2 = document.getElementById('homePanel');

const WIDGET_KEY = 'home-widgets';

// the three shapes, in the order the size chip walks through them
const WIDGET_SIZES = ['small', 'wide', 'large'];
const SIZE_MARK = { small: '1×1', wide: '2×1', large: '2×2' };

/* nothing comes with the board. the widgets you put on it are your own
   pictures, added with the + — so there is no catalogue here yet. */
/* each widget says what it's called, the face it wears, and how to
   fill its body at a given size. fill() is called again whenever
   anything it shows changes, so it always rebuilds rather than
   patching. */
const WIDGETS = [
    {
        id: 'clock',
        name: 'the time',
        face: '(-ω-)zz',
        fill(body, size) {
            const now = new Date();
            const told = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
            const half = told.match(/\s*([ap]m)$/);
            const digits = half ? told.slice(0, half.index) : told;

            body.innerHTML = '';
            body.append(bigReading(digits, half ? half[1] : ''));
            if (size === 'small') return;
            body.append(oneLine(now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()));
            if (size !== 'large') return;
            // the large one says how far through the day it is
            const through = Math.round(((now.getHours() * 60) + now.getMinutes()) / 14.4);
            body.append(meterBar(through), oneLine(`${through}% through the day`));
        }
    },
    {
        id: 'decks',
        name: 'your decks',
        face: '(・∀・)',
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
            if (size !== 'large') return;

            // every deck, longest first, each with a bar for its share
            const most = Math.max(1, ...decks.map((deck) => deck.cards.length));
            const rows = document.createElement('div');
            rows.className = 'widget-rows';
            [...decks]
                .sort((one, two) => two.cards.length - one.cards.length)
                .slice(0, 4)
                .forEach((deck) => {
                    const row = document.createElement('div');
                    row.className = 'widget-row';
                    const name = document.createElement('span');
                    name.className = 'widget-row-name';
                    name.textContent = deck.name;
                    const count = document.createElement('small');
                    count.textContent = String(deck.cards.length);
                    row.append(name, meterBar((deck.cards.length / most) * 100), count);
                    rows.append(row);
                });
            body.append(rows);
        }
    },
    {
        id: 'jump',
        name: 'jump back in',
        face: '(ﾉ･ω･)ﾉ',
        fill(body, size) {
            body.innerHTML = '';
            const ready = decks.filter((deck) => deck.cards.length);
            if (!ready.length) {
                body.append(oneLine('no cards to practice yet'));
                return;
            }
            const room = size === 'small' ? 1 : size === 'wide' ? 2 : 4;
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
        name: "what you've kept",
        face: '(๑•̀ᴗ•́)',
        fill(body, size) {
            const clips = recordingList.querySelectorAll('.recording-item').length;
            const binned = binnedList.querySelectorAll('button').length;
            body.innerHTML = '';

            if (size === 'small') {
                body.append(bigReading(String(clips + tracks.length), 'kept'));
                return;
            }
            body.append(tallyRow([
                [clips, clips === 1 ? 'clip' : 'clips'],
                [tracks.length, tracks.length === 1 ? 'song' : 'songs'],
                [binned, 'in the bin']
            ]));
            if (size !== 'large') return;
            body.append(oneLine(storeAmount.textContent), meterBar(parseFloat(storeFill.style.width) || 0));
        }
    }
];

/* the pieces every widget builds out of, so a number means the same
   thing wherever it turns up */

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

// the same outlined bar the storage box uses, at whatever percent
function meterBar(percent) {
    const bar = document.createElement('span');
    bar.className = 'widget-meter';
    const fill = document.createElement('span');
    fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    bar.append(fill);
    return bar;
}

function widgetById(id) {
    return WIDGETS.find((widget) => widget.id === id);
}

// the clock and the decks to begin with, one square and one wide
let homeWidgets = [{ id: 'clock', size: 'small' }, { id: 'decks', size: 'wide' }];
let editingHome = false;

function loadWidgets() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(WIDGET_KEY));
        if (!Array.isArray(saved)) return;
        // the first version of this kept a plain list of names
        homeWidgets = saved
            .map((entry) => (typeof entry === 'string' ? { id: entry, size: 'wide' } : entry))
            .filter((entry) => entry && widgetById(entry.id))
            .map((entry) => ({ id: entry.id, size: WIDGET_SIZES.includes(entry.size) ? entry.size : 'wide' }));
    } catch (error) {
        // the defaults stand
    }
}

function saveWidgets() {
    try {
        window.localStorage.setItem(WIDGET_KEY, JSON.stringify(homeWidgets));
    } catch (error) {
        // it just won't be remembered
    }
}

function renderWidgets() {
    widgetList.innerHTML = '';
    // an empty board says nothing — it just stands the add circle out
    // where the tiles would be, so there is something to press
    homePanel2.classList.toggle('is-empty', homeWidgets.length === 0);

    homeWidgets.forEach((entry) => {
        const widget = widgetById(entry.id);
        if (!widget) return;

        const card = document.createElement('section');
        card.className = 'widget-card';
        card.dataset.widgetId = entry.id;
        card.dataset.size = entry.size;

        const head = document.createElement('div');
        head.className = 'widget-head';
        const name = document.createElement('h3');
        name.textContent = widget.name;
        const face = document.createElement('span');
        face.className = 'widget-face';
        face.textContent = widget.face;
        head.append(name, face);

        const body = document.createElement('div');
        body.className = 'widget-body';
        widget.fill(body, entry.size);

        // the two edit handles. they're built either way and hidden by
        // the board, so turning edit on doesn't rebuild anything.
        const drop = document.createElement('button');
        drop.className = 'widget-off';
        drop.type = 'button';
        drop.setAttribute('aria-label', `remove ${widget.name}`);
        drop.textContent = '×';
        drop.addEventListener('click', (event) => {
            event.stopPropagation();
            removeWidget(entry.id);
        });

        const resize = document.createElement('button');
        resize.className = 'widget-size';
        resize.type = 'button';
        resize.setAttribute('aria-label', `resize ${widget.name}`);
        resize.textContent = SIZE_MARK[entry.size];
        resize.addEventListener('click', (event) => {
            event.stopPropagation();
            cycleWidgetSize(entry.id);
        });

        card.append(head, body, drop, resize);
        card.addEventListener('pointerdown', (event) => startWidgetDrag(card, event));
        card.addEventListener('contextmenu', (event) => {
            event.stopPropagation();
            showContextMenu(event, { type: 'widget', id: entry.id });
        });
        widgetList.append(card);
    });

    widgetAdd.hidden = homeWidgets.length === WIDGETS.length;
}

/* only the bodies, for the things that change under you — the clock on
   the minute, the tallies after anything is kept or binned. rebuilding
   the cards instead would drop one mid-drag. */
function paintWidgets() {
    if (!widgetList) return;
    widgetList.querySelectorAll('.widget-card').forEach((card) => {
        const widget = widgetById(card.dataset.widgetId);
        if (widget) widget.fill(card.querySelector('.widget-body'), card.dataset.size);
    });
}

function addWidget(id) {
    if (homeWidgets.some((entry) => entry.id === id)) return;
    homeWidgets.push({ id, size: 'wide' });
    saveWidgets();
    renderWidgets();
}

function removeWidget(id) {
    homeWidgets = homeWidgets.filter((entry) => entry.id !== id);
    saveWidgets();
    renderWidgets();
}

// the chip walks a widget round the three shapes, and the board slides
// everything that moved out of its way
function cycleWidgetSize(id) {
    const entry = homeWidgets.find((item) => item.id === id);
    if (!entry) return;
    entry.size = WIDGET_SIZES[(WIDGET_SIZES.indexOf(entry.size) + 1) % WIDGET_SIZES.length];
    saveWidgets();
    slideBoard(() => renderWidgets());
}

/* a press anywhere that isn't the board or the buttons that work it puts
   the arranging away, the same as pressing done. */
document.addEventListener('pointerdown', (event) => {
    if (!editingHome) return;
    const inside = event.target.closest
        && event.target.closest('.widget-card, .widget-edit, .widget-add, #widgetPicks');
    if (inside) return;
    setHomeEditing(false);
});

function setHomeEditing(on) {
    editingHome = on;
    homePanel2.classList.toggle('is-editing', on);
    // the button holds two marks and the stylesheet shows one of them
    widgetEdit.setAttribute('aria-pressed', String(on));
    widgetEdit.title = on ? 'done arranging' : 'arrange the board';
    widgetEdit.setAttribute('aria-label', widgetEdit.title);
    if (!on) closeWidgetPicks();
}

/* a move on the board: everything is measured, the order changes, and
   whatever ended up somewhere else is slid from where it was. the same
   idea as the lists, but the board moves things sideways too. */
function slideBoard(rearrange) {
    const cards = [...widgetList.querySelectorAll('.widget-card')];
    const before = new Map(cards.map((card) => [card.dataset.widgetId, card.getBoundingClientRect()]));
    rearrange();
    widgetList.querySelectorAll('.widget-card').forEach((card) => {
        const was = before.get(card.dataset.widgetId);
        if (!was || card.classList.contains('is-dragging')) return;
        const now = card.getBoundingClientRect();
        const shiftX = was.left - now.left;
        const shiftY = was.top - now.top;
        if (!shiftX && !shiftY) return;
        card.animate(
            [{ transform: `translate(${shiftX}px, ${shiftY}px)` }, { transform: 'none' }],
            { duration: 220, easing: 'cubic-bezier(0.33, 0, 0, 1)' }
        );
    });
}

/* dragging one tile about the board. the tile follows the pointer on a
   frame loop, the way the lists carry a row: a pointermove only writes
   down where the cursor is, and the frame does the work. the slots are
   measured once when the drag starts and again only when the order
   actually changes — measuring every tile on every move was what made
   this crawl. */
let boardDrag = null;

function startWidgetDrag(card, event) {
    if (!editingHome || event.button) return;
    if (event.target.closest('.widget-off, .widget-size')) return;
    event.preventDefault();
    if (boardDrag) endWidgetDrag();

    const spot = card.getBoundingClientRect();
    boardDrag = {
        card,
        pointerId: event.pointerId,
        grabX: event.clientX - spot.left,
        grabY: event.clientY - spot.top,
        baseX: spot.left,
        baseY: spot.top,
        pointerX: event.clientX,
        pointerY: event.clientY,
        slots: [],
        frame: 0
    };
    measureBoard();

    card.classList.add('is-dragging');
    document.documentElement.classList.add('sorting-rows', 'sorting-grab');
    window.addEventListener('pointermove', trackWidgetDrag);
    window.addEventListener('pointerup', endWidgetDrag);
    window.addEventListener('pointercancel', endWidgetDrag);
    boardDrag.frame = window.requestAnimationFrame(carryWidget);
}

/* where every other tile sits while nothing is moving. a tile halfway
   through a slide still measures at the slot it is heading for, which
   is what a swap should be judged on. */
function measureBoard() {
    boardDrag.slots = [...widgetList.querySelectorAll('.widget-card')]
        .filter((card) => card !== boardDrag.card)
        .map((card) => {
            const box = card.getBoundingClientRect();
            return { card, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        });
    boardDrag.card.style.transform = 'none';
    const spot = boardDrag.card.getBoundingClientRect();
    boardDrag.baseX = spot.left;
    boardDrag.baseY = spot.top;
}

function trackWidgetDrag(event) {
    if (!boardDrag || event.pointerId !== boardDrag.pointerId) return;
    boardDrag.pointerX = event.clientX;
    boardDrag.pointerY = event.clientY;
}

function carryWidget() {
    if (!boardDrag) return;
    const { card, pointerX, pointerY } = boardDrag;

    const over = boardDrag.slots.find((slot) => pointerX >= slot.left && pointerX <= slot.right
        && pointerY >= slot.top && pointerY <= slot.bottom);

    if (over) {
        const cards = [...widgetList.querySelectorAll('.widget-card')];
        const after = cards.indexOf(over.card) > cards.indexOf(card);
        slideBoard(() => {
            widgetList.insertBefore(card, after ? over.card.nextSibling : over.card);
        });
        settleWidgetOrder();
        measureBoard();
    }

    card.style.transform =
        `translate(${pointerX - boardDrag.baseX - boardDrag.grabX}px, `
        + `${pointerY - boardDrag.baseY - boardDrag.grabY}px)`;
    boardDrag.frame = window.requestAnimationFrame(carryWidget);
}

function endWidgetDrag() {
    if (!boardDrag) return;
    const { card } = boardDrag;
    window.cancelAnimationFrame(boardDrag.frame);
    card.classList.remove('is-dragging');
    card.style.transform = '';
    document.documentElement.classList.remove('sorting-rows', 'sorting-grab');
    window.removeEventListener('pointermove', trackWidgetDrag);
    window.removeEventListener('pointerup', endWidgetDrag);
    window.removeEventListener('pointercancel', endWidgetDrag);
    boardDrag = null;
}

// the board is the order once a drag lands; this reads it back
function settleWidgetOrder() {
    const sizes = new Map(homeWidgets.map((entry) => [entry.id, entry.size]));
    homeWidgets = [...widgetList.querySelectorAll('.widget-card')]
        .map((card) => ({ id: card.dataset.widgetId, size: sizes.get(card.dataset.widgetId) }));
    saveWidgets();
}

function closeWidgetPicks() {
    widgetPicks.hidden = true;
    widgetAdd.setAttribute('aria-expanded', 'false');
}

function renderWidgetPicks() {
    widgetPickList.innerHTML = '';
    WIDGETS.filter((widget) => !homeWidgets.some((entry) => entry.id === widget.id)).forEach((widget) => {
        const pick = document.createElement('button');
        pick.className = 'option-pick widget-pick';
        pick.type = 'button';
        const text = document.createElement('span');
        text.textContent = `${widget.name}  ${widget.face}`;
        pick.append(text);
        pick.addEventListener('click', () => {
            addWidget(widget.id);
            closeWidgetPicks();
        });
        widgetPickList.append(pick);
    });
    // nothing to offer while the catalogue is empty — say so rather than
    // opening a blank box
    if (!widgetPickList.children.length) {
        const none = document.createElement('p');
        none.className = 'pop-say';
        none.textContent = 'nothing to add yet.';
        widgetPickList.append(none);
    }
}

/* the function box keeps itself shut. it opens on the heading and
   stays open until you shut it again — a page load starts it closed,
   since by then you have usually read it once. */
const helpToggle = document.getElementById('helpToggle');

/* the state is a class on the box, not the attribute on the button. the
   attribute is still set, for anything reading the page aloud, but the
   drawer is opened by the class — a rule that hangs off an attribute on
   a sibling is a lot of machinery for a box that opens. */
function setHelpOpen(open) {
    helpBox.classList.toggle('is-open', open);
    helpToggle.setAttribute('aria-expanded', String(open));
}

helpToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setHelpOpen(!helpBox.classList.contains('is-open'));
});

widgetEdit.addEventListener('click', (event) => {
    event.stopPropagation();
    setHomeEditing(!editingHome);
});

widgetAdd.addEventListener('click', (event) => {
    event.stopPropagation();
    const wasOpen = !widgetPicks.hidden;
    closeWidgetPicks();
    if (wasOpen) return;
    renderWidgetPicks();
    widgetPicks.hidden = false;
    widgetAdd.setAttribute('aria-expanded', 'true');
    placeUnder(widgetPicks, widgetAdd);
});
widgetPicks.addEventListener('click', (event) => event.stopPropagation());

/* everything the page does on load, in one place at the very bottom —
   the widgets read the decks and the clips, so nothing may run until
   every section above has declared what it owns. */
startClock();
paintStorage();
binnedEmpty.addEventListener('click', (event) => {
    event.stopPropagation();
    emptyBin();
});

loadBinned();

start();

// last of all: the widgets read the decks, so the decks load first
loadWidgets();
renderWidgets();

/* ---------- 16. notes → cards   (the left bar) ---------- */

/* paste a page of notes — or a photo of one, or a pdf of the whole
   study guide — and get a deck out of it.

   two ways in, and the first asks nothing of anybody: reading is done
   here, off the shapes notes are already written in. anything without a
   shape, and anything that isn't text at all, is what claude is for,
   which needs a key of the reader's own kept in this browser.

   the panel lives in the left bar and moves into a window when the bar
   is too narrow to type in. it moves — there is one of it, so there is
   one of everything in it and nothing to keep in step. */

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
const notesKeyRow = document.getElementById('notesKeyRow');
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

/* the shapes a line can be a card in. each is tried in turn and the
   first that bites wins, so a line with both a dash and a colon is
   split on the dash — the dash is the more deliberate mark. */
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

/* q:/a: pairs first, since those lines also hold colons and would be
   read as term: meaning otherwise */
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

/* notes written in paragraphs. a block with a heading and lines under
   it is one card; where every block is a single line they pair off
   instead, a term and then what it means. */
function readBlocks(text) {
    const blocks = text
        .split(/\n\s*\n/)
        .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
        .filter((lines) => lines.length);

    /* a heading has to look like one, or every paragraph of prose comes
       out as a card whose question is its first line. short, and not
       ending the way a sentence does. */
    const isHeading = (line) => line.length <= 60 && !/[.,;]$/.test(line);
    const deep = blocks.filter((lines) => lines.length > 1 && isHeading(lines[0]));
    // one block on its own is a paragraph, whatever its first line looks
    // like. notes laid out as heading-and-body come in more than one.
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
    const deck = {
        id: `deck-${Date.now()}`,
        name: notesDeckName || 'from my notes',
        cards: []
    };
    decks.push(deck);
    activeDeckId = deck.id;
    keepCards(deck);
});

/* the second, quieter button: read the text as a list here, without
   asking anybody. it is for a glossary you pasted and want turned over
   in one go — for anything else the first button is the one. */
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
        // the data url carries a header this doesn't want; the base64
        // the api takes is whatever follows the comma
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
                // the api takes these four; anything else a browser calls
                // an image is sent as png and read the same way
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
        const count = notesBitsHeld.length;
        notesNote.textContent = `${count} attached — press make flashcards`;
    }
}

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

// or dropped anywhere on the panel
['dragenter', 'dragover'].forEach((name) => {
    notesPanel.addEventListener(name, (event) => {
        event.preventDefault();
        notesPanel.classList.add('is-catching');
    });
});
['dragleave', 'drop'].forEach((name) => {
    notesPanel.addEventListener(name, (event) => {
        event.preventDefault();
        if (name === 'dragleave' && notesPanel.contains(event.relatedTarget)) return;
        notesPanel.classList.remove('is-catching');
    });
});
notesPanel.addEventListener('drop', (event) => {
    if (event.dataTransfer && event.dataTransfer.files.length) holdFiles(event.dataTransfer.files);
});

/* --- reading the words out of a picture, here --- */

/* a photo of a page can be read without anyone's help: tesseract is an
   ocr engine that runs in the browser, vendored beside the page the
   same way the mp3 encoder is. it is loaded the first time a picture
   needs reading and not before — it is several megabytes, and most
   visits never touch it.

   what it gives back is the words, not cards. those go into the box,
   where they are the same as anything else you could have typed. */
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

async function readPicture(bit, say) {
    await loadOcr();
    const worker = await window.Tesseract.createWorker('eng', 1, {
        workerPath: 'ocr/worker.min.js',
        corePath: 'ocr/',
        langPath: 'ocr/',
        gzip: true,
        logger: (step) => {
            if (step.status === 'recognizing text' && say) {
                say(`reading the picture... ${Math.round(step.progress * 100)}%`);
            }
        }
    });
    try {
        const { data } = await worker.recognize(`data:${bit.mediaType};base64,${bit.data}`);
        return (data.text || '').trim();
    } finally {
        worker.terminate();
    }
}

/* --- the model that runs here, with no account and no bill --- */

/* the reader of last resort is not a service: it is a model that comes
   down once and then lives in this browser. no key, no sign-up, and
   nothing you paste ever leaves the machine.

   it is smaller than what a company would run for you, so the cards
   are plainer — but its answer is forced through the same schema the
   api uses, so it can only fill in questions and answers, never
   wander off into prose. it runs in a worker: the arithmetic is heavy
   enough to stiffen the page if it ran on it. */

const LOCAL_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const LOCAL_SIZE = 'about 1.1gb';
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

/* one engine, made once and kept. the download is the browser's to
   remember — it caches the weights itself, so the second time this
   runs there is nothing to fetch and it is ready in a moment. */
async function readyLocal(say) {
    if (localEngine) return localEngine;
    if (localLoading) return localLoading;

    localLoading = (async () => {
        const webllm = await import('./llm/web-llm.js');
        const worker = new Worker('llm-worker.js', { type: 'module' });
        const engine = await webllm.CreateWebWorkerMLCEngine(worker, LOCAL_MODEL, {
            initProgressCallback: (report) => {
                if (!say) return;
                // the first run is a download; after that it is just
                // the weights being put on the gpu, which is quick
                const percent = Math.round((report.progress || 0) * 100);
                say(percent >= 100 ? 'getting it ready...' : `getting the reader — ${percent}% of ${LOCAL_SIZE}`);
            }
        });
        localEngine = engine;
        return engine;
    })();

    try {
        return await localLoading;
    } finally {
        localLoading = null;
    }
}

/* the brief the small model gets. it is shorter and firmer than the
   one the api gets — a model this size follows a short list of rules
   further than a long argument. */
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
        const where = pieces.length > 1 ? ` · part ${index + 1} of ${pieces.length}` : '';
        if (say) say(`reading${where}...`);
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
        mergeCards(gathered, (parsed.cards || [])
            .map((card) => ({ question: tidy(card.question), answer: tidy(card.answer) }))
            .filter((card) => card.question && card.answer));
        if (!notesDeckName && parsed.deck_name) notesDeckName = tidy(parsed.deck_name);
        if (onCards) onCards(gathered, where);
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
    // without a key the only reading that can happen is the reading
    // done here, so the button says what it will actually do
    notesRead.hidden = !key;
}

notesKeyToggle.addEventListener('click', () => {
    const open = notesKeyRow.hidden;
    notesKeyRow.hidden = !open;
    notesKeyToggle.setAttribute('aria-expanded', String(open));
    if (open) notesKey.focus();
});

notesKeySave.addEventListener('click', () => {
    const typed = notesKey.value.trim();
    if (!typed) return;
    try {
        window.localStorage.setItem(KEY_STORE, typed);
    } catch (error) {
        notesNote.textContent = "this browser won't keep it";
        return;
    }
    notesKey.value = '';
    notesKeyRow.hidden = true;
    notesKeyToggle.setAttribute('aria-expanded', 'false');
    paintKeyState();
    notesNote.textContent = 'key saved';
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

/* the shape the answer has to come back in. asking for json by saying
   "give me json" is a request; this is the api being told the schema,
   so what comes back parses or the call fails. */
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

/* the brief. the first version of this asked for "one card per idea"
   and got back a card — a whole page summarised into one. it says now,
   at length, that the work is to cover the material rather than to sum
   it up, because that is the thing a model will otherwise do. */
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

/* long notes go up in pieces. a model asked for forty cards in one
   breath starts to hurry towards the end of them; a piece at a time
   keeps the whole of it read at the same care, and the pieces are cut
   at blank lines so nothing is split mid-thought. */
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

/* the answer is streamed. a long deck takes a while to write and a
   plain request would be sat on until the last card was done — this
   way the count climbs while it works, and a slow answer can't run
   into a timeout on the way. */
async function askClaude(text, bits, onProgress) {
    const key = savedKey();
    if (!key) throw new Error('no key saved');

    const content = [];
    // documents and pictures before the words, which is the order the
    // api reads them best in
    bits.forEach((bit) => {
        if (bit.kind === 'pdf') {
            content.push({
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: bit.data }
            });
        } else {
            content.push({
                type: 'image',
                source: { type: 'base64', media_type: bit.mediaType, data: bit.data }
            });
        }
    });
    content.push({
        type: 'text',
        text: text || 'make cards from everything attached.'
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            // the api refuses a call straight from a page without this
            'anthropic-dangerous-direct-browser-access': 'true'
        },
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

    if (!response.ok) {
        let said = `${response.status}`;
        try {
            const body = await response.json();
            if (body.error && body.error.message) said = body.error.message;
        } catch (error) {
            // the status on its own will have to do
        }
        throw new Error(said);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let said = '';
    let stopped = '';

    // server-sent events: blocks separated by a blank line, each a few
    // lines of which only the data one matters here
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
                    // the cards are counted as they arrive, off the one
                    // word that starts each of them
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
        cards: (parsed.cards || [])
            .map((card) => ({ question: tidy(card.question), answer: tidy(card.answer) }))
            .filter((card) => card.question && card.answer)
    };
}

function setNotesBusy(busy) {
    notesBusy = busy;
    notesGo.disabled = busy;
    notesRead.disabled = busy;
    notesAttach.disabled = busy;
    notesGo.textContent = busy ? 'reading...' : 'make flashcards';
}

/* the one button. it takes whatever is in the panel — words, photos, a
   pdf, any mix of them — and comes back with cards.

   every photo and every pdf is read on its own rather than all of them
   in one go: a page of notes deserves the whole of the model's
   attention, and one call holding six photos gives each a sixth of it.
   long text is cut into pieces for the same reason. what comes back is
   merged and deduped by question. */
async function makeCards() {
    if (notesBusy) return;
    const text = notesInput.value.trim();
    if (!text && !notesBitsHeld.length) {
        notesNote.textContent = 'paste some notes, or drop a photo of them';
        return;
    }

    /* with nobody's help. the pictures are read here first — the words
       out of them go in the box beside whatever was typed, where they
       can be corrected — and then the model that lives in this browser
       makes the cards. no key, no account, nothing leaves the machine.
       where there is no gpu to run it on, the list reader is what is
       left, and it says so. */
    if (!savedKey()) {
        setNotesBusy(true);
        notesDeckName = '';
        try {
            let gathered = text;
            for (let index = 0; index < notesBitsHeld.length; index += 1) {
                const bit = notesBitsHeld[index];
                if (bit.kind === 'pdf') {
                    notesNote.textContent = 'a pdf is more than this can read on its own — see below';
                    continue;
                }
                const which = notesBitsHeld.length > 1 ? ` (${index + 1} of ${notesBitsHeld.length})` : '';
                notesNote.textContent = `reading the picture${which}...`;
                const said = await readPicture(bit, (how) => {
                    notesNote.textContent = how + which;
                });
                if (said) gathered += (gathered ? '\n\n' : '') + said;
            }
            if (gathered !== text) {
                notesInput.value = gathered;
                clearBits();
            }

            if (!gathered.trim()) {
                renderFound([], 'nothing readable in there');
            } else if (await gpuThere()) {
                const cards = await askLocal(
                    gathered,
                    (sofar, where) => renderFound([...sofar], `${sofar.length} cards${where}...`),
                    (how) => { notesNote.textContent = how; }
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
            // the weights want about a gigabyte of the browser's own
            // room; when there is none, say that rather than the raw
            // word the browser throws
            notesNote.textContent = /quota/i.test(error.name + error.message)
                ? 'no room in this browser for the reader — clear some space and try again'
                : `couldn't read it — ${error.message}`;
        }
        setNotesBusy(false);
        return;
    }

    setNotesBusy(true);
    const gathered = [];
    notesDeckName = '';

    /* one run per thing to look at: each picture, each pdf, then the
       words in pieces. the words ride along with the first picture when
       there is one, since they are usually about it. */
    const runs = [];
    notesBitsHeld.forEach((bit, index) => {
        runs.push({
            bits: [bit],
            text: index === 0 ? text : '',
            said: bit.kind === 'pdf' ? 'the pdf' : `photo ${index + 1}`
        });
    });
    if (!notesBitsHeld.length && text) {
        const pieces = cutIntoPieces(text);
        pieces.forEach((piece, index) => {
            runs.push({ bits: [], text: piece, said: pieces.length > 1 ? `part ${index + 1}` : '' });
        });
    }

    try {
        for (let index = 0; index < runs.length; index += 1) {
            const run = runs[index];
            const where = runs.length > 1 ? ` · ${run.said || index + 1} of ${runs.length}` : '';
            notesNote.textContent = `reading${where}...`;
            const answer = await askClaude(run.text, run.bits, (count) => {
                notesNote.textContent = `${gathered.length + count} cards${where}...`;
            });
            if (!notesDeckName) notesDeckName = answer.deckName;
            mergeCards(gathered, answer.cards);
            renderFound(gathered, `${gathered.length} cards${where}...`);
        }

        renderFound(gathered, gathered.length
            ? `${gathered.length} cards — drop any you don't want, then keep them`
            : 'nothing in there worth a card');
    } catch (error) {
        notesNote.textContent = `couldn't read it — ${error.message}`;
    }
    setNotesBusy(false);
}

notesGo.addEventListener('click', makeCards);

/* --- the panel, opened wide --- */

/* it moves rather than being copied: the window holds an empty slot,
   and the panel goes in and comes back out. */
function openNotesWide() {
    if (notesScreen.contains(notesPanel)) {
        showScreen(homeScreen);
        return;
    }
    notesSlot.append(notesPanel);
    showScreen(notesScreen);
    notesInput.focus();
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
