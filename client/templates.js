// Recurring Templates Management System

// State for templates
let templates = [];
let currentEditingTemplate = null;

// Template DOM Elements
const templatesSystem = document.getElementById('templates-system');
const openAddTemplateBtn = document.getElementById('open-add-template-modal');
const generateDueTodosBtn = document.getElementById('generate-due-todos-btn');
const templatesCount = document.getElementById('templates-count');
const templatesList = document.getElementById('templates-list');
const templatesLoading = document.getElementById('templates-loading');
const templatesError = document.getElementById('templates-error');
const templatesEmptyState = document.getElementById('templates-empty-state');

// Modal elements
const addTemplateModal = document.getElementById('add-template-modal');
const addTemplateForm = document.getElementById('add-template-form');
const editTemplateModal = document.getElementById('edit-template-modal');
const editTemplateForm = document.getElementById('edit-template-form');
const templatePreviewModal = document.getElementById('template-preview-modal');

// Recurrence pattern elements
const recurrenceTypeSelect = document.getElementById('recurrence-type');
const recurrenceIntervalInput = document.getElementById('recurrence-interval');
const intervalLabel = document.getElementById('interval-label');
const weeklyOptions = document.getElementById('weekly-options');
const monthlyOptions = document.getElementById('monthly-options');
const yearlyOptions = document.getElementById('yearly-options');
const monthlyTypeSelect = document.getElementById('monthly-type');
const dayOfMonthOption = document.getElementById('day-of-month-option');
const weekdayOfMonthOption = document.getElementById('weekday-of-month-option');
const timesOfDayContainer = document.getElementById('times-of-day-container');
const addTimeBtn = document.getElementById('add-time-btn');
const recurrencePreview = document.getElementById('recurrence-preview');

// Navigation
const navTemplatesBtn = document.getElementById('nav-templates');

// Initialize templates system
function initTemplatesSystem() {
    if (!templatesSystem) return;
    
    setupTemplateEventListeners();
    
    // Load templates when the page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadTemplates);
    } else {
        loadTemplates();
    }
}

// Event Listeners
function setupTemplateEventListeners() {
    // Note: Navigation is handled by main script.js
    
    // Template management buttons
    if (openAddTemplateBtn) {
        openAddTemplateBtn.addEventListener('click', openAddTemplateModal);
    }
    
    if (generateDueTodosBtn) {
        generateDueTodosBtn.addEventListener('click', generateDueTodos);
    }
    
    // Modal controls
    setupModalControls();
    
    // Form submissions
    if (addTemplateForm) {
        addTemplateForm.addEventListener('submit', handleAddTemplate);
    }
    
    if (editTemplateForm) {
        editTemplateForm.addEventListener('submit', handleEditTemplate);
    }
    
    // Recurrence pattern builder
    setupRecurrencePatternBuilder();
}

function setupModalControls() {
    // Add template modal
    const closeAddTemplateModal = document.getElementById('close-add-template-modal');
    const cancelAddTemplate = document.getElementById('cancel-add-template');
    
    if (closeAddTemplateModal) {
        closeAddTemplateModal.addEventListener('click', closeAddTemplateModalFunc);
    }
    
    if (cancelAddTemplate) {
        cancelAddTemplate.addEventListener('click', closeAddTemplateModalFunc);
    }
    
    // Edit template modal
    const closeEditTemplateModal = document.getElementById('close-edit-template-modal');
    const cancelEditTemplate = document.getElementById('cancel-edit-template');
    
    if (closeEditTemplateModal) {
        closeEditTemplateModal.addEventListener('click', closeEditTemplateModalFunc);
    }
    
    if (cancelEditTemplate) {
        cancelEditTemplate.addEventListener('click', closeEditTemplateModalFunc);
    }
    
    // Preview modal
    const closeTemplatePreviewModal = document.getElementById('close-template-preview-modal');
    const closePreview = document.getElementById('close-preview');
    const generateFromPreview = document.getElementById('generate-from-preview');
    
    if (closeTemplatePreviewModal) {
        closeTemplatePreviewModal.addEventListener('click', closeTemplatePreviewModalFunc);
    }
    
    if (closePreview) {
        closePreview.addEventListener('click', closeTemplatePreviewModalFunc);
    }
    
    if (generateFromPreview) {
        generateFromPreview.addEventListener('click', handleGenerateFromPreview);
    }
}

