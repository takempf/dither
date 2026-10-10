<script lang="ts">
	import type { Snippet } from 'svelte';

	import '@fontsource/im-fell-english/400.css';
	import '@fontsource/im-fell-english/400-italic.css';
	import '@fontsource/noto-emoji/400.css';
	import '#lib/styles/global.css';
	import '#lib/styles/crt.css';

	let { children }: { children: Snippet } = $props();
</script>

{@render children()}
