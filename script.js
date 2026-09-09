/* ============================================================
   recall — script.js
   ------------------------------------------------------------
   1. elements
   2. state
   3. storage
   4. sections   (the > menu)
   5. decks      (the smiley menu)
   6. cards      (create screen)
   7. practice   (study screen)
   8. context menu
   9. keyboard
   10. wiring
   11. start
   12. capture, sensing, recording   (the audio section)
         status · sensing box · change detection
         clip storage · mp3 export · clip rows
         recording · level line · capture
   ============================================================ */

/* ---------- 1. elements ---------- */

// screens
const homeScreen = document.getElementById('homeScreen');
const makerScreen = document.getElementById('makerScreen');
const studyScreen = document.getElementById('studyScreen');
const backButtons = document.querySelectorAll('.back-button');

// sections
const headingButton = document.querySelector('.heading-button');
const headingList = document.getElementById('headingList');
const sectionTitle = document.getElementById('sectionTitle');
const quickPanel = document.querySelector('.quick-panel');
const audioPanel = document.getElementById('audioPanel');

// decks
const deckBar = document.querySelector('.deck-bar');
const deckForm = document.getElementById('deckForm');
const deckNameInput = document.getElementById('deckNameInput');
const deckList = document.getElementById('deckList');
const deckToggle = document.getElementById('deckToggle');
const homeSubtitle = document.getElementById('homeSubtitle');

// cards
const cardForm = document.getElementById('cardForm');
const questionInput = document.getElementById('questionInput');
const answerInput = document.getElementById('answerInput');
const cardFormNote = document.getElementById('cardFormNote');
const cardList = document.getElementById('cardList');
const cardSubmitButton = document.getElementById('cardSubmitButton');

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
    { id: 'cards', name: 'cards' },
    { id: 'audio', name: 'audio' }
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

let activeSectionId = 'cards';
let activeDeckId = 'starting-deck';
let recentQuestions = [];
let currentCard;
let waitingForContinue = false;
let editingCardIndex = null;
let editingDeckId = null;
let lastDeleted = null;
let draggedDeckId = null;
let headingSpin = 0;
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

/* ---------- 4. sections ---------- */

function openHeadingMenu() {
    headingList.hidden = false;
    headingButton.setAttribute('aria-expanded', 'true');
    headingSpin += 810;
    headingButton.style.transform = `translateY(-50%) rotate(${headingSpin}deg)`;
}

function closeHeadingMenu() {
    if (headingList.hidden) return;
    headingList.hidden = true;
    headingButton.setAttribute('aria-expanded', 'false');
    headingSpin -= 90;
    headingButton.style.transform = `translateY(-50%) rotate(${headingSpin}deg)`;
}

function isHeadingMenuOpen() {
    return !headingList.hidden;
}

function renderSections() {
    const active = sections.find((section) => section.id === activeSectionId);
    sectionTitle.textContent = active.name;

    // show only the panels belonging to the active section
    deckBar.hidden = activeSectionId !== 'cards';
    quickPanel.hidden = activeSectionId !== 'cards';
    audioPanel.hidden = activeSectionId !== 'audio';
    if (activeSectionId !== 'audio' && recorderReady) stopCapture();

    headingList.innerHTML = '';
    sections.forEach((section) => {
        const row = document.createElement('button');
        row.className = `menu-row${section.id === activeSectionId ? ' active-section' : ''}`;
        row.type = 'button';

        const check = document.createElement('span');
        check.className = 'menu-check';
        check.textContent = section.id === activeSectionId ? '✓' : '';

        const label = document.createElement('span');
        label.textContent = section.name;

        row.append(check, label);
        row.addEventListener('click', () => {
            activeSectionId = section.id;
            window.localStorage.setItem('active-section', activeSectionId);
            renderSections();
            closeHeadingMenu();
        });
        headingList.appendChild(row);
    });
}

/* ---------- 5. decks ---------- */

function openDeckMenu() {
    deckList.hidden = false;
    deckToggle.setAttribute('aria-expanded', 'true');
}

function closeDeckMenu() {
    deckList.hidden = true;
    deckToggle.setAttribute('aria-expanded', 'false');
}

