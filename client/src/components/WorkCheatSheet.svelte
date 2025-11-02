<script lang="ts">
	// Work Cheat Sheet component
	// This is an empty component that can be manually customized
</script>

<div class="work-cheat-sheet">
	<div class="cheat-sheet-header">
		<h2>📋 Work Cheat Sheet</h2>
		<p class="cheat-sheet-subtitle">Quick reference and notes for work</p>
	</div>

	<div class="cheat-sheet-content">
		<div class="cheat-sheet-section">
			<h3>🚀 Quick Commands</h3>
			<div class="cheat-sheet-grid">
				<!-- Add your own content here -->
				<div class="cheat-sheet-card">
					<h4>Example Section</h4>
					<p>You can add your own content here. Edit this component to customize it for your needs.</p>
				</div>
			</div>
		</div>

		<div class="cheat-sheet-section">
			<h3>📝 Notes</h3>
			<div class="cheat-sheet-notes">
				<p>Add your own notes and reminders here...</p>
			</div>
		</div>

		<div class="cheat-sheet-section">
			<h3>🔗 Quick Links</h3>
			<div class="cheat-sheet-links">
				<p>Add your frequently used links here...</p>
			</div>
		</div>
	</div>
</div>

<style>
	.work-cheat-sheet {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.cheat-sheet-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--border-color, #e1e5e9);
	}

	.cheat-sheet-header h2 {
		margin: 0 0 0.5rem 0;
		color: var(--text-color, #2c3e50);
		font-size: 2rem;
	}

	.cheat-sheet-subtitle {
		margin: 0;
		color: var(--text-muted, #7f8c8d);
		font-size: 1.1rem;
	}

	.cheat-sheet-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.cheat-sheet-section {
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.cheat-sheet-section h3 {
		margin: 0 0 1rem 0;
		color: var(--primary-color, #3498db);
		font-size: 1.3rem;
		border-bottom: 1px solid var(--border-color, #e1e5e9);
		padding-bottom: 0.5rem;
	}

	.cheat-sheet-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.cheat-sheet-card {
		background: var(--input-bg, #f8f9fa);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 6px;
		padding: 1rem;
	}

	.cheat-sheet-card h4 {
		margin: 0 0 0.5rem 0;
		color: var(--text-color, #2c3e50);
		font-size: 1.1rem;
	}

	.cheat-sheet-card p {
		margin: 0;
		color: var(--text-muted, #7f8c8d);
		line-height: 1.5;
	}

	.cheat-sheet-notes,
	.cheat-sheet-links {
		background: var(--input-bg, #f8f9fa);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 6px;
		padding: 1rem;
		min-height: 100px;
	}

	.cheat-sheet-notes p,
	.cheat-sheet-links p {
		margin: 0;
		color: var(--text-muted, #7f8c8d);
		font-style: italic;
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.cheat-sheet-section {
			background: var(--card-bg, #2c3e50);
			border-color: var(--border-color, #34495e);
		}

		.cheat-sheet-card,
		.cheat-sheet-notes,
		.cheat-sheet-links {
			background: var(--input-bg, #34495e);
			border-color: var(--border-color, #4a5f7a);
		}
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.work-cheat-sheet {
			padding: 1rem;
		}

		.cheat-sheet-header h2 {
			font-size: 1.5rem;
		}

		.cheat-sheet-grid {
			grid-template-columns: 1fr;
		}
	}
</style>