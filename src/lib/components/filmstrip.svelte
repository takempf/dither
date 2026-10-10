<script lang="ts">
	import { onMount } from 'svelte';

	import { generateGIF, downloadFile } from '#lib/utils/filmstrip.js';
	import { convertImageData, drawDitheredNoise } from '#lib/utils/canvas.js';
	import { colorPalette } from '#lib/store.svelte.js';

	import Button from './button.svelte';

	interface Props {
		fileName: string;
		src: string;
		saveable: boolean;
	}

	const FRAME_WIDTH = 200;
	const FRAME_HEIGHT = 150;

	let { fileName, src, saveable = true }: Props = $props();
	let mounted: boolean = $state(false);
	let image: HTMLImageElement | undefined = $state();
	let startTime: number = $state(0);
	let currentTime: number = $state(0);
	let canvasElement: HTMLCanvasElement;
	let canvasContext: CanvasRenderingContext2D | null;
	let frame = $derived(Math.floor((currentTime - startTime) / 100));

	async function loadImage(imageUrl: string) {
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const img = new Image();
			img.src = URL.createObjectURL(blob);

			img.onload = () => {
				image = img;
			};
		} catch (error) {
			console.error('Error loading or drawing image:', error);
		}
	}

	function updateTime() {
		currentTime = performance.now();

		if (mounted) {
			window.requestAnimationFrame(updateTime);
		}
	}

	onMount(() => {
		mounted = true;
		canvasContext = canvasElement.getContext('2d');

		loadImage(src);
		startTime = performance.now();
		updateTime();

		return () => {
			mounted = false;
		};
	});

	$effect(() => {
		if (!canvasContext) {
			console.error('Could not create 2d canvas context while loading image.');
			return;
		}

		const frameNumber = frame % 20;

		// if image hasn't loaded, show empty noise
		if (!(image instanceof Image)) {
			drawDitheredNoise(canvasContext, FRAME_WIDTH, FRAME_HEIGHT);
		} else {
			canvasContext.drawImage(
				image,
				// source
				0,
				frameNumber * FRAME_HEIGHT,
				FRAME_WIDTH,
				FRAME_HEIGHT,
				// destination
				0,
				0,
				FRAME_WIDTH,
				FRAME_HEIGHT
			); // Draw the image onto the canvas
		}

		convertImageData(canvasElement, $colorPalette as unknown as [string, string]);
	});

	async function handleDownloadClick() {
		if (!image) {
			return;
		}

		const gifBlob = await generateGIF(image, $colorPalette as unknown as [string, string]);

		if (!gifBlob) {
			console.error('Could not create GIF Blob object');
			return;
		}

		downloadFile(gifBlob, fileName);
	}
</script>

<div class="filmstrip">
	<canvas class="canvas" width={FRAME_WIDTH} height={FRAME_HEIGHT} bind:this={canvasElement}
	></canvas>
	{#if saveable}
		<div class="download">
			<Button type="button" onclick={handleDownloadClick}>Save GIF 💾</Button>
		</div>
	{/if}
</div>

<style>
	.filmstrip {
		position: relative;
		width: 100%;
		max-width: 100%;
		aspect-ratio: 4 / 3;

		&:hover {
			.download {
				display: block;
				transform: translate(-50%, -50%) scale(1);
			}
		}
	}

	.canvas {
		width: 100%;
		image-rendering: optimizequality;
		border-radius: var(--border-radius);
	}

	.download {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) scale(0);
		transition: transform 250ms;
		font-size: 0.9rem;
	}
</style>
