// Common utilities and shared functions

// API Base URL
const API_BASE = '/api';

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

// UI Helper Functions
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(hideError, 5000);
    }
}

function hideError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

function showSuccess(message) {
    // For now, use alert. Could be enhanced with a toast system
    alert(message);
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

// Navigation Functions
let currentView = 'todos'; // 'todos', 'flashcards', or 'templates'

function switchToView(view) {
    currentView = view;
    
    const navTodosBtn = document.getElementById('nav-todos');
    const navFlashcardsBtn = document.getElementById('nav-flashcards');
    const navTemplatesBtn = document.getElementById('nav-templates');
    const todoSystem = document.getElementById('todo-system');
    const flashcardSystem = document.getElementById('flashcard-system');
    const templatesSystem = document.getElementById('templates-system');
    
    // Update navigation buttons
    if (navTodosBtn) navTodosBtn.classList.toggle('active', view === 'todos');
    if (navFlashcardsBtn) navFlashcardsBtn.classList.toggle('active', view === 'flashcards');
    if (navTemplatesBtn) navTemplatesBtn.classList.toggle('active', view === 'templates');
    
    // Show/hide system views
    if (todoSystem) {
        todoSystem.classList.toggle('active', view === 'todos');
        todoSystem.classList.toggle('hidden', view !== 'todos');
    }
    if (flashcardSystem) {
        flashcardSystem.classList.toggle('active', view === 'flashcards');
        flashcardSystem.classList.toggle('hidden', view !== 'flashcards');
    }
    if (templatesSystem) {
        templatesSystem.classList.toggle('active', view === 'templates');
        templatesSystem.classList.toggle('hidden', view !== 'templates');
    }

    // Load data when switching to specific views
    if (view === 'flashcards' && window.loadFlashcardData) {
        window.loadFlashcardData();
    }
    if (view === 'templates' && window.loadTemplates) {
        window.loadTemplates();
    }
}

// Make functions globally available
window.checkAuth = checkAuth;
window.logout = logout;
window.apiCall = apiCall;
window.showError = showError;
window.hideError = hideError;
window.showSuccess = showSuccess;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.escapeHtml = escapeHtml;
window.switchToView = switchToView;
window.currentView = currentView;