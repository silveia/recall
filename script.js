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
const scratchPanel = document.getElementById('scratchPanel');

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

/* ---------- 2. state ---------- */

const sections = [
    { id: 'cards', name: 'cards' },
    { id: 'scratch', name: 'scratch' }
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
let lastDeleted = null;
let draggedDeckId = null;
let headingSpin = 0;

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
    scratchPanel.hidden = activeSectionId !== 'scratch';

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
    questionInput.value = card.question;
    answerInput.value = card.answer;
    cardSubmitButton.textContent = 'save changes';
    cardFormNote.textContent = '';
    showScreen(makerScreen);
    questionInput.focus();
}

function resetCardForm() {
    editingCardIndex = null;
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
    if (availableCards.length === 0) availableCards = cards;

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
    if (lastDeleted.type === 'deck') {
        decks.splice(lastDeleted.index, 0, lastDeleted.item);
    } else {
        const deck = decks.find((item) => item.id === lastDeleted.deckId);
        if (deck) deck.cards.splice(lastDeleted.index, 0, lastDeleted.item);
    }
    renderDecks();
    if (!makerScreen.hidden) renderCards();
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
    if (editingCardIndex === null) activeDeck().cards.push(card);
    else activeDeck().cards[editingCardIndex] = card;

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
