<script lang="ts">
	import { onMount } from 'svelte';
	import '../../styles.css';

	onMount(() => {
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
		}

		loadScriptsSequentially().catch(error => {
			console.error('Failed to load scripts:', error);
		});
	});
</script>

<div class="container">
	<header>
		<div class="header-content">
			<h1>📝 Nexodo</h1>
			<nav class="main-nav">
				<button id="nav-todos" class="nav-btn active">📝 Todos</button>
				<button id="nav-templates" class="nav-btn">🔄 Templates</button>
				<button id="nav-flashcards" class="nav-btn" on:click={() => window.location.href='/flashcards'}>🃏 Flashcards</button>
			</nav>
		</div>
		<div class="header-actions">
			<button id="theme-toggle" class="btn btn-secondary" title="Toggle dark/light mode">
				🌙
			</button>
			<button id="logout-btn" class="btn btn-secondary">
				🚪 Logout
			</button>
		</div>
	</header>

	<main>
		<!-- Todo System -->
		<div id="todo-system" class="system-view active">
			<!-- Add Todo Button -->
			<section class="add-todo-section">
				<button id="open-add-modal" class="btn btn-primary btn-large">
					➕ Add New Todo
				</button>
			</section>

			<!-- Categories Section -->
			<section class="categories-section">
				<div class="categories-header">
					<h3>📁 Categories</h3>
					<button id="manage-categories-btn" class="btn btn-secondary">
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
		<div id="templates-system" class="system-view hidden">
			<!-- Add Template Button -->
			<section class="add-template-section">
				<button id="open-add-template-modal" class="btn btn-primary btn-large">
					➕ Create New Template
				</button>
				<button id="generate-due-todos-btn" class="btn btn-secondary btn-large">
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
</div>