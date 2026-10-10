<script lang="ts">
	import { page } from '$app/state';

	const { status, error } = page;
	const dev = process.env.NODE_ENV === 'development';
</script>

<svelte:head>
	<title>{status}</title>
</svelte:head>

<div class="errorPage">
	<div class="emoji">☹</div>

	<h1>{status}</h1>

	<p>{error?.message}</p>

	{#if dev && error?.stack}
		<pre>{error?.stack}</pre>
	{/if}
</div>

<style>
	.errorPage {
		min-height: 100vh;
		min-width: 100vw;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}
</style>
