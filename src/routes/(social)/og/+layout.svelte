<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<main class="layout">
	{@render children()}
</main>

<style>
	.layout {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
