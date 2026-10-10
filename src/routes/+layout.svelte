<script lang="ts">
	import type { Snippet } from 'svelte';

	import '#lib/styles/global.css';
	import '#lib/styles/crt.css';

	let { children }: { children: Snippet } = $props();
</script>

{@render children()}
