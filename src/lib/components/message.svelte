<script lang="ts">
	import { expoInOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import { motion } from '#lib/utils/motion.js';

	import Filmstrip from './filmstrip.svelte';
	import RenderIfVisible from './render-if-visible.svelte';

	const STAGGER_DELAY = 100; // ms between messages on first render

	interface MessagePropsT {
		imageUrl: string;
		text?: string;
		index?: number;
		interactive?: boolean;
	}

	let { imageUrl, text, index = 0, interactive = true }: MessagePropsT = $props();

	const displayText = $derived(text || '…');
</script>

<div class="message">
	<div
		class="image"
		in:scale={motion({
			duration: 500,
			easing: expoInOut,
			opacity: 0,
			delay: index * STAGGER_DELAY
		})}
	>
		<RenderIfVisible>
			<Filmstrip src={imageUrl} fileName={displayText} saveable={interactive} />
		</RenderIfVisible>
	</div>
	<div
		class="text"
		in:scale={motion({
			delay: index * STAGGER_DELAY + 250,
			duration: 300,
			easing: expoInOut,
			opacity: 0,
			start: 0.25
		})}
	>
		{displayText}
	</div>
</div>

<style>
	.message {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
	}

	.image {
		--border-radius: 5px;
		flex-shrink: 0;
		aspect-ratio: 4 / 3;
		background-color: var(--white);
		outline: var(--white) 1px solid;
		border-radius: var(--border-radius);
		transform-origin: 25% -50%;
	}

	.text {
		position: relative;
		z-index: 2;
		flex-grow: 1;
		/* min-width: 20ch; */
		margin-left: -10px;
		padding: 15px 20px;
		text-align: center;
		overflow-wrap: break-word;
		text-wrap: balance;
		background: var(--black);
		color: var(--white);
		border: var(--white) 1px solid;
		border-radius: 5px;
		transform-origin: 50% 50%;
		box-shadow: var(--black) 0 1px 0 2px;

		&::before,
		&::after {
			position: absolute;
			display: flex;
			justify-content: center;
			width: 1em;
			height: 1em;
			border-radius: 0.25em;
			background: var(--white);
			color: var(--black);
			box-shadow: var(--black) 0 1px 0 2px;
		}

		&::before {
			content: '“';
			top: 0;
			left: 0;
			transform: translate(-50%, 25%);
		}

		&::after {
			content: '”';
			right: 0;
			bottom: 0;
			transform: translate(50%, -25%);
		}
	}
</style>
