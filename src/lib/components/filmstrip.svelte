<script lang="ts">
	import { generateGIF, downloadFile } from '#lib/utils/filmstrip.js';
	import { convertImageData, drawDitheredNoise } from '#lib/utils/canvas.js';
	import { frameTick } from '#lib/utils/ticker.js';
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
	let canvasElement: HTMLCanvasElement | undefined = $state();
	let image: HTMLImageElement | undefined = $state();
	// first tick seen, so playback starts at frame 0
	let startTick: number | undefined;

	$effect(() => {
		let cancelled = false;
		const img = new Image();
		// CORS keeps the canvas readable for recoloring
		img.crossOrigin = 'anonymous';
		img.src = src;
		img.decode().then(
			() => {
				if (!cancelled) {
					image = img;
				}
			},
			(error) => console.error('Error loading filmstrip image', error)
		);

		return () => {
			cancelled = true;
		};
	});

	// the whole strip, recolored once per image or palette change
	const recoloredStrip = $derived.by(() => {
		if (!image) {
			return undefined;
		}

		const stripCanvas = document.createElement('canvas');
		stripCanvas.width = image.naturalWidth;
		stripCanvas.height = image.naturalHeight;
		stripCanvas.getContext('2d')?.drawImage(image, 0, 0);
		convertImageData(stripCanvas, colorPalette.colors);
		return stripCanvas;
	});

	$effect(() => {
		const context = canvasElement?.getContext('2d');
		if (!context) {
			return;
		}

		const strip = recoloredStrip;
		const palette = colorPalette.colors;

		return frameTick.subscribe((tick) => {
			startTick ??= tick;

			// still loading, so show animated noise
			if (!strip) {
				drawDitheredNoise(context, FRAME_WIDTH, FRAME_HEIGHT);
				convertImageData(context.canvas, palette);
				return;
			}

			const frameCount = Math.max(1, Math.floor(strip.height / FRAME_HEIGHT));
			const frame = (tick - startTick) % frameCount;
			context.drawImage(
				strip,
				// source
				0,
				frame * FRAME_HEIGHT,
				FRAME_WIDTH,
				FRAME_HEIGHT,
				// destination
				0,
				0,
				FRAME_WIDTH,
				FRAME_HEIGHT
			);
		});
	});

	async function handleDownloadClick() {
		if (!image) {
			return;
		}

		const gifBlob = await generateGIF(image, colorPalette.colors);

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
		border-radius: var(--border-radius);
	}

	.download {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) scale(0);
		transition: transform 200ms var(--ease-in-out-expo);
		font-size: 0.9rem;
	}
</style>
