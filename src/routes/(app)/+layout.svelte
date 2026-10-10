<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<!-- padding, not margin: body has a fixed height, so a bottom margin past it adds no scroll room -->
<div class="layout-container">
	<main class="layout">
		{@render children()}
	</main>
</div>

<style>
	.layout-container {
		padding-bottom: 2em;
	}

	.layout {
		max-width: 640px;
		margin: 0 auto;
		border: var(--white) 1px dotted;
		border-radius: 0.25em;
	}
</style>
