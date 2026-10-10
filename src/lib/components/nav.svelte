<script lang="ts">
	import { onMount } from 'svelte';

	let ColorPaletteSelector: any = $state(null); // Initially 'any', will be asserted later

	onMount(async () => {
		const module = await import('./color-palette-selector.svelte');
		ColorPaletteSelector = module.default as typeof module.default; // Type assertion
	});
</script>

<nav class="nav">
	<a href="/" class="app-name">Dither <span class="alpha-tag">alpha</span></a>
	{#if ColorPaletteSelector}<ColorPaletteSelector />{/if}
</nav>

<style>
	.nav {
		height: 3.5rem;
		padding: 0 10px;
		z-index: 5;
		font-size: 14px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.app-name {
		text-transform: uppercase;
	}

	.alpha-tag {
		font-style: italic;
		text-transform: none;
	}
</style>
