<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<nav class="nav">
	<a href={resolve('/(app)')} class="app-name">Dither <span class="alpha-tag">alpha</span></a>
	<!-- lazy, so the select library stays out of the first load -->
	{#await import('./color-palette-selector.svelte') then { default: ColorPaletteSelector }}
		<ColorPaletteSelector />
	{/await}
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
