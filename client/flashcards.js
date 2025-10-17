// Flashcard System - Handles decks, flashcards, and study sessions

// DOM Elements - will be initialized after DOM loads
let createDeckBtn, studyDueBtn, deckList, createDeckModal, createDeckForm;
let deckModal, flashcardModal, flashcardForm, studyModal;
let totalDecksCount, totalCardsCount, dueCardsCount;

// State
let decks = [];
let currentDeck = null;
let studySession = {
    cards: [],
    currentIndex: 0,
    showingBack: false
};

// Initialize flashcard system
function initFlashcardSystem() {
    // Initialize DOM elements
    createDeckBtn = document.getElementById('create-deck-btn');
    studyDueBtn = document.getElementById('study-due-btn');
    deckList = document.getElementById('deck-list');
    createDeckModal = document.getElementById('create-deck-modal');
    createDeckForm = document.getElementById('create-deck-form');
    deckModal = document.getElementById('deck-modal');
    flashcardModal = document.getElementById('flashcard-modal');
    flashcardForm = document.getElementById('flashcard-form');
    studyModal = document.getElementById('study-modal');
    totalDecksCount = document.getElementById('total-decks-count');
    totalCardsCount = document.getElementById('total-cards-count');
    dueCardsCount = document.getElementById('due-cards-count');
    
    console.log('DOM elements initialized:', {
        createDeckBtn: !!createDeckBtn,
        deckList: !!deckList,
        totalDecksCount: !!totalDecksCount
    });
    
    setupFlashcardEventListeners();
}

// Event Listeners
function setupFlashcardEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Flashcard controls
    if (createDeckBtn) {
        createDeckBtn.addEventListener('click', openCreateDeckModal);
    }
    if (studyDueBtn) {
        studyDueBtn.addEventListener('click', () => {
            // Find first deck with due cards and start study session
            const deckWithDue = decks.find(deck => deck.due_count > 0);
            if (deckWithDue) {
                startStudySession(deckWithDue.id);
            }
        });
    }
    
    // Deck creation modal
    if (createDeckForm) {
        createDeckForm.addEventListener('submit', handleCreateDeck);
    }
    const closeCreateDeckModalBtn = document.getElementById('close-create-deck-modal');
    const cancelCreateDeckBtn = document.getElementById('cancel-create-deck');

    if (closeCreateDeckModalBtn) {
        closeCreateDeckModalBtn.addEventListener('click', closeCreateDeckModal);
    }
    if (cancelCreateDeckBtn) {
        cancelCreateDeckBtn.addEventListener('click', closeCreateDeckModal);
    }
    if (createDeckModal) {
        createDeckModal.addEventListener('click', (e) => {
            if (e.target === createDeckModal) closeCreateDeckModal();
        });
    }
    
    // Deck modal controls
    const closeDeckModalBtn = document.getElementById('close-deck-modal');
    const addCardBtn = document.getElementById('add-card-btn');
    const studyDeckBtn = document.getElementById('study-deck-btn');
    if (closeDeckModalBtn) {
        closeDeckModalBtn.addEventListener('click', closeDeckModal);
    }
    if (addCardBtn) {
        addCardBtn.addEventListener('click', () => {
            if (currentDeck) openFlashcardModal(currentDeck.id);
        });
    }
    if (studyDeckBtn) {
        studyDeckBtn.addEventListener('click', () => {
            if (currentDeck) startStudySession(currentDeck.id);
        });
    }
    if (deckModal) {
        deckModal.addEventListener('click', (e) => {
            if (e.target === deckModal) closeDeckModal();
        });
    }
    
    // Flashcard modal controls
    if (flashcardForm) {
        flashcardForm.addEventListener('submit', handleCreateFlashcard);
    }
    const closeFlashcardModalBtn = document.getElementById('close-flashcard-modal');
    const cancelFlashcardBtn = document.getElementById('cancel-flashcard');
    if (closeFlashcardModalBtn) {
        closeFlashcardModalBtn.addEventListener('click', closeFlashcardModal);
    }
    if (cancelFlashcardBtn) {
        cancelFlashcardBtn.addEventListener('click', closeFlashcardModal);
    }
    if (flashcardModal) {
        flashcardModal.addEventListener('click', (e) => {
            if (e.target === flashcardModal) closeFlashcardModal();
        });
    }
    
    // Study modal controls
    const closeStudyModalBtn = document.getElementById('close-study-modal');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    if (closeStudyModalBtn) {
        closeStudyModalBtn.addEventListener('click', closeStudyModal);
    }
    if (showAnswerBtn) {
        showAnswerBtn.addEventListener('click', showAnswer);
    }
    
    // Rating buttons
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const quality = parseInt(e.target.dataset.quality);
            rateCard(quality);
        });
    });
    
    if (studyModal) {
        studyModal.addEventListener('click', (e) => {
            if (e.target === studyModal) closeStudyModal();
        });
    }
}

