<script lang="ts">
	import type { Snippet } from 'svelte';

	import '@fontsource/im-fell-english/400.css';
	import '@fontsource/im-fell-english/400-italic.css';
	import '@fontsource/noto-emoji/400.css';
	import '#lib/styles/global.css';
	import '#lib/styles/crt.css';

	import { colorPalette } from '#lib/store.svelte.js';
	import { updateCursorColors } from '#lib/utils/cursor.js';
	import Nav from '#lib/components/nav.svelte';

	let { children }: { children: Snippet } = $props();

	$effect(() => {
		const [black, white] = colorPalette.colors;
		document.documentElement.style.setProperty('--black', black);
		document.documentElement.style.setProperty('--white', white);

		updateCursorColors(black, white);
	});
</script>

<Nav />

{@render children()}
