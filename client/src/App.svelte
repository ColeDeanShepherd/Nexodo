<script lang="ts">
	import Login from './Login.svelte';
	
	// For now, we'll just show the login component
	// Later this can be expanded to handle routing between login and main app
</script>

<Login />

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
		color: #333;
		background-color: #f5f7fa;
	}

	:global(#app) {
		min-height: 100vh;
		width: 100%;
	}
</style>