// Flashcard API Functions
async function loadFlashcardData() {
    try {
        await Promise.all([
            loadDecks(),
            loadStudyStats()
        ]);
    } catch (error) {
        console.error('Failed to load flashcard data:', error);
    }
}

async function loadDecks() {
    try {
        console.log('Loading decks...');
        decks = await apiCall('/decks');
        console.log('Decks loaded:', decks);
        renderDecks();
    } catch (error) {
        console.error('Failed to load decks:', error);
        showError('Failed to load decks');
    }
}

async function loadStudyStats() {
    try {
        const stats = await apiCall('/study/stats');
        updateStudyStats(stats);
    } catch (error) {
        console.error('Failed to load study stats:', error);
    }
}

async function createDeck(deckData) {
    try {
        const newDeck = await apiCall('/decks', {
            method: 'POST',
            body: JSON.stringify(deckData)
        });
        decks.unshift(newDeck);
        renderDecks();
        loadStudyStats();
        return newDeck;
    } catch (error) {
        console.error('Failed to create deck:', error);
        throw error;
    }
}

async function loadDeck(deckId) {
    try {
        const deck = await apiCall(`/decks/${deckId}`);
        currentDeck = deck;
        return deck;
    } catch (error) {
        console.error('Failed to load deck:', error);
        throw error;
    }
}

async function createFlashcard(cardData) {
    try {
        const newCard = await apiCall('/flashcards', {
            method: 'POST',
            body: JSON.stringify(cardData)
        });
        if (currentDeck && currentDeck.id === cardData.deck_id) {
            currentDeck.flashcards.push(newCard);
            renderFlashcards();
        }
        loadStudyStats();
        return newCard;
    } catch (error) {
        console.error('Failed to create flashcard:', error);
        throw error;
    }
}

