<script lang="ts">
	import { colorPaletteId, colorPalette } from '#lib/store.svelte.js';
	import { updateCursorColors } from '#lib/utils/cursor.js';

	import { COLOR_PALETTES, type ColorPaletteId } from '#lib/constants.js';

	import Select from './select.svelte';

	function handleColorPaletteChange(value: string) {
		colorPaletteId.set(value as ColorPaletteId);
	}

	$effect(() =>
		colorPalette.subscribe(([black, white]) => {
			document.documentElement.style.setProperty('--black', black);
			document.documentElement.style.setProperty('--white', white);

			updateCursorColors(black, white);
		})
	);

	const colorPalettesKeys = Object.keys(COLOR_PALETTES) as (keyof typeof COLOR_PALETTES)[];
	const options = colorPalettesKeys.map((key) => {
		const [black, white] = COLOR_PALETTES[key];
		return {
			label: key,
			value: key,
			style: `--black: ${black}; --white: ${white}`
		};
	});
</script>

<Select
	{options}
	name="color-palette-selector"
	prefix="Theme:"
	placeholder="None"
	value={$colorPaletteId}
	onValueChange={handleColorPaletteChange}
/>

<style>
</style>
