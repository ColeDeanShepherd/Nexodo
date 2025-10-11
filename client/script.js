// Todo Management System - Main script

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
    
    // Initialize flashcard system if available
    if (window.initFlashcardSystem) {
        window.initFlashcardSystem();
    }
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
            closeAddModal();
            closeCategoriesModal();
            // Close flashcard modals if they exist
            if (window.closeCreateDeckModal) window.closeCreateDeckModal();
            if (window.closeDeckModal) window.closeDeckModal();
            if (window.closeFlashcardModal) window.closeFlashcardModal();
            if (window.closeStudyModal) window.closeStudyModal();
        }
    });
}

// API Functions
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

// Make functions globally available for onclick handlers
window.handleToggleComplete = handleToggleComplete;
window.openEditModal = openEditModal;
window.handleDeleteTodo = handleDeleteTodo;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;

// Auto-refresh todos every 30 seconds
setInterval(loadTodos, 30000);