<script lang="ts">
	import { expoInOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import { motion } from '#lib/utils/motion.js';

	import { clamp } from '#lib/utils/number.js';

	interface ProgressPropsT {
		progress: number;
	}

	const { progress }: ProgressPropsT = $props();

	const clampedProgress = $derived(clamp(0, progress, 100));
	const numElements = $derived(Math.round((clampedProgress / 100) * 20));

	// Create an array with the calculated number of elements
	const items = $derived.by(() => {
		return Array.from({ length: numElements }, (_, i) => i + 1);
	});
</script>

<ul class="progress">
	{#each items as item (item)}
		<li
			class="progressPip"
			in:scale={motion({ duration: 100, easing: expoInOut })}
			out:scale={motion({ duration: 300, easing: expoInOut, delay: 500 })}
		></li>
	{/each}
</ul>

<style>
	.progress {
		width: 100%;
		all: unset;
		display: grid;
		grid-template-columns: repeat(20, 1fr);
		grid-template-rows: 1fr;
		gap: max(1px, 0.15em);
		background: var(--black);
		border: var(--white) 1px dotted;
		padding: 0.15em;
		border-radius: 0.25em;
		aspect-ratio: 25 / 1;
	}

	.progressPip {
		all: unset;
		background: var(--white);
		border-radius: 0.125em;
	}
</style>
