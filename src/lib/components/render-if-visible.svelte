<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	let divElement: HTMLDivElement;
	let isVisible = $state(false);
	let observer: IntersectionObserver | null = null;

	onMount(() => {
		const options = {
			root: null,
			rootMargin: '0px',
			threshold: 0
		};

		observer = new IntersectionObserver(([entry]) => {
			isVisible = entry.isIntersecting;
		}, options);

		observer.observe(divElement);
	});

	onDestroy(() => {
		if (observer) {
			observer.disconnect();
		}
	});
</script>

<div bind:this={divElement}>
	{#if isVisible}
		{@render children()}
	{/if}
</div>