async function updateFlashcard(cardId, updates) {
    try {
        const updatedCard = await apiCall(`/flashcards/${cardId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        if (currentDeck) {
            const index = currentDeck.flashcards.findIndex(card => card.id === cardId);
            if (index !== -1) {
                currentDeck.flashcards[index] = updatedCard;
                renderFlashcards();
            }
        }
        return updatedCard;
    } catch (error) {
        console.error('Failed to update flashcard:', error);
        throw error;
    }
}

async function deleteFlashcard(cardId) {
    try {
        await apiCall(`/flashcards/${cardId}`, { method: 'DELETE' });
        if (currentDeck) {
            currentDeck.flashcards = currentDeck.flashcards.filter(card => card.id !== cardId);
            renderFlashcards();
        }
        loadStudyStats();
    } catch (error) {
        console.error('Failed to delete flashcard:', error);
        throw error;
    }
}

async function deleteDeck(deckId) {
    try {
        await apiCall(`/decks/${deckId}`, { method: 'DELETE' });
        decks = decks.filter(deck => deck.id !== deckId);
        renderDecks();
        loadStudyStats();
    } catch (error) {
        console.error('Failed to delete deck:', error);
        throw error;
    }
}

async function recordStudySession(flashcardId, quality, responseTime = null) {
    try {
        const result = await apiCall('/study', {
            method: 'POST',
            body: JSON.stringify({
                flashcard_id: flashcardId,
                quality: quality,
                response_time: responseTime
            })
        });
        return result;
    } catch (error) {
        console.error('Failed to record study session:', error);
        throw error;
    }
}

// Rendering Functions
function renderDecks() {
    if (decks.length === 0) {
        deckList.innerHTML = '';
        const deckEmptyState = document.getElementById('deck-empty-state');
        if (deckEmptyState) deckEmptyState.classList.remove('hidden');
        return;
    }
    
    const deckEmptyState = document.getElementById('deck-empty-state');
    if (deckEmptyState) deckEmptyState.classList.add('hidden');
    deckList.innerHTML = decks.map(deck => `
        <div class="deck-card" onclick="openDeckModal(${deck.id})">
            <div class="deck-card-header">
                <h3 class="deck-title">${escapeHtml(deck.name)}</h3>
            </div>
            <div class="deck-stats">
                <span>${deck.card_count} cards</span>
                <span>${deck.due_count} due</span>
            </div>
            ${deck.description ? `<div class="deck-description">${escapeHtml(deck.description)}</div>` : ''}
            <div class="deck-actions">
                ${deck.due_count > 0 ? `<button class="btn btn-accent btn-small" onclick="event.stopPropagation(); startStudySession(${deck.id})">📚 Study</button>` : ''}
                <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); handleDeleteDeck(${deck.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function renderFlashcards() {
    const flashcardList = document.getElementById('flashcard-list');
    if (!flashcardList) return;
    
    if (!currentDeck || !currentDeck.flashcards || currentDeck.flashcards.length === 0) {
        flashcardList.innerHTML = '<p class="empty-message">No cards in this deck yet. Add some cards to get started!</p>';
        return;
    }
    
    flashcardList.innerHTML = currentDeck.flashcards.map(card => `
        <div class="flashcard-item">
            <div class="flashcard-content">
                <div class="card-side-preview">
                    <div class="card-side-label">Front:</div>
                    <div>${escapeHtml(card.front)}</div>
                </div>
                <div class="card-side-preview">
                    <div class="card-side-label">Back:</div>
                    <div>${escapeHtml(card.back)}</div>
                </div>
            </div>
            <div class="flashcard-actions">
                <button class="btn btn-secondary btn-small" onclick="editFlashcard(${card.id})">✏️ Edit</button>
                <button class="btn btn-danger btn-small" onclick="handleDeleteFlashcard(${card.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function updateStudyStats(stats) {
    if (totalDecksCount) totalDecksCount.textContent = stats.total_decks;
    if (totalCardsCount) totalCardsCount.textContent = stats.total_cards;
    if (dueCardsCount) dueCardsCount.textContent = stats.total_due;
    
    // Enable/disable study button
    if (studyDueBtn) {
        studyDueBtn.disabled = stats.total_due === 0;
        studyDueBtn.textContent = stats.total_due > 0 ? `📚 Study ${stats.total_due} Cards` : '📚 No Cards Due';
    }
}

// Modal Functions
function openCreateDeckModal() {
    if (createDeckModal) {
        createDeckModal.classList.remove('hidden');
        const deckNameInput = document.getElementById('deck-name');
        if (deckNameInput) deckNameInput.focus();
    }
}

function closeCreateDeckModal() {
    if (createDeckModal) {
        createDeckModal.classList.add('hidden');
        if (createDeckForm) createDeckForm.reset();
        hideError();
    }
}

async function openDeckModal(deckId) {
    try {
        const deck = await loadDeck(deckId);
        const deckModalTitle = document.getElementById('deck-modal-title');
        const deckCardCount = document.getElementById('deck-card-count');
        const deckDueCount = document.getElementById('deck-due-count');
        
        if (deckModalTitle) deckModalTitle.textContent = deck.name;
        if (deckCardCount) deckCardCount.textContent = `${deck.card_count} cards`;
        if (deckDueCount) deckDueCount.textContent = `${deck.due_count} due`;
        
        const studyBtn = document.getElementById('study-deck-btn');
        if (studyBtn) {
            studyBtn.disabled = deck.due_count === 0;
            studyBtn.textContent = deck.due_count > 0 ? `📚 Study ${deck.due_count} Cards` : '📚 No Cards Due';
        }
        
        renderFlashcards();
        if (deckModal) deckModal.classList.remove('hidden');
    } catch (error) {
        showError('Failed to load deck');
    }
}

function closeDeckModal() {
    if (deckModal) deckModal.classList.add('hidden');
    currentDeck = null;
}

function openFlashcardModal(deckId, cardId = null) {
    const isEdit = cardId !== null;
    const flashcardModalTitle = document.getElementById('flashcard-modal-title');
    const flashcardDeckId = document.getElementById('flashcard-deck-id');
    
    if (flashcardModalTitle) {
        flashcardModalTitle.textContent = isEdit ? 'Edit Card' : 'Add New Card';
    }
    if (flashcardDeckId) {
        flashcardDeckId.value = deckId;
    }
    
    if (isEdit && currentDeck) {
        const card = currentDeck.flashcards.find(c => c.id === cardId);
        if (card) {
            const flashcardId = document.getElementById('flashcard-id');
            const cardFront = document.getElementById('card-front');
            const cardBack = document.getElementById('card-back');
            
            if (flashcardId) flashcardId.value = card.id;
            if (cardFront) cardFront.value = card.front;
            if (cardBack) cardBack.value = card.back;
        }
    } else {
        if (flashcardForm) flashcardForm.reset();
        if (flashcardDeckId) flashcardDeckId.value = deckId;
    }
    
    if (flashcardModal) {
        flashcardModal.classList.remove('hidden');
        const cardFront = document.getElementById('card-front');
        if (cardFront) cardFront.focus();
    }
}

function closeFlashcardModal() {
    if (flashcardModal) {
        flashcardModal.classList.add('hidden');
        if (flashcardForm) flashcardForm.reset();
        hideError();
    }
}

// Study Session Functions
async function startStudySession(deckId) {
    try {
        const dueCards = await apiCall(`/decks/${deckId}/due`);
        if (dueCards.length === 0) {
            showError('No cards due for review in this deck');
            return;
        }
        
        studySession.cards = dueCards;
        studySession.currentIndex = 0;
        studySession.showingBack = false;
        
        showStudyCard();
        if (studyModal) studyModal.classList.remove('hidden');
    } catch (error) {
        showError('Failed to start study session');
    }
}

function showStudyCard() {
    const card = studySession.cards[studySession.currentIndex];
    if (!card) return;
    
    const studyProgressText = document.getElementById('study-progress-text');
    const studyCardFront = document.getElementById('study-card-front');
    const studyCardBack = document.getElementById('study-card-back');
    
    if (studyProgressText) {
        studyProgressText.textContent = `Card ${studySession.currentIndex + 1} of ${studySession.cards.length}`;
    }
    if (studyCardFront) studyCardFront.textContent = card.front;
    if (studyCardBack) studyCardBack.textContent = card.back;
    
    // Show front, hide back
    const frontSide = document.querySelector('.card-side.front');
    const backSide = document.querySelector('.card-side.back');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const ratingControls = document.getElementById('rating-controls');
    
    if (frontSide) frontSide.classList.remove('hidden');
    if (backSide) backSide.classList.add('hidden');
    if (showAnswerBtn) showAnswerBtn.classList.remove('hidden');
    if (ratingControls) ratingControls.classList.add('hidden');
    
    studySession.showingBack = false;
}

function showAnswer() {
    const frontSide = document.querySelector('.card-side.front');
    const backSide = document.querySelector('.card-side.back');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const ratingControls = document.getElementById('rating-controls');
    
    if (frontSide) frontSide.classList.add('hidden');
    if (backSide) backSide.classList.remove('hidden');
    if (showAnswerBtn) showAnswerBtn.classList.add('hidden');
    if (ratingControls) ratingControls.classList.remove('hidden');
    
    studySession.showingBack = true;
}

async function rateCard(quality) {
    const card = studySession.cards[studySession.currentIndex];
    
    try {
        await recordStudySession(card.id, quality);
        
        // Move to next card
        studySession.currentIndex++;
        
        if (studySession.currentIndex >= studySession.cards.length) {
            // Study session complete
            closeStudyModal();
            showSuccess(`Study session complete! You reviewed ${studySession.cards.length} cards.`);
            loadStudyStats();
            if (currentDeck) {
                openDeckModal(currentDeck.id);
            }
        } else {
            showStudyCard();
        }
    } catch (error) {
        showError('Failed to record study session');
    }
}

function closeStudyModal() {
    if (studyModal) studyModal.classList.add('hidden');
    studySession = { cards: [], currentIndex: 0, showingBack: false };
}

// Event Handlers
function handleDeleteDeck(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    
    if (!confirm(`Are you sure you want to delete "${deck.name}" and all its cards?`)) {
        return;
    }
    
    deleteDeck(deckId);
}

function handleDeleteFlashcard(cardId) {
    if (!confirm('Are you sure you want to delete this flashcard?')) {
        return;
    }
    
    deleteFlashcard(cardId);
}

function editFlashcard(cardId) {
    if (currentDeck) {
        openFlashcardModal(currentDeck.id, cardId);
    }
}

// Form Handlers
async function handleCreateDeck(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const deckData = {
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    try {
        await createDeck(deckData);
        closeCreateDeckModal();
        showSuccess('Deck created successfully!');
    } catch (error) {
        console.error('Failed to create deck:', error);
    }
}

async function handleCreateFlashcard(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const cardId = formData.get('id');
    const isEdit = cardId && cardId !== '';
    
    const cardData = {
        deck_id: parseInt(formData.get('deck_id')),
        front: formData.get('front'),
        back: formData.get('back')
    };
    
    try {
        if (isEdit) {
            await updateFlashcard(parseInt(cardId), cardData);
            showSuccess('Card updated successfully!');
        } else {
            await createFlashcard(cardData);
            showSuccess('Card created successfully!');
        }
        closeFlashcardModal();
    } catch (error) {
        console.error(`Failed to ${isEdit ? 'update' : 'create'} flashcard:`, error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Flashcards page initializing...');
    
    // Check authentication status first
    const isAuthenticated = await checkAuth();
    console.log('Authentication status:', isAuthenticated);
    if (!isAuthenticated) {
        window.location.href = '/login.html';
        return;
    }
    
    console.log('Setting up flashcard system...');
    initFlashcardSystem();
    
    console.log('Loading flashcard data...');
    loadFlashcardData();
});

// Make functions globally available
window.loadFlashcardData = loadFlashcardData;
window.openDeckModal = openDeckModal;
window.startStudySession = startStudySession;
window.handleDeleteDeck = handleDeleteDeck;
window.handleDeleteFlashcard = handleDeleteFlashcard;
window.editFlashcard = editFlashcard;
window.showAnswer = showAnswer;
window.rateCard = rateCard;
window.initFlashcardSystem = initFlashcardSystem;