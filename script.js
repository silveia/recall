const homeButton = document.getElementById('homeButton');
const homeScreen = document.getElementById('homeScreen');
const makerScreen = document.getElementById('makerScreen');
const studyScreen = document.getElementById('studyScreen');
const cardForm = document.getElementById('cardForm');
const questionInput = document.getElementById('questionInput');
const answerInput = document.getElementById('answerInput');
const cardList = document.getElementById('cardList');
const cardSubmitButton = document.getElementById('cardSubmitButton');
const studyQuestion = document.getElementById('studyQuestion');
const answerOptions = document.getElementById('answerOptions');
const studyFeedback = document.getElementById('studyFeedback');
const deckForm = document.getElementById('deckForm');
const deckNameInput = document.getElementById('deckNameInput');
const deckList = document.getElementById('deckList');
const contextMenu = document.getElementById('contextMenu');

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
let activeDeckId = 'starting-deck';
let recentQuestions = [];
let currentCard;
let waitingForContinue = false;
let editingCardIndex = null;
let lastDeleted = null;

function activeDeck() {
    return decks.find((deck) => deck.id === activeDeckId) || decks[0];
}

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
            decks = parsedDecks;
            if (decks.some((deck) => deck.id === savedActiveDeck)) activeDeckId = savedActiveDeck;
        }
    } catch (error) {
        window.localStorage.removeItem('flashcard-decks');
        window.localStorage.removeItem('flashcard-active-deck');
    }
}

function renderDecks() {
    deckList.innerHTML = '';
    decks.forEach((deck, index) => {
        const row = document.createElement('div');
        row.className = `deck-row${deck.id === activeDeckId ? ' active-deck' : ''}`;
        row.dataset.deckId = deck.id;

        const selectButton = document.createElement('button');
        selectButton.className = 'deck-select';
        selectButton.type = 'button';
        selectButton.textContent = deck.name;
        selectButton.addEventListener('click', () => {
            activeDeckId = deck.id;
            renderDecks();
            saveDecks();
        });

        const moveUpButton = document.createElement('button');
        moveUpButton.className = 'deck-control';
        moveUpButton.type = 'button';
        moveUpButton.textContent = 'up';
        moveUpButton.disabled = index === 0;
        moveUpButton.addEventListener('click', () => moveDeck(index, -1));

        const moveDownButton = document.createElement('button');
        moveDownButton.className = 'deck-control';
        moveDownButton.type = 'button';
        moveDownButton.textContent = 'down';
        moveDownButton.disabled = index === decks.length - 1;
        moveDownButton.addEventListener('click', () => moveDeck(index, 1));

        row.append(selectButton, moveUpButton, moveDownButton);
        deckList.appendChild(row);
    });
}

function moveDeck(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= decks.length) return;
    [decks[index], decks[newIndex]] = [decks[newIndex], decks[index]];
    renderDecks();
    saveDecks();
}

function beginDeckRename(deck) {
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
        if (event.key === 'Enter') finishRename(true);
        if (event.key === 'Escape') finishRename(false);
    });
    renameInput.addEventListener('blur', () => finishRename(true));
    selectButton.replaceWith(renameInput);
    renameInput.focus();
    renameInput.select();
}

function showScreen(screen) {
    [homeScreen, makerScreen, studyScreen].forEach((item) => {
        item.hidden = item !== screen;
    });
}

function renderCards() {
    const cards = activeDeck().cards;
    cardList.innerHTML = '';
    if (cards.length === 0) {
        cardList.innerHTML = '<li class="empty-message">none</li>';
        return;
    }
    cards.forEach((card, index) => {
        const item = document.createElement('li');
        item.className = 'card-item';
        item.dataset.cardIndex = index;
        const cardText = document.createElement('span');
        cardText.className = 'card-text';
        cardText.textContent = `${card.question} — ${card.answer}`;

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
    showScreen(makerScreen);
    questionInput.focus();
}

function resetCardForm() {
    editingCardIndex = null;
    cardForm.reset();
    cardSubmitButton.textContent = 'add flashcard';
}

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
        studyQuestion.textContent = 'Add some flashcards first.';
        answerOptions.innerHTML = '';
        return;
    }

    const cooldownSize = Math.max(1, Math.floor(cards.length / 2));
    let availableCards = cards.filter((card) => !recentQuestions.includes(card));
    if (availableCards.length === 0) {
        availableCards = cards;
    }
    currentCard = shuffle(availableCards)[0];
    recentQuestions.push(currentCard);
    if (recentQuestions.length > cooldownSize) {
        recentQuestions.shift();
    }
    studyQuestion.textContent = currentCard.question;
    studyFeedback.textContent = '';
    answerOptions.innerHTML = '';

    const wrongAnswers = cards
        .filter((card) => card.answer !== currentCard.answer)
        .map((card) => card.answer);
    const options = shuffle([currentCard.answer, ...wrongAnswers]).slice(0, 4);
    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'answer-button';
        button.type = 'button';
        button.dataset.answer = option;
        button.textContent = `(${index + 1}) ${option}`;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (waitingForContinue) {
                showNextQuestion();
            } else {
                checkAnswer(button, option);
            }
        });
        answerOptions.appendChild(button);
    });
}

