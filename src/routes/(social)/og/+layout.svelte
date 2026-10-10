<script>
	import Nav from '#lib/components/nav.svelte';
</script>

<Nav />

<main class="layout">
	<slot></slot>
</main>

<style>
	.layout {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
