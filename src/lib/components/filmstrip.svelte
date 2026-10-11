<script lang="ts">
	import { generateGIF, downloadFile } from '#lib/utils/filmstrip.js';
	import {
		getNoiseStrip,
		loadStrip,
		paletteToPixels,
		renderFrame,
		stripToImageData,
		type PackedStripT
	} from '#lib/utils/strip.js';
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
	let strip: PackedStripT | undefined = $state.raw();
	// first tick seen, so playback starts at frame 0
	let startTick: number | undefined;

	$effect(() => {
		let cancelled = false;
		strip = undefined;
		loadStrip(src, FRAME_HEIGHT).then(
			(loadedStrip) => {
				if (!cancelled) {
					strip = loadedStrip;
				}
			},
			(error) => console.error('Error loading filmstrip image', error)
		);

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const context = canvasElement?.getContext('2d', { alpha: false });
		if (!context) {
			return;
		}

		// still loading, so show animated noise
		const source = strip ?? getNoiseStrip(FRAME_WIDTH, FRAME_HEIGHT);
		const colors = paletteToPixels(colorPalette.colors);
		// one buffer per strip and palette, reused every frame
		const imageData = context.createImageData(source.width, source.frameHeight);
		const pixels = new Uint32Array(imageData.data.buffer);

		return frameTick.subscribe((tick) => {
			startTick ??= tick;
			renderFrame(source, (tick - startTick) % source.frameCount, colors, pixels);
			context.putImageData(imageData, 0, 0);
		});
	});

	async function handleDownloadClick() {
		if (!strip) {
			return;
		}

		const gifBlob = await generateGIF(
			stripToImageData(strip, colorPalette.colors),
			colorPalette.colors
		);

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
