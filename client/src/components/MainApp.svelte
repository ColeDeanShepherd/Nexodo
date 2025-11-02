<script lang="ts">
	import { onMount } from 'svelte';
	import MainView from './MainView.svelte';
	import '../../styles.css';

	let currentView = 'todos';

	// Global functions that will be available after scripts load
	let globalFunctions: any = {};

	onMount(() => {
		// Set a flag to prevent the original DOMContentLoaded handler from running
		(window as any).svelteControlled = true;

		// Import and initialize all the existing JavaScript files sequentially
		// We need to load them in order to ensure dependencies are available
		const scripts = [
			'/theme.js',
			'/common.js', 
			'/script.js',
			'/templates.js'
		];

		async function loadScriptsSequentially() {
			for (const src of scripts) {
				await new Promise((resolve, reject) => {
					const script = document.createElement('script');
					script.src = src;
					script.onload = resolve;
					script.onerror = reject;
					document.head.appendChild(script);
				});
			}
			
			// After all scripts are loaded, capture the global functions
			globalFunctions = {
				switchToView: (window as any).switchToView,
				openAddModal: (window as any).openAddModal,
				openCategoriesModal: (window as any).openCategoriesModal,
				logout: (window as any).logout,
				loadTodos: (window as any).loadTodos,
				loadCategories: (window as any).loadCategories,
				setFilter: (window as any).setFilter,
				handleToggleComplete: (window as any).handleToggleComplete,
				openEditModal: (window as any).openEditModal,
				handleDeleteTodo: (window as any).handleDeleteTodo,
				editCategory: (window as any).editCategory,
				deleteCategory: (window as any).deleteCategory,
				checkAuth: (window as any).checkAuth,
				setupEventListeners: (window as any).setupEventListeners,
				// Add other functions as needed
			};

			// Initialize authentication check
			if (globalFunctions.checkAuth) {
				const isAuthenticated = await globalFunctions.checkAuth();
				if (!isAuthenticated) {
					window.location.href = '/login.html';
					return;
				}
			}

			// Initialize the app after scripts are loaded
			if (globalFunctions.loadCategories) {
				await globalFunctions.loadCategories();
			}
			if (globalFunctions.loadTodos) {
				globalFunctions.loadTodos();
			}
			if (globalFunctions.setFilter) {
				globalFunctions.setFilter('active');
			}

			// Set up event listeners that the original script would have set up
			if (globalFunctions.setupEventListeners) {
				globalFunctions.setupEventListeners();
			}

			// Set up additional event listeners for elements that don't have Svelte handlers
			setupAdditionalEventListeners();

			// Initialize flashcard system if available
			if ((window as any).initFlashcardSystem) {
				(window as any).initFlashcardSystem();
			}
		}

		loadScriptsSequentially().catch(error => {
			console.error('Failed to load scripts:', error);
		});
	});

	function setupAdditionalEventListeners() {
		// Handle clicks on dynamically generated content using event delegation
		document.addEventListener('click', (e: any) => {
			const target = e.target;
			
			// Handle todo checkbox changes
			if (target.matches('.todo-checkbox')) {
				const onchangeAttr = target.getAttribute('onchange');
				if (onchangeAttr) {
					const id = onchangeAttr.match(/\d+/)?.[0];
					if (id && globalFunctions.handleToggleComplete) {
						globalFunctions.handleToggleComplete(parseInt(id));
					}
				}
			}
			
			// Handle edit todo buttons
			if (target.matches('[onclick*="openEditModal"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && globalFunctions.openEditModal) {
						globalFunctions.openEditModal(parseInt(id));
					}
				}
			}
			
			// Handle delete todo buttons
			if (target.matches('[onclick*="handleDeleteTodo"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && globalFunctions.handleDeleteTodo) {
						globalFunctions.handleDeleteTodo(parseInt(id));
					}
				}
			}

			// Handle category actions
			if (target.matches('[onclick*="editCategory"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && globalFunctions.editCategory) {
						globalFunctions.editCategory(parseInt(id));
					}
				}
			}
			
			if (target.matches('[onclick*="deleteCategory"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && globalFunctions.deleteCategory) {
						globalFunctions.deleteCategory(parseInt(id));
					}
				}
			}

			// Handle template actions
			if (target.matches('[onclick*="editTemplate"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && (window as any).editTemplate) {
						(window as any).editTemplate(parseInt(id));
					}
				}
			}

			if (target.matches('[onclick*="confirmDeleteTemplate"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && (window as any).confirmDeleteTemplate) {
						(window as any).confirmDeleteTemplate(parseInt(id));
					}
				}
			}

			if (target.matches('[onclick*="generateInstancesFromTemplate"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && (window as any).generateInstancesFromTemplate) {
						(window as any).generateInstancesFromTemplate(parseInt(id));
					}
				}
			}

			if (target.matches('[onclick*="previewTemplateModal"]')) {
				const onclickAttr = target.getAttribute('onclick');
				if (onclickAttr) {
					const id = onclickAttr.match(/\d+/)?.[0];
					if (id && (window as any).previewTemplateModal) {
						(window as any).previewTemplateModal(parseInt(id));
					}
				}
			}
		});
	}

	// Event handlers
	function handleNavTodos() {
		currentView = 'todos';
		if (globalFunctions.switchToView) {
			globalFunctions.switchToView('todos');
		}
	}

	function handleNavTemplates() {
		currentView = 'templates';
		if (globalFunctions.switchToView) {
			globalFunctions.switchToView('templates');
		}
	}

	function handleNavCheatSheet() {
		currentView = 'cheatsheet';
		// Hide all other views manually since this view is not handled by the original switchToView
		const todoSystem = document.getElementById('todo-system');
		const templatesSystem = document.getElementById('templates-system');
		const flashcardSystem = document.getElementById('flashcard-system');
		
		if (todoSystem) {
			todoSystem.classList.remove('active');
			todoSystem.classList.add('hidden');
		}
		if (templatesSystem) {
			templatesSystem.classList.remove('active');
			templatesSystem.classList.add('hidden');
		}
		if (flashcardSystem) {
			flashcardSystem.classList.remove('active');
			flashcardSystem.classList.add('hidden');
		}

		// Update navigation button states
		const navTodosBtn = document.getElementById('nav-todos');
		const navTemplatesBtn = document.getElementById('nav-templates');
		const navFlashcardsBtn = document.getElementById('nav-flashcards');
		
		if (navTodosBtn) navTodosBtn.classList.remove('active');
		if (navTemplatesBtn) navTemplatesBtn.classList.remove('active');
		if (navFlashcardsBtn) navFlashcardsBtn.classList.remove('active');
	}

	function handleNavFlashcards() {
		window.location.href = '/flashcards';
	}

	function handleLogout() {
		if (globalFunctions.logout) {
			globalFunctions.logout();
		}
	}
</script>

<div class="container">
	<header>
		<div class="header-content">
			<h1>📝 Nexodo</h1>
			<nav class="main-nav">
				<button id="nav-todos" class="nav-btn" class:active={currentView === 'todos'} on:click={handleNavTodos}>📝 Todos</button>
				<button id="nav-templates" class="nav-btn" class:active={currentView === 'templates'} on:click={handleNavTemplates}>🔄 Templates</button>
				<button id="nav-cheatsheet" class="nav-btn" class:active={currentView === 'cheatsheet'} on:click={handleNavCheatSheet}>📋 Cheat Sheet</button>
				<button id="nav-flashcards" class="nav-btn" on:click={handleNavFlashcards}>🃏 Flashcards</button>
			</nav>
		</div>
		<div class="header-actions">
			<button id="theme-toggle" class="btn btn-secondary" title="Toggle dark/light mode">
				🌙
			</button>
			<button id="logout-btn" class="btn btn-secondary" on:click={handleLogout}>
				🚪 Logout
			</button>
		</div>
	</header>

	<MainView {currentView} {globalFunctions} />
</div>