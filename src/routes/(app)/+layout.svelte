<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<main class="layout">
	{@render children()}
</main>

<style>
	.layout {
		max-width: 640px;
		margin: 0 auto 2em auto;
		border: var(--white) 1px dotted;
		border-radius: 0.25em;
	}
</style>
