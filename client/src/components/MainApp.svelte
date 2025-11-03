<script lang="ts">
	import { onMount } from 'svelte';
	import MainView from './MainView.svelte';
	import '../../styles.css';

	function _elem<K extends keyof HTMLElementTagNameMap>(
		tagName: K,
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	): HTMLElementTagNameMap[K] {
		let actualChildren: (Node | string)[];
		let attrs: Record<string, any>;

		if (childrenOrAttrs === undefined) {
			if (children !== undefined) {
				throw new Error('Children provided without attributes.');
			}

			actualChildren = [];
			attrs = {};
		} else if (Array.isArray(childrenOrAttrs)) {
			if (children !== undefined) {
				throw new Error('Cannot provide both children and childrenOrAttrs as array.');
			}

			actualChildren = childrenOrAttrs;
			attrs = {};
		} else if (typeof childrenOrAttrs === 'object') {
			actualChildren = children || [];
			attrs = childrenOrAttrs;
		} else {
			throw new Error('Invalid argument for childrenOrAttrs.');
		}

		const element = document.createElement(tagName, options);
		
		// Set attributes
		Object.keys(attrs).forEach((key) => {
			element.setAttribute(key, attrs[key]);
		});
		
		// Append children (handle both Nodes and strings)
		actualChildren.forEach((child) => {
			if (typeof child === 'string') {
				element.appendChild(document.createTextNode(child));
			} else {
				element.appendChild(child);
			}
		});

		return element;
	}

	const _div = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('div', childrenOrAttrs, children, options);

	const _span = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('span', childrenOrAttrs, children, options);

	const _pre = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('pre', childrenOrAttrs, children, options);

	const _table = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('table', childrenOrAttrs, children, options);

	const _thead = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('thead', childrenOrAttrs, children, options);

	const _tbody = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('tbody', childrenOrAttrs, children, options);

	const _tr = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('tr', childrenOrAttrs, children, options);

	const _th = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('th', childrenOrAttrs, children, options);

	const _td = (
		childrenOrAttrs?: (Node | string)[] | Record<string, any>,
		children?: (Node | string)[],
		options?: ElementCreationOptions
	) => _elem('td', childrenOrAttrs, children, options);

	const todosTableView = (db: any) => {
		// Handle case where db.todos doesn't exist or is empty
		if (!db.todos || !Array.isArray(db.todos) || db.todos.length === 0) {
			return _div([
				_div({ class: "no-todos" }, ["No todos found"])
			]);
		}

		// Get column names from the first todo object
		const firstTodo = db.todos[0];
		const columnNames = Object.keys(firstTodo);

		// Create table header based on actual properties
		const headerRow = _tr(
			columnNames.map(columnName => _th([columnName]))
		);

		// Create table rows for each todo
		const todoRows = db.todos.map((todo: any) => {
			return _tr(
				columnNames.map(columnName => {
					const value = todo[columnName];
					let displayValue = '';
					
					// Format different types of values
					if (value === null || value === undefined) {
						displayValue = '';
					} else if (typeof value === 'boolean') {
						displayValue = value ? "✓" : "○";
					} else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
						// Looks like an ISO date string
						displayValue = new Date(value).toLocaleDateString();
					} else {
						displayValue = String(value);
					}
					
					return _td([displayValue]);
				})
			);
		});

		// Assemble the complete table
		return _table(
			{ class: "todos-table" },
			[
				_thead([headerRow]),
				_tbody(todoRows)
			]
		);
	};

	// data query = SELECT * FROM todos
	// schema = todo[]
	// view = table view (of todo)
	// TODO post process data = sort by urgency
	// todo = { id: number; title: string; completed: boolean; dueDate: string; priority: string; category: string; }

	// Global functions that will be available after scripts load
	let globalFunctions: any = {};
	
	// Variable to store the DB value for display
	let dbValue: string = '';
	let dbContainer: HTMLElement;

	// Function to render the todos table view
	function renderTodosTable() {
		if (dbContainer && dbValue) {
			try {
				const parsed = JSON.parse(dbValue);
				const tableElement = todosTableView(parsed);
				dbContainer.innerHTML = '';
				dbContainer.appendChild(tableElement);
			} catch (error) {
				dbContainer.innerHTML = `<p>Error parsing DB value: ${error}</p>`;
			}
		}
	}

	// Reactive statement to update the table when dbValue changes
	$: if (dbValue && dbContainer) {
		renderTodosTable();
	}

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
			
			const rawValue = response?.value || '';
			console.log('DB value:', rawValue);
			
			// Store the raw value for processing
			dbValue = rawValue;
		} catch (error) {
			// apiCall already handles logging errors, but we can add specific handling
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('404')) {
				console.log('DB key not found in key-value store');
				dbValue = '{"error": "DB key not found in key-value store"}';
			} else {
				console.log('Failed to fetch DB key-value:', errorMessage);
				dbValue = `{"error": "Error fetching DB value: ${errorMessage}"}`;
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

	<!-- DB Value Display -->
	{#if dbValue}
		<div bind:this={dbContainer} class="todos-table-container">
			<!-- Table will be rendered here by todosTableView -->
		</div>
	{/if}

	<MainView {globalFunctions} />
</div>

<style>
	.todos-table-container {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-color, #ccc);
		border-radius: 4px;
		background-color: var(--input-background, #fff);
		color: var(--text-color, #333);
		box-sizing: border-box;
		overflow: auto;
	}

	:global(.todos-table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0;
	}

	:global(.todos-table th),
	:global(.todos-table td) {
		padding: 0.5rem;
		text-align: left;
		border-bottom: 1px solid var(--border-color, #eee);
	}

	:global(.todos-table th) {
		background-color: var(--background-secondary, #f5f5f5);
		font-weight: 600;
		color: var(--text-color, #333);
		border-bottom: 2px solid var(--border-color, #ccc);
	}

	:global(.todos-table tr:hover) {
		background-color: var(--hover-background, #f9f9f9);
	}

	:global(.todos-table tr:nth-child(even)) {
		background-color: var(--stripe-background, #fafafa);
	}

	:global(.no-todos) {
		text-align: center;
		padding: 2rem;
		color: var(--text-muted, #666);
		font-style: italic;
	}
</style>