function isDeckMenuOpen() {
    return !deckList.hidden;
}

function updateDeckToggle() {
    const deck = activeDeck();
    homeSubtitle.textContent = `${deck.name} · ${deck.cards.length}`;
    deckToggle.setAttribute('aria-label', `switch deck, currently ${deck.name}`);
}

function moveDeckToIndex(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const [moved] = decks.splice(fromIndex, 1);
    decks.splice(toIndex, 0, moved);
    renderDecks();
    saveDecks();
}

function moveDeck(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= decks.length) return;
    moveDeckToIndex(index, newIndex);
    const handles = deckList.querySelectorAll('.deck-handle');
    if (handles[newIndex]) handles[newIndex].focus();
}

function renderDecks() {
    deckList.innerHTML = '';
    decks.forEach((deck, index) => {
        const row = document.createElement('div');
        row.className = `deck-row${deck.id === activeDeckId ? ' active-deck' : ''}`;
        row.dataset.deckId = deck.id;

        // drag handle
        const handle = document.createElement('button');
        handle.className = 'deck-handle';
        handle.type = 'button';
        handle.setAttribute('aria-label', `reorder ${deck.name}, use arrow keys`);
        handle.innerHTML = '<span></span><span></span><span></span>';
        handle.addEventListener('mousedown', () => { row.draggable = true; });
        handle.addEventListener('touchstart', () => { row.draggable = true; }, { passive: true });
        handle.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveDeck(index, -1);
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveDeck(index, 1);
            }
        });

        // deck name
        const selectButton = document.createElement('button');
        selectButton.className = 'deck-select';
        selectButton.type = 'button';
        selectButton.textContent = deck.name;
        selectButton.addEventListener('click', () => {
            activeDeckId = deck.id;
            renderDecks();
            renderCards();
            saveDecks();
            closeDeckMenu();
            deckToggle.focus();
        });

        // card count
        const count = document.createElement('span');
        count.className = 'deck-count';
        count.textContent = deck.cards.length;

        // drag and drop
        row.addEventListener('dragstart', (event) => {
            draggedDeckId = deck.id;
            row.classList.add('dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', deck.id);
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            row.draggable = false;
            draggedDeckId = null;
            deckList.querySelectorAll('.deck-row').forEach((item) => item.classList.remove('drop-target'));
        });
        row.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (draggedDeckId && draggedDeckId !== deck.id) row.classList.add('drop-target');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
        row.addEventListener('drop', (event) => {
            event.preventDefault();
            row.classList.remove('drop-target');
            if (!draggedDeckId || draggedDeckId === deck.id) return;
            const fromIndex = decks.findIndex((item) => item.id === draggedDeckId);
            moveDeckToIndex(fromIndex, index);
        });

        row.append(handle, selectButton, count);
        deckList.appendChild(row);
    });
    updateDeckToggle();
}

function beginDeckRename(deck) {
    openDeckMenu();
    const row = deckList.querySelector(`[data-deck-id="${deck.id}"]`);
    const selectButton = row && row.querySelector('.deck-select');
    if (!selectButton) return;

    const renameInput = document.createElement('input');
    renameInput.className = 'deck-inline-input';
    renameInput.type = 'text';
    renameInput.value = deck.name;
    renameInput.setAttribute('aria-label', `rename ${deck.name}`);

    let finished = false;
    const finishRename = (save) => {
        if (finished) return;
        finished = true;
        const newName = renameInput.value.trim();
        if (save && newName) deck.name = newName;
        renderDecks();
        saveDecks();
    };

    renameInput.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') finishRename(true);
        if (event.key === 'Escape') finishRename(false);
    });
    renameInput.addEventListener('blur', () => finishRename(true));

    selectButton.replaceWith(renameInput);
    renameInput.focus();
    renameInput.select();
}

/* ---------- 6. cards ---------- */

function showScreen(screen) {
    [homeScreen, makerScreen, studyScreen].forEach((item) => {
        item.hidden = item !== screen;
    });
    closeDeckMenu();
    closeHeadingMenu();
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
    cardSubmitButton.textContent = 'save changes';
    cardFormNote.textContent = '';
    showScreen(makerScreen);
    questionInput.focus();
}

