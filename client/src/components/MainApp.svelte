<script lang="ts">
	import { onMount } from 'svelte';
	import MainView from './MainView.svelte';
	import '../../styles.css';

	// Global functions that will be available after scripts load
	let globalFunctions: any = {};
	let mainViewComponent: MainView;

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
		}

		loadScriptsSequentially().catch(error => {
			console.error('Failed to load scripts:', error);
		});
	});

	// Navigation handlers that delegate to MainView
	function handleNavTodos() {
		if (mainViewComponent && mainViewComponent.handleNavTodos) {
			mainViewComponent.handleNavTodos();
		}
	}

	function handleNavTemplates() {
		if (mainViewComponent && mainViewComponent.handleNavTemplates) {
			mainViewComponent.handleNavTemplates();
		}
	}

	function handleNavCheatSheet() {
		if (mainViewComponent && mainViewComponent.handleNavCheatSheet) {
			mainViewComponent.handleNavCheatSheet();
		}
	}

	function handleNavFlashcards() {
		window.location.href = '/flashcards';
	}

	// Logout functionality (kept in MainApp)
	function handleLogout() {
		if (globalFunctions.logout) {
			globalFunctions.logout();
		}
	}

	// Theme functionality (kept in MainApp)
	function toggleTheme() {
		if ((window as any).toggleTheme) {
			(window as any).toggleTheme();
		}
	}
</script>

<div class="container">
	<header>
		<div class="header-content">
			<h1>📝 Nexodo</h1>
			<nav class="main-nav">
				<button id="nav-todos" class="nav-btn" on:click={handleNavTodos}>📝 Todos</button>
				<button id="nav-templates" class="nav-btn" on:click={handleNavTemplates}>🔄 Templates</button>
				<button id="nav-cheatsheet" class="nav-btn" on:click={handleNavCheatSheet}>📋 Cheat Sheet</button>
				<button id="nav-flashcards" class="nav-btn" on:click={handleNavFlashcards}>🃏 Flashcards</button>
			</nav>
		</div>
		<div class="header-actions">
			<button id="theme-toggle" class="btn btn-secondary" title="Toggle dark/light mode" on:click={toggleTheme}>
				🌙
			</button>
			<button id="logout-btn" class="btn btn-secondary" on:click={handleLogout}>
				🚪 Logout
			</button>
		</div>
	</header>

	<MainView {globalFunctions} bind:this={mainViewComponent} />
</div>