function setupRecurrencePatternBuilder() {
    if (!recurrenceTypeSelect) return;
    
    // Recurrence type change
    recurrenceTypeSelect.addEventListener('change', updateRecurrenceOptions);
    
    // Interval change
    if (recurrenceIntervalInput) {
        recurrenceIntervalInput.addEventListener('input', updateRecurrencePreview);
    }
    
    // Monthly type change
    if (monthlyTypeSelect) {
        monthlyTypeSelect.addEventListener('change', updateMonthlyOptions);
    }
    
    // Add time button
    if (addTimeBtn) {
        addTimeBtn.addEventListener('click', addTimeInput);
    }
    
    // Listen for changes to update preview
    if (addTemplateForm) {
        addTemplateForm.addEventListener('input', updateRecurrencePreview);
        addTemplateForm.addEventListener('change', updateRecurrencePreview);
    }
    
    // Initialize with default state
    updateRecurrenceOptions();
    updateRecurrencePreview();
}

// Navigation Functions
function switchToTemplatesView() {
    // Use the main switchToView function if available
    if (window.switchToView) {
        window.switchToView('templates');
        return;
    }
    
    // Fallback: manual navigation
    const todoSystem = document.getElementById('todo-system');
    if (todoSystem) todoSystem.classList.remove('active');
    
    // Show templates system
    if (templatesSystem) {
        templatesSystem.classList.add('active');
    }
    
    // Update navigation buttons
    const navTodosBtn = document.getElementById('nav-todos');
    if (navTodosBtn) navTodosBtn.classList.remove('active');
    if (navTemplatesBtn) navTemplatesBtn.classList.add('active');
    
    // Load templates
    loadTemplates();
}

function switchToTodosView() {
    // Use the main switchToView function if available
    if (window.switchToView) {
        window.switchToView('todos');
        return;
    }
    
    // Fallback: manual navigation
    if (templatesSystem) templatesSystem.classList.remove('active');
    
    // Show todo system
    const todoSystem = document.getElementById('todo-system');
    if (todoSystem) todoSystem.classList.add('active');
    
    // Update navigation buttons
    if (navTemplatesBtn) navTemplatesBtn.classList.remove('active');
    const navTodosBtn = document.getElementById('nav-todos');
    if (navTodosBtn) navTodosBtn.classList.add('active');
}

// API Functions
async function loadTemplates() {
    if (!templatesLoading) return;
    
    showTemplatesLoading(true);
    hideTemplatesError();
    
    try {
        templates = await apiCall('/recurring-templates');
        renderTemplates();
        updateTemplatesStats();
    } catch (error) {
        console.error('Failed to load templates:', error);
        showTemplatesError('Failed to load templates. Please try again.');
    } finally {
        showTemplatesLoading(false);
    }
}

async function createTemplate(templateData) {
    const newTemplate = await apiCall('/recurring-templates', {
        method: 'POST',
        body: JSON.stringify(templateData)
    });
    templates.unshift(newTemplate);
    renderTemplates();
    updateTemplatesStats();
    return newTemplate;
}

