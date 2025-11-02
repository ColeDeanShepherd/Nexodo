<script lang="ts">
	import { onMount } from 'svelte';
	import MainView from './MainView.svelte';
	import '../../styles.css';

	interface IDataSource {

	}

	interface IView {

	}

	// data query = SELECT * FROM todos
	// schema = todo[]
	// view = table view (of todo)
	// TODO post process data = sort by urgency
	// todo = { id: number; title: string; completed: boolean; dueDate: string; priority: string; category: string; }

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

			// Fetch and print the "db" key-value
			await fetchDbValue();
		}

		loadScriptsSequentially().catch(error => {
			console.error('Failed to load scripts:', error);
		});
	});

	// Function to fetch the "db" key-value from the API
	async function fetchDbValue() {
		try {
			const response = await (window as any).apiCall('/key-value/db');
			console.log('DB key-value:', response);
			console.log('DB value:', response.data?.value);
		} catch (error) {
			// apiCall already handles logging errors, but we can add specific handling
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('404')) {
				console.log('DB key not found in key-value store');
			} else {
				console.log('Failed to fetch DB key-value:', errorMessage);
			}
		}
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

	<MainView {globalFunctions} />
</div>