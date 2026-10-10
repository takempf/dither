<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status}</title>
</svelte:head>

<div class="errorPage">
	<div class="emoji">☹</div>

	<h1>{page.status}</h1>

	<p>{page.error?.message}</p>
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