async function updateTemplate(templateId, templateData) {
    const updatedTemplate = await apiCall(`/recurring-templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(templateData)
    });
    
    const index = templates.findIndex(t => t.id === templateId);
    if (index !== -1) {
        templates[index] = updatedTemplate;
        renderTemplates();
        updateTemplatesStats();
    }
    
    return updatedTemplate;
}

async function deleteTemplate(templateId) {
    await apiCall(`/recurring-templates/${templateId}`, {
        method: 'DELETE'
    });
    
    templates = templates.filter(t => t.id !== templateId);
    renderTemplates();
    updateTemplatesStats();
}

async function generateTemplateInstances(templateId, options = {}) {
    const result = await apiCall(`/recurring-templates/${templateId}/generate`, {
        method: 'POST',
        body: JSON.stringify(options)
    });
    return result;
}

async function previewTemplate(templateId, options = {}) {
    const result = await apiCall(`/recurring-templates/${templateId}/preview?${new URLSearchParams(options)}`);
    return result;
}

async function generateDueTodos() {
    try {
        showLoading(true);
        const result = await apiCall('/generate-due-todos', {
            method: 'POST'
        });
        
        showSuccess(`Generated ${result.generated_count} new todos!`);
        
        // Refresh todos list if we're on the todos view
        if (window.loadTodos) {
            loadTodos();
        }
    } catch (error) {
        console.error('Failed to generate due todos:', error);
        showError('Failed to generate due todos. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Rendering Functions
function renderTemplates() {
    if (!templatesList) return;
    
    if (templates.length === 0) {
        templatesList.innerHTML = '';
        showTemplatesEmptyState(true);
        return;
    }
    
    showTemplatesEmptyState(false);
    
    templatesList.innerHTML = templates.map(template => `
        <div class="template-item ${template.is_active ? '' : 'inactive'}">
            <div class="template-content">
                <div class="template-description">${escapeHtml(template.description)}</div>
                <div class="template-meta">
                    <span class="template-priority">
                        ${getPriorityIcon(template.priority)} ${template.priority}
                    </span>
                    ${template.category ? `
                        <span class="template-category" style="background-color: ${template.category.color}20; color: ${template.category.color}">
                            📁 ${escapeHtml(template.category.name)}
                        </span>
                    ` : ''}
                    <span class="template-schedule">${formatRecurrencePattern(template.recurrence_pattern)}</span>
                </div>
            </div>
            <div class="template-actions">
                <span class="template-status ${template.is_active ? 'active' : 'inactive'}">
                    ${template.is_active ? 'Active' : 'Inactive'}
                </span>
                <button class="btn btn-small btn-secondary" onclick="previewTemplateModal(${template.id})">
                    👁️ Preview
                </button>
                <button class="btn btn-small btn-secondary" onclick="generateInstancesFromTemplate(${template.id})">
                    🔄 Generate
                </button>
                <button class="btn btn-small btn-secondary" onclick="editTemplate(${template.id})">
                    ✏️ Edit
                </button>
                <button class="btn btn-small btn-danger" onclick="confirmDeleteTemplate(${template.id})">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

function updateTemplatesStats() {
    if (!templatesCount) return;
    
    const activeCount = templates.filter(t => t.is_active).length;
    const totalCount = templates.length;
    
    templatesCount.textContent = `${totalCount} template${totalCount !== 1 ? 's' : ''} (${activeCount} active)`;
}

// Helper Functions
function formatRecurrencePattern(pattern) {
    const type = pattern.recurrence_type;
    const interval = pattern.interval || 1;
    const times = pattern.times_of_day || [];
    
    let baseText = '';
    
    switch (type) {
        case 'daily':
            baseText = interval === 1 ? 'Daily' : `Every ${interval} days`;
            break;
        case 'weekly':
            if (pattern.weekdays && pattern.weekdays.length > 0) {
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const selectedDays = pattern.weekdays.map(d => dayNames[d]).join(', ');
                baseText = interval === 1 ? `Weekly on ${selectedDays}` : `Every ${interval} weeks on ${selectedDays}`;
            } else {
                baseText = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
            }
            break;
        case 'monthly':
            if (pattern.day_of_month) {
                baseText = interval === 1 ? 
                    `Monthly on ${ordinal(pattern.day_of_month)}` : 
                    `Every ${interval} months on ${ordinal(pattern.day_of_month)}`;
            } else {
                baseText = interval === 1 ? 'Monthly' : `Every ${interval} months`;
            }
            break;
        case 'yearly':
            if (pattern.month_of_year && pattern.day_of_month) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                baseText = `Yearly on ${monthNames[pattern.month_of_year - 1]} ${pattern.day_of_month}`;
            } else {
                baseText = 'Yearly';
            }
            break;
        default:
            baseText = 'Custom pattern';
    }
    
    if (times.length > 0) {
        baseText += ` at ${times.join(', ')}`;
    }
    
    return baseText;
}

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getPriorityIcon(priority) {
    switch (priority) {
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '🔵';
        default: return '⚪';
    }
}

// UI State Functions
function showTemplatesLoading(show) {
    if (templatesLoading) {
        templatesLoading.classList.toggle('hidden', !show);
    }
}

function showTemplatesError(message) {
    if (templatesError) {
        templatesError.textContent = message;
        templatesError.classList.remove('hidden');
    }
}

function hideTemplatesError() {
    if (templatesError) {
        templatesError.classList.add('hidden');
    }
}

function showTemplatesEmptyState(show) {
    if (templatesEmptyState) {
        templatesEmptyState.classList.toggle('hidden', !show);
    }
}

// Modal Functions
function openAddTemplateModal() {
    if (!addTemplateModal) return;
    
    // Reset form
    if (addTemplateForm) {
        addTemplateForm.reset();
        
        // Set default values
        document.getElementById('template-priority').value = 'medium';
        document.getElementById('recurrence-type').value = 'daily';
        document.getElementById('recurrence-interval').value = '1';
        
        // Reset times of day to just one default time
        resetTimesOfDay();
        
        // Update options and preview
        updateRecurrenceOptions();
        updateRecurrencePreview();
        
        // Load categories
        populateTemplateCategories('template-category');
    }
    
    addTemplateModal.classList.remove('hidden');
}

function closeAddTemplateModalFunc() {
    if (addTemplateModal) {
        addTemplateModal.classList.add('hidden');
    }
}

function closeEditTemplateModalFunc() {
    if (editTemplateModal) {
        editTemplateModal.classList.add('hidden');
    }
    currentEditingTemplate = null;
}

function closeTemplatePreviewModalFunc() {
    if (templatePreviewModal) {
        templatePreviewModal.classList.add('hidden');
    }
}

// Continue in part 2...

// Form Handling Functions
async function handleAddTemplate(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(addTemplateForm);
        const templateData = buildTemplateData(formData);
        
        await createTemplate(templateData);
        closeAddTemplateModalFunc();
        showSuccess('Template created successfully!');
    } catch (error) {
        console.error('Failed to create template:', error);
        showError('Failed to create template. Please check your input and try again.');
    }
}

