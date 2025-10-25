<script lang="ts">
	import { onMount } from 'svelte';

	let password: string = '';
	let errorMessage: string = '';
	let isLoading: boolean = false;
	let showError: boolean = false;
	let currentTheme: string = 'light';

	onMount(() => {
		// Initialize theme
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			setTheme(savedTheme);
		} else {
			detectSystemTheme();
		}

		// Listen for system theme changes
		if (window.matchMedia) {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', (e) => {
				const savedTheme = localStorage.getItem('theme');
				if (!savedTheme) {
					setTheme(e.matches ? 'dark' : 'light');
				}
			});
		}
	});

	function detectSystemTheme(): void {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			setTheme('dark');
		} else {
			setTheme('light');
		}
	}

	function setTheme(theme: string): void {
		currentTheme = theme;
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	function toggleTheme(): void {
		const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
	}

	async function handleSubmit(): Promise<void> {
		if (!password) {
			showErrorMessage('Please enter a password');
			return;
		}

		isLoading = true;
		hideError();

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ password }),
			});

			const data = await response.json();

			if (response.ok) {
				// Login successful, redirect to main app
				window.location.href = '/';
			} else {
				showErrorMessage(data.error || 'Login failed');
			}
		} catch (error) {
			console.error('Login error:', error);
			showErrorMessage('Connection error. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	function showErrorMessage(message: string): void {
		errorMessage = message;
		showError = true;
		setTimeout(() => {
			hideError();
		}, 5000);
	}

	function hideError(): void {
		showError = false;
	}

	// Auto-hide error when user starts typing
	function handlePasswordInput(): void {
		hideError();
	}
</script>

<div class="login-body">
	<div class="login-container">
		<div class="login-card">
			<header class="login-header">
				<div class="login-header-content">
					<h1>🔐 Nexodo</h1>
					<p>Enter your password to access your todos</p>
				</div>
				<button 
					type="button" 
					class="theme-toggle-btn"
					on:click={toggleTheme}
					title={currentTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
				>
					{currentTheme === 'light' ? '🌙' : '☀️'}
				</button>
			</header>

			<form on:submit|preventDefault={handleSubmit} class="login-form">
				{#if showError}
					<div class="error-message">{errorMessage}</div>
				{/if}
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input 
						type="password" 
						id="password"
						bind:value={password}
						on:input={handlePasswordInput}
						placeholder="Enter your password..." 
						required 
						autofocus
						disabled={isLoading}
					>
				</div>

				<button 
					type="submit" 
					class="btn btn-primary btn-large"
					disabled={isLoading}
				>
					{isLoading ? '🔄 Logging in...' : '🚀 Login'}
				</button>
			</form>

			<div class="login-footer">
				<p>Your todos are protected and private</p>
			</div>
		</div>
	</div>
</div>

<style>
	.login-body {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		transition: background 0.3s ease;
	}

	.login-container {
		width: 100%;
		max-width: 400px;
	}

	.login-card {
		background: var(--surface-color, white);
		border-radius: 16px;
		box-shadow: 0 20px 40px var(--shadow-color, rgba(0, 0, 0, 0.15));
		overflow: hidden;
		animation: slideInUp 0.6s ease-out;
	}

	.login-header {
		text-align: center;
		padding: 40px 30px 20px;
		background: linear-gradient(135deg, var(--secondary-color, #f5f7fa) 0%, #c3cfe2 100%);
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.login-header-content {
		flex: 1;
		text-align: center;
	}

	.login-header h1 {
		font-size: 2.5rem;
		color: var(--text-dark, #2c3e50);
		margin-bottom: 10px;
	}

	.login-header p {
		color: var(--text-muted, #7f8c8d);
		font-size: 1rem;
	}

	.theme-toggle-btn {
		background: none;
		border: 2px solid var(--border-color, #e1e8ed);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1.2rem;
		transition: all 0.3s ease;
		background-color: var(--surface-color, white);
	}

	.theme-toggle-btn:hover {
		border-color: var(--primary-color, #3498db);
		transform: scale(1.1);
	}

	.login-form {
		padding: 30px;
	}

	.form-group {
		margin-bottom: 25px;
	}

	.form-group label {
		display: block;
		margin-bottom: 5px;
		font-weight: 600;
		color: var(--text-dark, #2c3e50);
	}

	.form-group input {
		width: 100%;
		padding: 12px;
		border: 2px solid var(--border-color, #e1e8ed);
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.3s ease;
		box-sizing: border-box;
		background-color: var(--surface-color, white);
		color: var(--text-color, #333);
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--primary-color, #3498db);
	}

	.form-group input:disabled {
		background-color: var(--secondary-color, #f8f9fa);
		cursor: not-allowed;
	}

	.btn {
		padding: 12px 24px;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		text-decoration: none;
		display: inline-block;
		text-align: center;
	}

	.btn-primary {
		background-color: var(--primary-color, #3498db);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--primary-color-hover, #2980b9);
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
	}

	.btn-primary:disabled {
		background-color: #bdc3c7;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.btn-large {
		width: 100%;
		margin-top: 10px;
		font-size: 1.1rem;
		padding: 16px;
	}

	.login-footer {
		text-align: center;
		padding: 20px 30px 30px;
		color: var(--text-muted, #7f8c8d);
		font-size: 0.9rem;
		border-top: 1px solid var(--border-color, #ecf0f1);
	}

	.error-message {
		background-color: var(--danger-color, #e74c3c);
		color: white;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
		font-weight: 500;
		text-align: center;
	}

	/* Login animations */
	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Login responsive design */
	@media (max-width: 480px) {
		.login-container {
			padding: 0 10px;
		}
		
		.login-header {
			padding: 30px 20px 15px;
			flex-direction: column;
			gap: 15px;
		}
		
		.login-header h1 {
			font-size: 2rem;
		}
		
		.login-form {
			padding: 20px;
		}

		.theme-toggle-btn {
			align-self: center;
		}
	}
</style>