function resetCardForm() {
    editingCardIndex = null;
    editingDeckId = null;
    cardForm.reset();
    cardFormNote.textContent = '';
    cardSubmitButton.textContent = 'add card';
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
        studyQuestion.textContent = 'this deck is empty';
        answerOptions.innerHTML = '';
        studyFeedback.textContent = 'go back and add a few cards first';
        return;
    }

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
    answerOptions.innerHTML = '';

    // three wrong answers borrowed from other cards in the deck
    const wrongAnswers = [...new Set(cards.map((card) => card.answer))]
        .filter((answer) => answer !== currentCard.answer);
    const options = shuffle([currentCard.answer, ...shuffle(wrongAnswers).slice(0, 3)]);

    options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-button';
        button.type = 'button';
        button.dataset.answer = option;
        button.textContent = option;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (waitingForContinue) showNextQuestion();
            else checkAnswer(button, option);
        });
        answerOptions.appendChild(button);
    });
}

function checkAnswer(selectedButton, selectedAnswer) {
    document.querySelectorAll('.answer-button').forEach((button) => {
        if (button.dataset.answer === currentCard.answer) button.classList.add('correct');
    });

    if (selectedAnswer === currentCard.answer) {
        studyFeedback.textContent = 'yes';
        document.querySelectorAll('.answer-button').forEach((button) => {
            button.disabled = true;
        });
        setTimeout(showNextQuestion, 450);
    } else {
        selectedButton.classList.add('incorrect');
        studyFeedback.textContent = `answer: ${currentCard.answer}`;
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
            lastDeleted = { type: 'deck', item: target.deck, index: deletedIndex };
            decks.splice(deletedIndex, 1);
            if (target.deck.id === activeDeckId) activeDeckId = decks[Math.max(0, deletedIndex - 1)].id;
            renderDecks();
            renderCards();
            saveDecks();
            hideContextMenu();
        });

        contextMenu.append(renameButton, deleteDeckButton);
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
            lastDeleted = {
                type: 'card',
                item: target.deck.cards[target.index],
                index: target.index,
                deckId: target.deck.id
            };
            target.deck.cards.splice(target.index, 1);
            renderCards();
            renderDecks();
            saveDecks();
            hideContextMenu();
        });

        contextMenu.append(editButton, deleteButton);
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

function undoLastDelete() {
    if (!lastDeleted) return;
    if (lastDeleted.type === 'deck') {
        decks.splice(lastDeleted.index, 0, lastDeleted.item);
        activeDeckId = lastDeleted.item.id;
    } else {
        const deck = decks.find((item) => item.id === lastDeleted.deckId);
        if (deck) {
            deck.cards.splice(lastDeleted.index, 0, lastDeleted.item);
            activeDeckId = deck.id;
        }
    }
    renderDecks();
    renderCards();
    saveDecks();
    lastDeleted = null;
}

/* ---------- 10. wiring ---------- */

// sections
headingButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isHeadingMenuOpen()) closeHeadingMenu();
    else openHeadingMenu();
});
headingList.addEventListener('click', (event) => event.stopPropagation());

// decks
deckToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isDeckMenuOpen()) closeDeckMenu();
    else openDeckMenu();
});
deckList.addEventListener('click', (event) => event.stopPropagation());

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

// navigation
backButtons.forEach((button) => {
    button.addEventListener('click', () => {
        waitingForContinue = false;
        showScreen(homeScreen);
    });
});
document.getElementById('createCardButton').addEventListener('click', () => {
    resetCardForm();
    renderCards();
    showScreen(makerScreen);
});
document.getElementById('randomStudyButton').addEventListener('click', startStudy);

// card form
cardForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    if (!question || !answer) {
        cardFormNote.textContent = 'fill in both the question and the answer';
        (question ? answerInput : questionInput).focus();
        return;
    }
    const card = { question, answer };
    if (editingCardIndex === null) {
        activeDeck().cards.push(card);
    } else {
        const deck = decks.find((item) => item.id === editingDeckId) || activeDeck();
        deck.cards[editingCardIndex] = card;
    }

    resetCardForm();
    renderCards();
    renderDecks();
    saveDecks();
    questionInput.focus();
});