async function handleEditTemplate(event) {
    event.preventDefault();
    
    if (!currentEditingTemplate) return;
    
    try {
        const formData = new FormData(editTemplateForm);
        const templateData = buildEditTemplateData(formData);
        
        await updateTemplate(currentEditingTemplate.id, templateData);
        closeEditTemplateModalFunc();
        showSuccess('Template updated successfully!');
    } catch (error) {
        console.error('Failed to update template:', error);
        showError('Failed to update template. Please check your input and try again.');
    }
}

function buildTemplateData(formData) {
    const data = {
        description: formData.get('description'),
        priority: formData.get('priority'),
        category_id: formData.get('category_id') || null,
        is_active: true,
        recurrence_pattern: buildRecurrencePattern(formData)
    };
    
    // Remove empty category_id
    if (!data.category_id) {
        delete data.category_id;
    }
    
    return data;
}

function buildEditTemplateData(formData) {
    const data = {
        description: formData.get('description'),
        priority: formData.get('priority'),
        category_id: formData.get('category_id') || null,
        is_active: formData.get('is_active') === 'on'
    };
    
    // Remove empty category_id
    if (!data.category_id) {
        delete data.category_id;
    }
    
    return data;
}

function buildRecurrencePattern(formData) {
    const pattern = {
        recurrence_type: formData.get('recurrence_type'),
        interval: parseInt(formData.get('interval')) || 1,
        times_of_day: Array.from(formData.getAll('times_of_day')).filter(time => time)
    };
    
    // Add type-specific fields
    switch (pattern.recurrence_type) {
        case 'weekly':
            const weekdays = Array.from(formData.getAll('weekdays')).map(day => parseInt(day));
            if (weekdays.length > 0) {
                pattern.weekdays = weekdays;
            }
            break;
            
        case 'monthly':
            const monthlyType = formData.get('monthly_type');
            pattern.monthly_type = monthlyType;
            
            if (monthlyType === 'day_of_month') {
                pattern.day_of_month = parseInt(formData.get('day_of_month')) || 1;
            } else if (monthlyType === 'weekday_of_month') {
                pattern.weekday = parseInt(formData.get('weekday')) || 0;
                pattern.week_of_month = parseInt(formData.get('week_of_month')) || 1;
            }
            break;
            
        case 'yearly':
            pattern.month_of_year = parseInt(formData.get('month_of_year')) || 1;
            pattern.day_of_month = parseInt(formData.get('yearly_day')) || 1;
            break;
    }
    
    return pattern;
}

