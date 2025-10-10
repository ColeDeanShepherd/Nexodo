// API Base URL
const API_BASE = '/api';

// DOM Elements
const addTodoForm = document.getElementById('add-todo-form');
const todoList = document.getElementById('todo-list');
const todoCount = document.getElementById('todo-count');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const editModal = document.getElementById('edit-modal');
const editTodoForm = document.getElementById('edit-todo-form');
const addModal = document.getElementById('add-modal');

// Category elements
const categoryFilterSelect = document.getElementById('category-filter-select');
const manageCategoriesBtn = document.getElementById('manage-categories-btn');
const categoriesModal = document.getElementById('categories-modal');
const categoriesForm = document.getElementById('categories-form');

// Button elements
const openAddModalBtn = document.getElementById('open-add-modal');
const logoutBtn = document.getElementById('logout-btn');

// Navigation elements
const navTodosBtn = document.getElementById('nav-todos');
const navFlashcardsBtn = document.getElementById('nav-flashcards');
const todoSystem = document.getElementById('todo-system');
const flashcardSystem = document.getElementById('flashcard-system');

// Flashcard elements
const createDeckBtn = document.getElementById('create-deck-btn');
const studyDueBtn = document.getElementById('study-due-btn');
const deckList = document.getElementById('deck-list');
const createDeckModal = document.getElementById('create-deck-modal');
const createDeckForm = document.getElementById('create-deck-form');
const deckModal = document.getElementById('deck-modal');
const flashcardModal = document.getElementById('flashcard-modal');
const flashcardForm = document.getElementById('flashcard-form');
const studyModal = document.getElementById('study-modal');

// Statistics elements
const totalDecksCount = document.getElementById('total-decks-count');
const totalCardsCount = document.getElementById('total-cards-count');
const dueCardsCount = document.getElementById('due-cards-count');

// Check if critical elements exist
if (!addTodoForm) {
    console.error('addTodoForm element not found! Check that the form ID "add-todo-form" exists in the HTML.');
}
if (!todoList) {
    console.error('todoList element not found! Check that the element ID "todo-list" exists in the HTML.');
}

// Filter buttons
const showAllBtn = document.getElementById('show-all');
const showActiveBtn = document.getElementById('show-active');
const showCompletedBtn = document.getElementById('show-completed');

// Modal elements
const closeModalBtn = document.getElementById('close-modal');

// State
let todos = [];
let categories = [];
let currentFilter = 'all'; // 'all', 'active', 'completed'
let currentCategoryFilter = ''; // category ID or empty string for all

// Flashcard state
let decks = [];
let currentDeck = null;
let studySession = {
    cards: [],
    currentIndex: 0,
    showingBack: false
};
let currentView = 'todos'; // 'todos' or 'flashcards'

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication status first
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        window.location.href = '/login.html';
        return;
    }
    
    await loadCategories();
    loadTodos();
    setupEventListeners();
    setFilter('active');
});