function checkAnswer(selectedButton, selectedAnswer) {
    document.querySelectorAll('.answer-button').forEach((button) => {
        if (button.dataset.answer === currentCard.answer) button.classList.add('correct');
    });
    if (selectedAnswer === currentCard.answer) {
        studyFeedback.textContent = 'Correct!';
        showNextQuestion();
    } else {
        selectedButton.classList.add('incorrect');
        studyFeedback.textContent = `The answer is ${currentCard.answer}. Click anywhere to continue.`;
        waitingForContinue = true;
    }
}

function hideContextMenu() {
    contextMenu.hidden = true;
    contextMenu.innerHTML = '';
}

function showContextMenu(event, target) {
    event.preventDefault();
    contextMenu.innerHTML = '';
    contextMenu.hidden = false;
    contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 220)}px`;
    contextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 100)}px`;

    if (target.type === 'deck') {
        const renameButton = document.createElement('button');
        renameButton.className = 'context-action';
        renameButton.type = 'button';
        renameButton.textContent = 'rename';
        renameButton.addEventListener('click', () => {
            beginDeckRename(target.deck);
            hideContextMenu();
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
            lastDeleted = { type: 'card', item: target.deck.cards[target.index], index: target.index, deckId: target.deck.id };
            target.deck.cards.splice(target.index, 1);
            renderCards();
            renderDecks();
            saveDecks();
            hideContextMenu();
        });
        contextMenu.append(editButton, deleteButton);
    }
}

homeButton.addEventListener('click', () => {
    waitingForContinue = false;
    showScreen(homeScreen);
});
document.getElementById('createCardButton').addEventListener('click', () => {
    renderCards();
    showScreen(makerScreen);
});
document.getElementById('randomStudyButton').addEventListener('click', startStudy);
document.addEventListener('contextmenu', (event) => {
    const deckRow = event.target.closest('.deck-row');
    const cardItem = event.target.closest('.card-item');
    if (deckRow) {
        const deck = decks.find((item) => item.id === deckRow.dataset.deckId);
        if (deck) showContextMenu(event, { type: 'deck', deck });
        return;
    }
    if (cardItem) {
        showContextMenu(event, { type: 'card', deck: activeDeck(), index: Number(cardItem.dataset.cardIndex) });
        return;
    }
    showContextMenu(event, { type: 'blank' });
});
contextMenu.addEventListener('contextmenu', (event) => event.preventDefault());
contextMenu.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', hideContextMenu);
document.addEventListener('click', (event) => {
    if (!waitingForContinue || event.target === homeButton) {
        return;
    }
    showNextQuestion();
});
document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && lastDeleted) {
        event.preventDefault();
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
        return;
    }
    if (waitingForContinue) {
        showNextQuestion();
        return;
    }
    const optionNumber = Number(event.key);
    if (optionNumber >= 1 && optionNumber <= 4) {
        const optionButton = answerOptions.querySelectorAll('.answer-button')[optionNumber - 1];
        if (optionButton) optionButton.click();
    }
});
cardForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const card = { question: questionInput.value.trim(), answer: answerInput.value.trim() };
    if (editingCardIndex === null) {
        activeDeck().cards.push(card);
    } else {
        activeDeck().cards[editingCardIndex] = card;
    }
    resetCardForm();
    renderCards();
    renderDecks();
    saveDecks();
    questionInput.focus();
});

deckForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = deckNameInput.value.trim();
    if (!name) return;
    const deck = { id: `deck-${Date.now()}`, name, cards: [] };
    decks.push(deck);
    activeDeckId = deck.id;
    deckForm.reset();
    renderDecks();
    saveDecks();
});

loadDecks();
renderDecks();