// Recurrence Pattern Builder Functions
function updateRecurrenceOptions() {
    if (!recurrenceTypeSelect) return;
    
    const type = recurrenceTypeSelect.value;
    
    // Hide all options first
    if (weeklyOptions) weeklyOptions.classList.add('hidden');
    if (monthlyOptions) monthlyOptions.classList.add('hidden');
    if (yearlyOptions) yearlyOptions.classList.add('hidden');
    
    // Update interval label
    updateIntervalLabel(type);
    
    // Show relevant options
    switch (type) {
        case 'weekly':
            if (weeklyOptions) weeklyOptions.classList.remove('hidden');
            break;
        case 'monthly':
            if (monthlyOptions) monthlyOptions.classList.remove('hidden');
            updateMonthlyOptions();
            break;
        case 'yearly':
            if (yearlyOptions) yearlyOptions.classList.remove('hidden');
            break;
    }
    
    updateRecurrencePreview();
}

function updateIntervalLabel(type) {
    if (!intervalLabel) return;
    
    const interval = parseInt(recurrenceIntervalInput?.value) || 1;
    
    switch (type) {
        case 'daily':
            intervalLabel.textContent = interval === 1 ? 'day' : 'days';
            break;
        case 'weekly':
            intervalLabel.textContent = interval === 1 ? 'week' : 'weeks';
            break;
        case 'monthly':
            intervalLabel.textContent = interval === 1 ? 'month' : 'months';
            break;
        case 'yearly':
            intervalLabel.textContent = interval === 1 ? 'year' : 'years';
            break;
        default:
            intervalLabel.textContent = 'period(s)';
    }
}

function updateMonthlyOptions() {
    if (!monthlyTypeSelect || !dayOfMonthOption || !weekdayOfMonthOption) return;
    
    const monthlyType = monthlyTypeSelect.value;
    
    if (monthlyType === 'day_of_month') {
        dayOfMonthOption.classList.remove('hidden');
        weekdayOfMonthOption.classList.add('hidden');
    } else {
        dayOfMonthOption.classList.add('hidden');
        weekdayOfMonthOption.classList.remove('hidden');
    }
    
    updateRecurrencePreview();
}

function addTimeInput() {
    if (!timesOfDayContainer) return;
    
    const timeGroup = document.createElement('div');
    timeGroup.className = 'time-input-group';
    timeGroup.innerHTML = `
        <input type="time" name="times_of_day" value="09:00">
        <button type="button" class="btn btn-small btn-secondary remove-time">✕</button>
    `;
    
    const removeBtn = timeGroup.querySelector('.remove-time');
    removeBtn.addEventListener('click', () => {
        timeGroup.remove();
        updateRecurrencePreview();
    });
    
    timesOfDayContainer.appendChild(timeGroup);
    updateRecurrencePreview();
}

function resetTimesOfDay() {
    if (!timesOfDayContainer) return;
    
    timesOfDayContainer.innerHTML = `
        <div class="time-input-group">
            <input type="time" name="times_of_day" value="09:00">
            <button type="button" class="btn btn-small btn-secondary remove-time">✕</button>
        </div>
    `;
    
    // Add event listener to the remove button
    const removeBtn = timesOfDayContainer.querySelector('.remove-time');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            // Don't remove if it's the only time input
            if (timesOfDayContainer.children.length > 1) {
                e.target.closest('.time-input-group').remove();
                updateRecurrencePreview();
            }
        });
    }
}

function updateRecurrencePreview() {
    if (!recurrencePreview || !addTemplateForm) return;
    
    try {
        const formData = new FormData(addTemplateForm);
        const pattern = buildRecurrencePattern(formData);
        const preview = formatRecurrencePattern(pattern);
        recurrencePreview.textContent = preview;
    } catch (error) {
        recurrencePreview.textContent = 'Invalid pattern';
    }
}

