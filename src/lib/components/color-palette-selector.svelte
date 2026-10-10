<script lang="ts">
	import { colorPalette } from '#lib/store.svelte.js';

	import { COLOR_PALETTES, type ColorPaletteId } from '#lib/constants.js';

	import Select from './select.svelte';

	function handleColorPaletteChange(value: string) {
		colorPalette.id = value as ColorPaletteId;
	}

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
	value={colorPalette.id}
	onValueChange={handleColorPaletteChange}
/>

<style>
</style>
