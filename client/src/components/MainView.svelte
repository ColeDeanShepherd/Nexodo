<script lang="ts">
	import { onMount } from 'svelte';
	import WorkCheatSheet from './WorkCheatSheet.svelte';
	
	// Props received from MainApp
	export let globalFunctions: any;
	
	// Internal state for view management
	let currentView = 'todos';
	
	onMount(() => {
		// Initialize authentication check
		if (globalFunctions.checkAuth) {
			globalFunctions.checkAuth().then((isAuthenticated: boolean) => {
				if (!isAuthenticated) {
					window.location.href = '/login.html';
					return;
				}
			});
		}

		// Initialize the app after scripts are loaded
		if (globalFunctions.loadCategories) {
			globalFunctions.loadCategories().then(() => {
				// Load todos after categories are loaded
				if (globalFunctions.loadTodos) {
					globalFunctions.loadTodos();
				}
				if (globalFunctions.setFilter) {
					globalFunctions.setFilter('active');
				}
			});
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

	// Navigation functions
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

	// Export navigation functions so MainApp can call them
	export { handleNavTodos, handleNavTemplates, handleNavCheatSheet, handleNavFlashcards };
	
	// Event handlers for modal and form interactions
	function handleAddTodo() {
		if (globalFunctions.openAddModal) {
			globalFunctions.openAddModal();
		}
	}

	function handleManageCategories() {
		if (globalFunctions.openCategoriesModal) {
			globalFunctions.openCategoriesModal();
		}
	}

	function handleOpenAddTemplate() {
		// Call the function from templates.js
		if ((window as any).openAddTemplateModal) {
			(window as any).openAddTemplateModal();
		}
	}

	function handleGenerateDueTodos() {
		// Call the function from templates.js
		if ((window as any).generateDueTodos) {
			(window as any).generateDueTodos();
		}
	}
</script>

<main>
	<!-- Main Navigation -->
	<nav class="main-nav">
		<button id="nav-todos" class="nav-btn" class:active={currentView === 'todos'} on:click={handleNavTodos}>📝 Todos</button>
		<button id="nav-templates" class="nav-btn" class:active={currentView === 'templates'} on:click={handleNavTemplates}>🔄 Templates</button>
		<button id="nav-cheatsheet" class="nav-btn" class:active={currentView === 'cheatsheet'} on:click={handleNavCheatSheet}>📋 Cheat Sheet</button>
		<button id="nav-flashcards" class="nav-btn" on:click={handleNavFlashcards}>🃏 Flashcards</button>
	</nav>

	<!-- Todo System -->
	<div id="todo-system" class="system-view" class:active={currentView === 'todos'} class:hidden={currentView !== 'todos'}>
		<!-- Add Todo Button -->
		<section class="add-todo-section">
			<button id="open-add-modal" class="btn btn-primary btn-large" on:click={handleAddTodo}>
				➕ Add New Todo
			</button>
		</section>

		<!-- Categories Section -->
		<section class="categories-section">
			<div class="categories-header">
				<h3>📁 Categories</h3>
				<button id="manage-categories-btn" class="btn btn-secondary" on:click={handleManageCategories}>
					⚙️ Manage
				</button>
			</div>
			<div id="categories-list" class="categories-list">
				<!-- Categories will be dynamically loaded here -->
			</div>
		</section>

		<!-- Todo Controls -->
		<section class="controls">
			<div class="filters">
				<button id="show-all" class="btn btn-secondary active">All</button>
				<button id="show-active" class="btn btn-secondary">Active</button>
				<button id="show-completed" class="btn btn-secondary">Completed</button>
			</div>
			<div class="category-filter">
				<label for="category-filter-select">Filter by category:</label>
				<select id="category-filter-select">
					<option value="">All Categories</option>
					<!-- Categories will be dynamically loaded here -->
				</select>
			</div>
			<div class="stats">
				<span id="todo-count">0 todos</span>
			</div>
		</section>

		<!-- Todo List -->
		<section class="todo-list-section">
			<div id="loading" class="loading hidden">Loading todos...</div>
			<div id="error-message" class="error-message hidden"></div>
			<ul id="todo-list" class="todo-list">
				<!-- Todos will be dynamically added here -->
			</ul>
			<div id="empty-state" class="empty-state hidden">
				<p>No todos yet. Add one above to get started!</p>
			</div>
		</section>
	</div>

	<!-- Recurring Templates System -->
	<div id="templates-system" class="system-view" class:hidden={currentView !== 'templates'} class:active={currentView === 'templates'}>
		<!-- Add Template Button -->
		<section class="add-template-section">
			<button id="open-add-template-modal" class="btn btn-primary btn-large" on:click={handleOpenAddTemplate}>
				➕ Create New Template
			</button>
			<button id="generate-due-todos-btn" class="btn btn-secondary btn-large" on:click={handleGenerateDueTodos}>
				🔄 Generate Due Todos
			</button>
		</section>

		<!-- Templates List -->
		<section class="templates-list-section">
			<div class="templates-header">
				<h3>🔄 Recurring Todo Templates</h3>
				<div class="templates-stats">
					<span id="templates-count">0 templates</span>
				</div>
			</div>
			
			<div id="templates-loading" class="loading hidden">Loading templates...</div>
			<div id="templates-error" class="error-message hidden"></div>
			
			<div id="templates-list" class="templates-list">
				<!-- Templates will be dynamically added here -->
			</div>
			
			<div id="templates-empty-state" class="empty-state hidden">
				<p>No recurring templates yet. Create one above to schedule recurring todos!</p>
			</div>
		</section>
	</div>

	<!-- Work Cheat Sheet System -->
	{#if currentView === 'cheatsheet'}
		<div id="cheatsheet-system" class="system-view active">
			<WorkCheatSheet />
		</div>
	{/if}
</main>

<!-- Todo Modals -->
<!-- Edit Todo Modal -->
<div id="edit-modal" class="modal hidden">
	<div class="modal-content">
		<div class="modal-header">
			<h3>Edit Todo</h3>
			<button id="close-modal" class="close-btn">&times;</button>
		</div>
		<form id="edit-todo-form" class="todo-form">
			<input type="hidden" id="edit-todo-id" name="id">
			<div class="form-group">
				<label for="edit-todo-description">Description:</label>
				<input type="text" id="edit-todo-description" name="description" placeholder="Enter todo description..." required>
			</div>
			<div class="form-group">
				<label for="edit-todo-category">Category (optional):</label>
				<select id="edit-todo-category" name="category_id">
					<option value="">No category</option>
					<!-- Categories will be dynamically loaded here -->
				</select>
			</div>
			<div class="form-group">
				<label for="edit-todo-priority">Priority:</label>
				<select id="edit-todo-priority" name="priority">
					<option value="low">🔵 Low</option>
					<option value="medium">🟡 Medium</option>
					<option value="high">🔴 High</option>
				</select>
			</div>
			<div class="form-group">
				<label>Deadline (optional):</label>
				<div class="form-row">
					<div class="form-group">
						<label for="edit-todo-deadline-date">Date:</label>
						<input type="date" id="edit-todo-deadline-date" name="deadline_date">
					</div>
					<div class="form-group">
						<label for="edit-todo-deadline-time">Time:</label>
						<input type="time" id="edit-todo-deadline-time" name="deadline_time">
					</div>
				</div>
			</div>
			<div class="form-group">
				<label>
					<input type="checkbox" id="edit-todo-completed" name="completed">
					Mark as completed
				</label>
			</div>
			<div class="modal-actions">
				<button type="button" id="cancel-edit" class="btn btn-secondary">Cancel</button>
				<button type="submit" class="btn btn-primary">Save Changes</button>
			</div>
		</form>
	</div>
</div>

<!-- Add Todo Modal -->
<div id="add-modal" class="modal hidden">
	<div class="modal-content">
		<div class="modal-header">
			<h3>Add New Todo</h3>
			<button id="close-add-modal" class="close-btn">&times;</button>
		</div>
		<form id="add-todo-form" class="todo-form">
			<div class="form-group">
				<label for="todo-description">Description:</label>
				<input type="text" id="todo-description" name="description" placeholder="Enter todo description..." required>
			</div>
			<div class="form-group">
				<label for="todo-category">Category (optional):</label>
				<select id="todo-category" name="category_id">
					<option value="">No category</option>
					<!-- Categories will be dynamically loaded here -->
				</select>
			</div>
			<div class="form-group">
				<label for="todo-priority">Priority:</label>
				<select id="todo-priority" name="priority">
					<option value="low">🔵 Low</option>
					<option value="medium">🟡 Medium</option>
					<option value="high">🔴 High</option>
				</select>
			</div>
			<div class="form-group">
				<label>Deadline (optional):</label>
				<div class="form-row">
					<div class="form-group">
						<label for="todo-deadline-date">Date:</label>
						<input type="date" id="todo-deadline-date" name="deadline_date">
					</div>
					<div class="form-group">
						<label for="todo-deadline-time">Time:</label>
						<input type="time" id="todo-deadline-time" name="deadline_time">
					</div>
				</div>
			</div>
			<div class="modal-actions">
				<button type="button" id="cancel-add" class="btn btn-secondary">Cancel</button>
				<button type="submit" class="btn btn-primary">Add Todo</button>
			</div>
		</form>
	</div>
</div>

<!-- Category Management Modal -->
<div id="categories-modal" class="modal hidden">
	<div class="modal-content modal-large">
		<div class="modal-header">
			<h3>Manage Categories</h3>
			<button id="close-categories-modal" class="close-btn">&times;</button>
		</div>
		<div class="modal-body">
			<!-- Add New Category Form -->
			<form id="add-category-form" class="category-form">
				<h4>Add New Category</h4>
				<div class="form-row">
					<div class="form-group">
						<label for="category-name">Name:</label>
						<input type="text" id="category-name" name="name" placeholder="Category name..." required>
					</div>
					<div class="form-group">
						<label for="category-color">Color:</label>
						<input type="color" id="category-color" name="color" value="#3498db">
					</div>
					<button type="submit" class="btn btn-primary">Add</button>
				</div>
			</form>

			<!-- Existing Categories -->
			<div class="existing-categories">
				<h4>Existing Categories</h4>
				<div id="categories-management-list" class="categories-management-list">
					<!-- Categories will be dynamically loaded here -->
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Template Modals -->
<!-- Add Template Modal -->
<div id="add-template-modal" class="modal hidden">
	<div class="modal-content modal-large">
		<div class="modal-header">
			<h3>Create Recurring Template</h3>
			<button id="close-add-template-modal" class="close-btn">&times;</button>
		</div>
		<div class="modal-body">
			<form id="add-template-form">
				<div class="form-group">
					<label for="template-description">Description:</label>
					<input type="text" id="template-description" name="description" placeholder="e.g., Take vitamins, Weekly meeting..." required>
				</div>
				
				<div class="form-row">
					<div class="form-group">
						<label for="template-category">Category:</label>
						<select id="template-category" name="category_id">
							<option value="">No category</option>
							<!-- Categories will be dynamically loaded here -->
						</select>
					</div>
					<div class="form-group">
						<label for="template-priority">Priority:</label>
						<select id="template-priority" name="priority">
							<option value="low">🔵 Low</option>
							<option value="medium">🟡 Medium</option>
							<option value="high">🔴 High</option>
						</select>
					</div>
				</div>

				<!-- Recurrence Pattern Builder -->
				<div class="recurrence-pattern-section">
					<h4>🔄 Recurrence Pattern</h4>
					
					<div class="form-group">
						<label for="recurrence-type">Repeat:</label>
						<select id="recurrence-type" name="recurrence_type" required>
							<option value="daily">Daily</option>
							<option value="weekly">Weekly</option>
							<option value="monthly">Monthly</option>
							<option value="yearly">Yearly</option>
						</select>
					</div>

					<div class="form-group">
						<label for="recurrence-interval">Every:</label>
						<div class="form-row">
							<input type="number" id="recurrence-interval" name="interval" value="1" min="1" max="365" required>
							<span id="interval-label">day(s)</span>
						</div>
					</div>

					<!-- Weekly Options -->
					<div id="weekly-options" class="recurrence-options hidden">
						<label>On days:</label>
						<div class="weekdays-selector">
							<label class="weekday-option">
								<input type="checkbox" name="weekdays" value="0"> Mon
							</label>
							<label class="weekday-option">
								<input type="checkbox" name="weekdays" value="1"> Tue
							</label>
							<label class="weekday-option">
								<input type="checkbox" name="weekdays" value="2"> Wed
							</label>
							<label class="weekday-option">
								<input type="checkbox" name="weekdays" value="3"> Thu
							</label>
							<label class="weekday-option">
								<input type="checkbox" name="weekdays" value="4"> Fri
							</label>
							<label class="weekday-option">
								<input type="checkbox" name="weekdays" value="5"> Sat
							</label>
							<label class="weekday-option">
								<input type="checkbox" name="weekdays" value="6"> Sun
							</label>
						</div>
					</div>

					<!-- Monthly Options -->
					<div id="monthly-options" class="recurrence-options hidden">
						<div class="form-group">
							<label for="monthly-type">Monthly pattern:</label>
							<select id="monthly-type" name="monthly_type">
								<option value="day_of_month">On specific day of month</option>
								<option value="weekday_of_month">On specific weekday</option>
							</select>
						</div>
						
						<div id="day-of-month-option">
							<div class="form-group">
								<label for="day-of-month">Day of month:</label>
								<input type="number" id="day-of-month" name="day_of_month" min="1" max="31" value="1">
							</div>
						</div>
						
						<div id="weekday-of-month-option" class="hidden">
							<div class="form-row">
								<div class="form-group">
									<label for="week-of-month">Week:</label>
									<select id="week-of-month" name="week_of_month">
										<option value="1">First</option>
										<option value="2">Second</option>
										<option value="3">Third</option>
										<option value="4">Fourth</option>
										<option value="-1">Last</option>
									</select>
								</div>
								<div class="form-group">
									<label for="weekday">Weekday:</label>
									<select id="weekday" name="weekday">
										<option value="0">Monday</option>
										<option value="1">Tuesday</option>
										<option value="2">Wednesday</option>
										<option value="3">Thursday</option>
										<option value="4">Friday</option>
										<option value="5">Saturday</option>
										<option value="6">Sunday</option>
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Yearly Options -->
					<div id="yearly-options" class="recurrence-options hidden">
						<div class="form-row">
							<div class="form-group">
								<label for="month-of-year">Month:</label>
								<select id="month-of-year" name="month_of_year">
									<option value="1">January</option>
									<option value="2">February</option>
									<option value="3">March</option>
									<option value="4">April</option>
									<option value="5">May</option>
									<option value="6">June</option>
									<option value="7">July</option>
									<option value="8">August</option>
									<option value="9">September</option>
									<option value="10">October</option>
									<option value="11">November</option>
									<option value="12">December</option>
								</select>
							</div>
							<div class="form-group">
								<label for="yearly-day">Day:</label>
								<input type="number" id="yearly-day" name="yearly_day" min="1" max="31" value="1">
							</div>
						</div>
					</div>

					<!-- Times of Day -->
					<div class="form-group">
						<label>Times of day:</label>
						<div id="times-of-day-container">
							<div class="time-input-group">
								<input type="time" name="times_of_day" value="09:00">
								<button type="button" class="btn btn-small btn-secondary remove-time">✕</button>
							</div>
						</div>
						<button type="button" id="add-time-btn" class="btn btn-small btn-secondary">+ Add Time</button>
					</div>

					<!-- Preview -->
					<div class="preview-section">
						<h5>Preview:</h5>
						<div id="recurrence-preview" class="recurrence-preview">
							Every day at 09:00
						</div>
					</div>
				</div>

				<div class="modal-actions">
					<button type="button" id="cancel-add-template" class="btn btn-secondary">Cancel</button>
					<button type="submit" class="btn btn-primary">Create Template</button>
				</div>
			</form>
		</div>
	</div>
</div>

<!-- Edit Template Modal -->
<div id="edit-template-modal" class="modal hidden">
	<div class="modal-content modal-large">
		<div class="modal-header">
			<h3>Edit Recurring Template</h3>
			<button id="close-edit-template-modal" class="close-btn">&times;</button>
		</div>
		<div class="modal-body">
			<form id="edit-template-form">
				<!-- Same form structure as add template, but for editing -->
				<div class="form-group">
					<label for="edit-template-description">Description:</label>
					<input type="text" id="edit-template-description" name="description" required>
				</div>
				
				<div class="form-row">
					<div class="form-group">
						<label for="edit-template-category">Category:</label>
						<select id="edit-template-category" name="category_id">
							<option value="">No category</option>
						</select>
					</div>
					<div class="form-group">
						<label for="edit-template-priority">Priority:</label>
						<select id="edit-template-priority" name="priority">
							<option value="low">🔵 Low</option>
							<option value="medium">🟡 Medium</option>
							<option value="high">🔴 High</option>
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>
						<input type="checkbox" id="edit-template-active" name="is_active">
						Template is active
					</label>
				</div>

				<div class="modal-actions">
					<button type="button" id="cancel-edit-template" class="btn btn-secondary">Cancel</button>
					<button type="submit" class="btn btn-primary">Update Template</button>
				</div>
			</form>
		</div>
	</div>
</div>

<!-- Template Preview Modal -->
<div id="template-preview-modal" class="modal hidden">
	<div class="modal-content">
		<div class="modal-header">
			<h3>Template Preview</h3>
			<button id="close-template-preview-modal" class="close-btn">&times;</button>
		</div>
		<div class="modal-body">
			<div id="template-preview-content">
				<!-- Preview content will be dynamically loaded -->
			</div>
			<div class="modal-actions">
				<button type="button" id="generate-from-preview" class="btn btn-primary">Generate Instances</button>
				<button type="button" id="close-preview" class="btn btn-secondary">Close</button>
			</div>
		</div>
	</div>
</div>