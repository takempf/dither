<script>
	import Nav from '#lib/components/nav.svelte';
</script>

<Nav />

<main class="layout">
	<slot></slot>
</main>

<style>
	.layout {
		max-width: 640px;
		margin: 0 auto 2em auto;
		border: var(--white) 1px dotted;
		border-radius: 0.25em;
	}
</style>
