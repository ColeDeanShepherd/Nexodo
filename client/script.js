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

// Button elements
const openAddModalBtn = document.getElementById('open-add-modal');

// Filter buttons
const showAllBtn = document.getElementById('show-all');
const showActiveBtn = document.getElementById('show-active');
const showCompletedBtn = document.getElementById('show-completed');

// Modal elements
const closeModalBtn = document.getElementById('close-modal');
const closeAddModalBtn = document.getElementById('close-add-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const cancelAddBtn = document.getElementById('cancel-add');

// State
let todos = [];
let currentFilter = 'all'; // 'all', 'active', 'completed'

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    addTodoForm.addEventListener('submit', handleAddTodo);
    editTodoForm.addEventListener('submit', handleEditTodo);
    
    // Add modal controls
    openAddModalBtn.addEventListener('click', openAddModal);
    closeAddModalBtn.addEventListener('click', closeAddModal);
    cancelAddBtn.addEventListener('click', closeAddModal);
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) closeAddModal();
    });
    
    // Filter buttons
    showAllBtn.addEventListener('click', () => setFilter('all'));
    showActiveBtn.addEventListener('click', () => setFilter('active'));
    showCompletedBtn.addEventListener('click', () => setFilter('completed'));
    
    // Edit modal controls
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
            closeAddModal();
        }
    });
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
    
    if (!description) {
        showError('Please enter a todo description');
        return;
    }
    
    try {
        await createTodo({
            description,
            deadline: deadline || null
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
    
    if (!description) {
        showError('Please enter a todo description');
        return;
    }
    
    try {
        await updateTodo(id, {
            description,
            deadline: deadline || null
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
                <div>Created: ${formatDate(new Date(todo.created_at))}</div>
                ${deadlineText ? `<div class="todo-deadline ${deadlineClass}">${deadlineText}</div>` : ''}
            </div>
        </li>
    `;
}

function getFilteredTodos() {
    switch (currentFilter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        default:
            return todos;
    }
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
    const filteredTodos = getFilteredTodos();
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

// Auto-refresh todos every 30 seconds
setInterval(loadTodos, 30000);