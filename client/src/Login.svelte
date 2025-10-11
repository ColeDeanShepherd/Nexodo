<script>
	let password = '';
	let errorMessage = '';
	let isLoading = false;
	let showError = false;

	async function handleSubmit() {
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

	function showErrorMessage(message) {
		errorMessage = message;
		showError = true;
		setTimeout(() => {
			hideError();
		}, 5000);
	}

	function hideError() {
		showError = false;
	}

	// Auto-hide error when user starts typing
	function handlePasswordInput() {
		hideError();
	}
</script>

<div class="login-body">
	<div class="login-container">
		<div class="login-card">
			<header class="login-header">
				<h1>🔐 Nexodo</h1>
				<p>Enter your password to access your todos</p>
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
	}

	.login-container {
		width: 100%;
		max-width: 400px;
	}

	.login-card {
		background: white;
		border-radius: 16px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		animation: slideInUp 0.6s ease-out;
	}

	.login-header {
		text-align: center;
		padding: 40px 30px 20px;
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
	}

	.login-header h1 {
		font-size: 2.5rem;
		color: #2c3e50;
		margin-bottom: 10px;
	}

	.login-header p {
		color: #7f8c8d;
		font-size: 1rem;
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
		color: #2c3e50;
	}

	.form-group input {
		width: 100%;
		padding: 12px;
		border: 2px solid #e1e8ed;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.3s ease;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #3498db;
	}

	.form-group input:disabled {
		background-color: #f8f9fa;
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
		background-color: #3498db;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2980b9;
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
		color: #7f8c8d;
		font-size: 0.9rem;
		border-top: 1px solid #ecf0f1;
	}

	.error-message {
		background-color: #e74c3c;
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
		}
		
		.login-header h1 {
			font-size: 2rem;
		}
		
		.login-form {
			padding: 20px;
		}
	}
</style>