// Event Listeners
function setupEventListeners() {
    // Only add event listeners if elements exist
    if (addTodoForm) {
        addTodoForm.addEventListener('submit', handleAddTodo);
    } else {
        console.error('Cannot set up addTodoForm event listener - element not found');
    }
    
    if (editTodoForm) {
        editTodoForm.addEventListener('submit', handleEditTodo);
    } else {
        console.error('Cannot set up editTodoForm event listener - element not found');
    }
    
    // Authentication controls
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Add modal controls
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', openAddModal);
    }
    
    const closeAddModalBtn = document.getElementById('close-add-modal');
    const cancelAddBtn = document.getElementById('cancel-add');
    
    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', closeAddModal);
    }
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', closeAddModal);
    }
    if (addModal) {
        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) closeAddModal();
        });
    }
    
    // Filter buttons
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => setFilter('all'));
    }
    if (showActiveBtn) {
        showActiveBtn.addEventListener('click', () => setFilter('active'));
    }
    if (showCompletedBtn) {
        showCompletedBtn.addEventListener('click', () => setFilter('completed'));
    }
    
    // Category filter
    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', (e) => {
            currentCategoryFilter = e.target.value;
            renderTodos();
        });
    }
    
    // Category management
    if (manageCategoriesBtn) {
        manageCategoriesBtn.addEventListener('click', openCategoriesModal);
    }
    
    // Categories modal controls
    const closeCategoriesModalBtn = document.getElementById('close-categories-modal');
    if (closeCategoriesModalBtn) {
        closeCategoriesModalBtn.addEventListener('click', closeCategoriesModal);
    }
    
    if (categoriesModal) {
        categoriesModal.addEventListener('click', (e) => {
            if (e.target === categoriesModal) closeCategoriesModal();
        });
    }
    
    // Add category form
    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', handleAddCategory);
    }
    
    // Edit modal controls
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEditModal);
    }
    
    const cancelEditBtn = document.getElementById('cancel-edit');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModal);
    }
    
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }
    
    // Navigation controls
    if (navTodosBtn) {
        navTodosBtn.addEventListener('click', () => switchToView('todos'));
    }
    if (navFlashcardsBtn) {
        navFlashcardsBtn.addEventListener('click', () => switchToView('flashcards'));
    }
    
    // Flashcard controls
    if (createDeckBtn) {
        createDeckBtn.addEventListener('click', openCreateDeckModal);
    }
    if (studyDueBtn) {
        studyDueBtn.addEventListener('click', () => startStudySession());
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
    if (createDeckForm) {
        createDeckForm.addEventListener('submit', handleCreateDeck);
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
    if (flashcardForm) {
        flashcardForm.addEventListener('submit', handleCreateFlashcard);
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
            closeAddModal();
            closeCategoriesModal();
            closeCreateDeckModal();
            closeDeckModal();
            closeFlashcardModal();
            closeStudyModal();
        }
    });

    // Navigation controls
    if (navTodosBtn) {
        navTodosBtn.addEventListener('click', () => switchToView('todos'));
    }
    if (navFlashcardsBtn) {
        navFlashcardsBtn.addEventListener('click', () => switchToView('flashcards'));
    }

    // Navigation controls
    if (navTodosBtn) {
        navTodosBtn.addEventListener('click', () => switchToView('todos'));
    }
    if (navFlashcardsBtn) {
        navFlashcardsBtn.addEventListener('click', () => switchToView('flashcards'));
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
}

// Authentication Functions
async function checkAuth() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        return data.authenticated;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/login.html';
    }
}

// API Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return response.status === 204 ? null : await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showError(`Error: ${error.message}`);
        throw error;
    }
}

async function loadTodos() {
    showLoading(true);
    try {
        todos = await apiCall('/todos');
        renderTodos();
        updateStats();
    } catch (error) {
        console.error('Failed to load todos:', error);
    } finally {
        showLoading(false);
    }
}

async function createTodo(todoData) {
    const newTodo = await apiCall('/todos', {
        method: 'POST',
        body: JSON.stringify(todoData)
    });
    todos.unshift(newTodo);
    renderTodos();
    updateStats();
    return newTodo;
}