// right click
document.addEventListener('contextmenu', (event) => {
    const deckRow = event.target.closest('.deck-row');
    const cardItem = event.target.closest('.card-item');

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
    hideContextMenu();
});
contextMenu.addEventListener('contextmenu', (event) => event.preventDefault());
contextMenu.addEventListener('click', (event) => event.stopPropagation());

// clicking anywhere closes the menus
document.addEventListener('click', () => {
    hideContextMenu();
    closeDeckMenu();
    closeHeadingMenu();
});

// clicking anywhere also advances a wrong answer
document.addEventListener('click', (event) => {
    if (!waitingForContinue || event.target.closest('.back-button')) return;
    showNextQuestion();
});

document.addEventListener('keydown', (event) => {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && lastDeleted) {
        event.preventDefault();
        undoLastDelete();
        return;
    }

    // any other browser or system shortcut is none of our business
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Escape') {
        if (isDeckMenuOpen()) {
            closeDeckMenu();
            deckToggle.focus();
            return;
        }
        if (isHeadingMenuOpen()) {
            closeHeadingMenu();
            headingButton.focus();
            return;
        }
        if (homeScreen.hidden) {
            waitingForContinue = false;
            showScreen(homeScreen);
            return;
        }
    }

    if (waitingForContinue) {
        showNextQuestion();
        return;
    }
    if (studyScreen.hidden) return;

    const quadrant = quadrantForKey(event.code);
    if (quadrant === undefined) return;
    event.preventDefault();
    const optionButton = answerOptions.querySelectorAll('.answer-button')[Number(quadrant)];
    if (optionButton) optionButton.click();
});

/* ---------- 11. start ---------- */

loadDecks();
loadSection();
renderDecks();
renderCards();
renderSections();

/* ---------- 12. capture, sensing, recording ---------- */

const recordToggle = document.getElementById('recordToggle');
const recordStatus = document.getElementById('recordStatus');
const recordingList = document.getElementById('recordingList');
const previewWrap = document.getElementById('previewWrap');
const previewVideo = document.getElementById('previewVideo');
const senseBox = document.getElementById('senseBox');
const senseControls = document.getElementById('senseControls');
const senseReadout = document.getElementById('senseReadout');
const senseToggle = document.getElementById('senseToggle');
const senseReset = document.getElementById('senseReset');

const SENSE_KEYS = ['left', 'bottom', 'width', 'height', 'threshold'];
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

const DEFAULT_SENSE = { left: 4, bottom: 4, width: 25, height: 4, threshold: 2 };
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
    // keep the box inside the frame
    senseSettings.width = Math.min(senseSettings.width, 100 - senseSettings.left);
    senseSettings.height = Math.min(senseSettings.height, 100 - senseSettings.bottom);

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

/* --- dragging the sensing box --- */

let dragMode = null;
let dragStart = null;

function boxPointerMode(event, box) {
    const edge = 12;
    const nearRight = event.clientX > box.right - edge;
    const nearTop = event.clientY < box.top + edge;
    if (nearRight && nearTop) return 'resize-both';
    if (nearRight) return 'resize-x';
    if (nearTop) return 'resize-y';
    return 'move';
}

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

    if (dragMode === 'move') {
        senseSettings.left = clamp(dragStart.left + dx, 0, 100 - senseSettings.width);
        senseSettings.bottom = clamp(dragStart.bottom - dy, 0, 100 - senseSettings.height);
    }
    if (dragMode === 'resize-x' || dragMode === 'resize-both') {
        senseSettings.width = clamp(dragStart.width + dx, 2, 100 - senseSettings.left);
    }
    if (dragMode === 'resize-y' || dragMode === 'resize-both') {
        senseSettings.height = clamp(dragStart.height - dy, 2, 100 - senseSettings.bottom);
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

    senseReadout.textContent = `change ${changeAmount.toFixed(1)} · triggers ${triggerCount}`;
}

