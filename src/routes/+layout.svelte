<script lang="ts">
	import type { Snippet } from 'svelte';

	import '@fontsource/im-fell-english/400.css';
	import '@fontsource/im-fell-english/400-italic.css';
	import '@fontsource/noto-emoji/400.css';
	import '#lib/styles/global.css';
	import '#lib/styles/crt.css';

	import Nav from '#lib/components/nav.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Nav />

{@render children()}
