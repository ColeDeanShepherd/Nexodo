<script lang="ts">
	import { onMount } from 'svelte';
	import Login from './Login.svelte';
	import MainApp from './components/MainApp.svelte';
	
	let isAuthenticated = false;
	let isLoading = true;

	onMount(async () => {
		// Check authentication status
		try {
			const response = await fetch('/api/auth-status');
			const data = await response.json();
			isAuthenticated = data.authenticated;
		} catch (error) {
			console.error('Auth check failed:', error);
			isAuthenticated = false;
		}
		isLoading = false;
	});

	function handleLogin() {
		isAuthenticated = true;
	}
</script>

{#if isLoading}
	<div class="loading">Loading...</div>
{:else if isAuthenticated}
	<MainApp />
{:else}
	<Login on:login={handleLogin} />
{/if}

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
	}

	:global(body) {
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		line-height: 1.6;
		color: var(--text-color, #333);
		background-color: var(--background-color, #f5f7fa);
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	:global(#app) {
		min-height: 100vh;
		width: 100%;
	}
</style>