function refreshEmptyMessage() {
    const existing = recordingList.querySelector('.empty-message');
    if (existing) existing.remove();
}

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

        stored.sort((a, b) => a.number - b.number);
        stored.forEach((record) => {
            if (record.number > clipCount) clipCount = record.number;
            addRecording(record, true);
        });
    } catch (error) {
        // no stored clips, or storage unavailable
    }
    refreshEmptyMessage();
}

/* --- webm/opus -> mp3, only when a clip is downloaded --- */

/* decoding has to happen here (a worker has no AudioContext), but the
   encoding is the slow part, so that goes to mp3-worker.js and the page
   stays responsive while it runs. */
async function blobToMp3(blob) {
    const context = new AudioContext();
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    context.close();

    // copies, because the worker takes ownership of whatever it is handed
    const left = new Float32Array(audio.getChannelData(0));
    const right = audio.numberOfChannels > 1
        ? new Float32Array(audio.getChannelData(1))
        : null;

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

function addRecording(record, alreadySaved) {
    const item = document.createElement('li');
    item.className = 'recording-item';

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
        player.currentTime = 0;
        fill.style.width = '0%';
        label.textContent = `00:00 / ${record.duration}`;
    });

    // progress bar, scrubbable
    const track = document.createElement('div');
    track.className = 'clip-track';
    const fill = document.createElement('div');
    fill.className = 'clip-fill';

    const trackText = document.createElement('span');
    trackText.className = 'clip-text';
    trackText.textContent = record.name || `clip ${record.number}`;

    track.append(fill, trackText);

    const totalSeconds = record.durationMs ? record.durationMs / 1000 : 0;

    const isEditing = () => trackText.classList.contains('is-editing');

    const seekTo = (clientX) => {
        if (isEditing() || !totalSeconds) return;
        loadPlayer();
        const box = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
        player.currentTime = ratio * totalSeconds;
        fill.style.width = `${ratio * 100}%`;
        label.textContent = `${formatDuration(player.currentTime * 1000)} / ${record.duration}`;
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
        fill.style.width = `${Math.min(100, (player.currentTime / totalSeconds) * 100)}%`;
        label.textContent = `${formatDuration(player.currentTime * 1000)} / ${record.duration}`;
    });

    // label with duration
    const label = document.createElement('span');
    label.className = 'clip-label';
    label.textContent = `00:00 / ${record.duration}`;

    const download = document.createElement('button');
    download.className = 'clip-download';
    download.type = 'button';
    download.setAttribute('aria-label', `download clip ${record.number}`);
    download.textContent = '↓';
    download.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (download.disabled) return;
        download.disabled = true;
        download.textContent = '·';
        try {
            const mp3 = await blobToMp3(record.blob);
            const href = URL.createObjectURL(mp3);
            const a = document.createElement('a');
            a.href = href;
            a.download = `${record.name || `clip-${record.number}`}.mp3`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(href), 10000);
        } catch (error) {
            console.error('mp3 export failed', error);
            setRecordStatus(`mp3 failed — ${error.message}`, true);
        }
        download.disabled = false;
        download.textContent = '↓';
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
        item.remove();
        deleteClip(record.id);
        refreshEmptyMessage();
    });

    item.append(playButton, track, label, download, discard, player);
    recordingList.prepend(item);
    refreshEmptyMessage();

    if (!alreadySaved) saveClip(record);
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
        const liveLabel = document.getElementById('liveLabel');
        if (liveLabel) liveLabel.textContent = `${clipCount + 1} · ${elapsed}`;
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
    analyser.fftSize = 1024;
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
    const liveLabel = document.getElementById('liveLabel');
    if (liveLabel) liveLabel.textContent = '';
}

function hideLiveRow() {
    const liveLabel = document.getElementById('liveLabel');
    if (liveLabel) liveLabel.textContent = '';
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
    if (activeStream) activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
    previewVideo.srcObject = null;
    previousSample = null;
    previewWrap.hidden = true;
    senseReadout.hidden = true;
    senseReadout.textContent = 'change 0.0 · triggers 0';
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
    refreshEmptyMessage();
    senseReadout.hidden = false;
    triggerCount = 0;
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
recorderReady = true;
loadStoredClips();
senseToggle.hidden = true;