async function updateTodo(id, updates) {
    const updatedTodo = await apiCall(`/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
    
    const index = todos.findIndex(todo => todo.id === id);
    if (index !== -1) {
        todos[index] = updatedTodo;
        renderTodos();
        updateStats();
    }
    return updatedTodo;
}

async function deleteTodo(id) {
    await apiCall(`/todos/${id}`, {
        method: 'DELETE'
    });
    
    todos = todos.filter(todo => todo.id !== id);
    renderTodos();
    updateStats();
}

// Event Handlers
async function handleAddTodo(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const description = formData.get('description').trim();
    const deadline = formData.get('deadline');
    const categoryId = formData.get('category_id');
    
    if (!description) {
        showError('Please enter a todo description');
        return;
    }
    
    try {
        await createTodo({
            description,
            deadline: deadline || null,
            category_id: categoryId || null
        });
        
        e.target.reset();
        closeAddModal();
        hideError();
    } catch (error) {
        console.error('Failed to add todo:', error);
    }
}

async function handleEditTodo(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const id = parseInt(formData.get('id'));
    const description = formData.get('description').trim();
    const deadline = formData.get('deadline');
    const categoryId = formData.get('category_id');
    const completed = formData.get('completed') === 'on';
    
    if (!description) {
        showError('Please enter a todo description');
        return;
    }
    
    try {
        await updateTodo(id, {
            description,
            deadline: deadline || null,
            category_id: categoryId || null,
            completed
        });
        
        closeEditModal();
        hideError();
    } catch (error) {
        console.error('Failed to update todo:', error);
    }
}

async function handleToggleComplete(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        try {
            await updateTodo(id, { completed: !todo.completed });
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    }
}

async function handleDeleteTodo(id) {
    if (confirm('Are you sure you want to delete this todo?')) {
        try {
            await deleteTodo(id);
        } catch (error) {
            console.error('Failed to delete todo:', error);
        }
    }
}

// UI Functions
function renderTodos() {
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        todoList.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    todoList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    todoList.innerHTML = filteredTodos.map(todo => createTodoElement(todo)).join('');
}

function createTodoElement(todo) {
    const deadline = todo.deadline ? new Date(todo.deadline) : null;
    const now = new Date();
    let deadlineClass = '';
    let deadlineText = '';
    
    if (deadline) {
        const isOverdue = deadline < now && !todo.completed;
        const isToday = deadline.toDateString() === now.toDateString();
        
        if (isOverdue) {
            deadlineClass = 'deadline-overdue';
            deadlineText = `⚠️ Overdue: ${formatDate(deadline)}`;
        } else if (isToday) {
            deadlineClass = 'deadline-today';
            deadlineText = `📅 Due today: ${formatTime(deadline)}`;
        } else {
            deadlineText = `📅 Due: ${formatDate(deadline)}`;
        }
    }
    
    // Get category information
    const category = todo.category_id ? getCategoryById(todo.category_id) : null;
    const categoryText = category ? `<span class="todo-category" style="background-color: ${category.color}">📁 ${category.name}</span>` : '';
    
    return `
        <li class="todo-item ${todo.completed ? 'completed' : ''}">
            <div class="todo-header">
                <input 
                    type="checkbox" 
                    class="todo-checkbox" 
                    ${todo.completed ? 'checked' : ''}
                    onchange="handleToggleComplete(${todo.id})"
                >
                <div class="todo-content">${escapeHtml(todo.description)}</div>
                <div class="todo-actions">
                    <button class="btn btn-secondary" onclick="openEditModal(${todo.id})">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-danger" onclick="handleDeleteTodo(${todo.id})">
                        🗑️ Delete
                    </button>
                </div>
            </div>
            <div class="todo-meta">
                ${categoryText}
                ${deadlineText ? `<div class="todo-deadline ${deadlineClass}">${deadlineText}</div>` : ''}
            </div>
        </li>
    `;
}

function getFilteredTodos() {
    let filtered = todos;
    
    // Filter by completion status
    switch (currentFilter) {
        case 'active':
            filtered = filtered.filter(todo => !todo.completed);
            break;
        case 'completed':
            filtered = filtered.filter(todo => todo.completed);
            break;
        default:
            // 'all' - no filtering by completion status
            break;
    }
    
    // Filter by category
    if (currentCategoryFilter) {
        filtered = filtered.filter(todo => todo.category_id && todo.category_id.toString() === currentCategoryFilter);
    }
    
    return filtered;
}

function setFilter(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filters .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    switch (filter) {
        case 'active':
            showActiveBtn.classList.add('active');
            break;
        case 'completed':
            showCompletedBtn.classList.add('active');
            break;
        default:
            showAllBtn.classList.add('active');
    }
    
    renderTodos();
    updateStats();
}

function updateStats() {
    const activeTodos = todos.filter(todo => !todo.completed);
    
    let text;
    if (currentFilter === 'all') {
        text = `${todos.length} total, ${activeTodos.length} active`;
    } else if (currentFilter === 'active') {
        text = `${activeTodos.length} active todos`;
    } else {
        text = `${todos.filter(todo => todo.completed).length} completed todos`;
    }
    
    todoCount.textContent = text;
}

function openEditModal(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    document.getElementById('edit-todo-id').value = todo.id;
    document.getElementById('edit-todo-description').value = todo.description;
    document.getElementById('edit-todo-completed').checked = todo.completed;
    
    // Set category
    const editCategorySelect = document.getElementById('edit-todo-category');
    if (editCategorySelect) {
        editCategorySelect.value = todo.category_id || '';
    }
    
    if (todo.deadline) {
        const deadline = new Date(todo.deadline);
        document.getElementById('edit-todo-deadline').value = 
            deadline.toISOString().slice(0, 16);
    } else {
        document.getElementById('edit-todo-deadline').value = '';
    }
    
    editModal.classList.remove('hidden');
    document.getElementById('edit-todo-description').focus();
}

function closeEditModal() {
    editModal.classList.add('hidden');
    editTodoForm.reset();
}

function openAddModal() {
    addModal.classList.remove('hidden');
    document.getElementById('todo-description').focus();
}

function closeAddModal() {
    addModal.classList.add('hidden');
    addTodoForm.reset();
    hideError();
}

function showLoading(show) {
    if (show) {
        loadingElement.classList.remove('hidden');
        todoList.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        loadingElement.classList.add('hidden');
    }
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    setTimeout(hideError, 5000);
}

function hideError() {
    errorElement.classList.add('hidden');
}

// Utility Functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Category Functions
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        categories = await response.json();
        renderCategorySelects();
        renderCategoryFilter();
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Failed to load categories');
    }
}

function renderCategorySelects() {
    // Update add todo form category select
    const addCategorySelect = document.getElementById('todo-category');
    const editCategorySelect = document.getElementById('edit-todo-category');
    
    if (addCategorySelect) {
        addCategorySelect.innerHTML = '<option value="">No category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            addCategorySelect.appendChild(option);
        });
    }
    
    if (editCategorySelect) {
        editCategorySelect.innerHTML = '<option value="">No category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            editCategorySelect.appendChild(option);
        });
    }
}

function renderCategoryFilter() {
    if (categoryFilterSelect) {
        categoryFilterSelect.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilterSelect.appendChild(option);
        });
    }
}

function getCategoryById(categoryId) {
    return categories.find(cat => cat.id === categoryId);
}

// Category Management Functions
function openCategoriesModal() {
    categoriesModal.classList.remove('hidden');
    renderCategoriesManagementList();
}

function closeCategoriesModal() {
    categoriesModal.classList.add('hidden');
}

function renderCategoriesManagementList() {
    const managementList = document.getElementById('categories-management-list');
    if (!managementList) return;
    
    managementList.innerHTML = categories.map(category => `
        <div class="category-management-item">
            <div class="category-info">
                <span class="category-color-preview" style="background-color: ${category.color}"></span>
                <span class="category-name">${escapeHtml(category.name)}</span>
            </div>
            <div class="category-actions">
                <button class="btn btn-secondary btn-small" onclick="editCategory(${category.id})">
                    ✏️ Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteCategory(${category.id})">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function handleAddCategory(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const name = formData.get('name').trim();
    const color = formData.get('color');
    
    if (!name) {
        showError('Please enter a category name');
        return;
    }
    
    try {
        await createCategory({ name, color });
        e.target.reset();
        hideError();
    } catch (error) {
        console.error('Failed to add category:', error);
    }
}

async function createCategory(categoryData) {
    try {
        const newCategory = await apiCall('/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
        categories.push(newCategory);
        renderCategorySelects();
        renderCategoryFilter();
        renderCategoriesManagementList();
        return newCategory;
    } catch (error) {
        console.error('Failed to create category:', error);
        throw error;
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? Todos in this category will become uncategorized.')) {
        return;
    }
    
    try {
        await apiCall(`/categories/${id}`, {
            method: 'DELETE'
        });
        categories = categories.filter(cat => cat.id !== id);
        renderCategorySelects();
        renderCategoryFilter();
        renderCategoriesManagementList();
        // Refresh todos to update display
        loadTodos();
    } catch (error) {
        console.error('Failed to delete category:', error);
    }
}

function editCategory(id) {
    // For now, just show an alert. We could implement inline editing later
    alert('Category editing will be implemented in a future update!');
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Navigation Functions
function switchToView(view) {
    currentView = view;
    
    // Update navigation buttons
    navTodosBtn.classList.toggle('active', view === 'todos');
    navFlashcardsBtn.classList.toggle('active', view === 'flashcards');
    
    // Show/hide system views (be sure to add/remove "hidden" class too)
    todoSystem.classList.toggle('active', view === 'todos');
    todoSystem.classList.toggle('hidden', view !== 'todos');
    flashcardSystem.classList.toggle('active', view === 'flashcards');
    flashcardSystem.classList.toggle('hidden', view !== 'flashcards');

    if (view === 'flashcards') {
        loadFlashcardData();
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
        decks = await apiCall('/decks');
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
        document.getElementById('deck-empty-state').classList.remove('hidden');
        return;
    }
    
    document.getElementById('deck-empty-state').classList.add('hidden');
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
    totalDecksCount.textContent = stats.total_decks;
    totalCardsCount.textContent = stats.total_cards;
    dueCardsCount.textContent = stats.total_due;
    
    // Enable/disable study button
    studyDueBtn.disabled = stats.total_due === 0;
    studyDueBtn.textContent = stats.total_due > 0 ? `📚 Study ${stats.total_due} Cards` : '📚 No Cards Due';
}

// Modal Functions
function openCreateDeckModal() {
    createDeckModal.classList.remove('hidden');
    document.getElementById('deck-name').focus();
}

function closeCreateDeckModal() {
    createDeckModal.classList.add('hidden');
    createDeckForm.reset();
    hideError();
}

async function openDeckModal(deckId) {
    try {
        const deck = await loadDeck(deckId);
        document.getElementById('deck-modal-title').textContent = deck.name;
        document.getElementById('deck-card-count').textContent = `${deck.card_count} cards`;
        document.getElementById('deck-due-count').textContent = `${deck.due_count} due`;
        
        const studyBtn = document.getElementById('study-deck-btn');
        studyBtn.disabled = deck.due_count === 0;
        studyBtn.textContent = deck.due_count > 0 ? `📚 Study ${deck.due_count} Cards` : '📚 No Cards Due';
        
        renderFlashcards();
        deckModal.classList.remove('hidden');
    } catch (error) {
        showError('Failed to load deck');
    }
}

function closeDeckModal() {
    deckModal.classList.add('hidden');
    currentDeck = null;
}

function openFlashcardModal(deckId, cardId = null) {
    const isEdit = cardId !== null;
    document.getElementById('flashcard-modal-title').textContent = isEdit ? 'Edit Card' : 'Add New Card';
    document.getElementById('flashcard-deck-id').value = deckId;
    
    if (isEdit) {
        const card = currentDeck.flashcards.find(c => c.id === cardId);
        if (card) {
            document.getElementById('flashcard-id').value = card.id;
            document.getElementById('card-front').value = card.front;
            document.getElementById('card-back').value = card.back;
        }
    } else {
        flashcardForm.reset();
        document.getElementById('flashcard-deck-id').value = deckId;
    }
    
    flashcardModal.classList.remove('hidden');
    document.getElementById('card-front').focus();
}

function closeFlashcardModal() {
    flashcardModal.classList.add('hidden');
    flashcardForm.reset();
    hideError();
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
        studyModal.classList.remove('hidden');
    } catch (error) {
        showError('Failed to start study session');
    }
}

function showStudyCard() {
    const card = studySession.cards[studySession.currentIndex];
    if (!card) return;
    
    document.getElementById('study-progress-text').textContent = 
        `Card ${studySession.currentIndex + 1} of ${studySession.cards.length}`;
    
    document.getElementById('study-card-front').textContent = card.front;
    document.getElementById('study-card-back').textContent = card.back;
    
    // Show front, hide back
    document.querySelector('.card-side.front').classList.remove('hidden');
    document.querySelector('.card-side.back').classList.add('hidden');
    document.getElementById('show-answer-btn').classList.remove('hidden');
    document.getElementById('rating-controls').classList.add('hidden');
    
    studySession.showingBack = false;
}

function showAnswer() {
    document.querySelector('.card-side.front').classList.add('hidden');
    document.querySelector('.card-side.back').classList.remove('hidden');
    document.getElementById('show-answer-btn').classList.add('hidden');
    document.getElementById('rating-controls').classList.remove('hidden');
    
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
    studyModal.classList.add('hidden');
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
    openFlashcardModal(currentDeck.id, cardId);
}

// Success message function
function showSuccess(message) {
    // For now, use alert. Could be enhanced with a toast system
    alert(message);
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

// Auto-refresh todos every 30 seconds
setInterval(loadTodos, 30000);