// Template Action Functions
async function editTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template || !editTemplateModal || !editTemplateForm) return;
    
    currentEditingTemplate = template;
    
    // Populate form with template data
    document.getElementById('edit-template-description').value = template.description;
    document.getElementById('edit-template-priority').value = template.priority;
    document.getElementById('edit-template-active').checked = template.is_active;
    
    // Populate categories
    await populateTemplateCategories('edit-template-category');
    
    // Set category if exists
    if (template.category_id) {
        document.getElementById('edit-template-category').value = template.category_id;
    }
    
    editTemplateModal.classList.remove('hidden');
}

async function confirmDeleteTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    const confirmed = confirm(`Are you sure you want to delete the template "${template.description}"? This will also delete any associated todos.`);
    
    if (confirmed) {
        try {
            await deleteTemplate(templateId);
            showSuccess('Template deleted successfully!');
        } catch (error) {
            console.error('Failed to delete template:', error);
            showError('Failed to delete template. Please try again.');
        }
    }
}

async function generateInstancesFromTemplate(templateId) {
    try {
        const options = {
            days_ahead: 7,
            max_instances: 10
        };
        
        const result = await generateTemplateInstances(templateId, options);
        showSuccess(`Generated ${result.generated_count} new todos!`);
        
        // Refresh todos list if we're on the todos view
        if (window.loadTodos) {
            loadTodos();
        }
    } catch (error) {
        console.error('Failed to generate instances:', error);
        showError('Failed to generate todo instances. Please try again.');
    }
}

async function previewTemplateModal(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template || !templatePreviewModal) return;
    
    try {
        const options = {
            days_ahead: 14,
            max_count: 10
        };
        
        const result = await previewTemplate(templateId, options);
        
        // Populate preview modal
        const previewContent = document.getElementById('template-preview-content');
        if (previewContent) {
            previewContent.innerHTML = `
                <div class="preview-template-info">
                    <h4>${escapeHtml(template.description)}</h4>
                    <p><strong>Pattern:</strong> ${formatRecurrencePattern(template.recurrence_pattern)}</p>
                    <p><strong>Priority:</strong> ${getPriorityIcon(template.priority)} ${template.priority}</p>
                    ${template.category ? `<p><strong>Category:</strong> 📁 ${escapeHtml(template.category.name)}</p>` : ''}
                    <p><strong>Status:</strong> ${template.is_active ? '✅ Active' : '❌ Inactive'}</p>
                </div>
                
                <div class="preview-occurrences">
                    <h4>Next ${result.occurrences.length} Occurrences:</h4>
                    ${result.occurrences.map(occurrence => {
                        const date = new Date(occurrence);
                        return `
                            <div class="occurrence-item">
                                <span class="occurrence-date">${date.toLocaleDateString()}</span>
                                <span class="occurrence-time">${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // Store template ID for generate button
        const generateBtn = document.getElementById('generate-from-preview');
        if (generateBtn) {
            generateBtn.dataset.templateId = templateId;
        }
        
        templatePreviewModal.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to preview template:', error);
        showError('Failed to preview template. Please try again.');
    }
}

async function handleGenerateFromPreview() {
    const generateBtn = document.getElementById('generate-from-preview');
    const templateId = generateBtn?.dataset.templateId;
    
    if (templateId) {
        await generateInstancesFromTemplate(parseInt(templateId));
        closeTemplatePreviewModalFunc();
    }
}

// Utility Functions
async function populateTemplateCategories(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        // Use existing categories if already loaded
        let categoriesToUse = window.categories || [];
        
        // If categories not loaded, fetch them
        if (categoriesToUse.length === 0 && window.loadCategories) {
            await window.loadCategories();
            categoriesToUse = window.categories || [];
        }
        
        // Clear existing options except the first (no category)
        const firstOption = select.firstElementChild;
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }
        
        // Add category options
        categoriesToUse.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load categories for template form:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTemplatesSystem);
} else {
    initTemplatesSystem();
}

// Make functions globally available for onclick handlers
window.editTemplate = editTemplate;
window.confirmDeleteTemplate = confirmDeleteTemplate;
window.generateInstancesFromTemplate = generateInstancesFromTemplate;
window.previewTemplateModal = previewTemplateModal;
window.switchToTemplatesView = switchToTemplatesView;
window.switchToTodosView = switchToTodosView;
window.loadTemplates = loadTemplates;