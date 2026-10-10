<script lang="ts">
	import { slide } from 'svelte/transition';
	import { motion } from '#lib/utils/motion.js';

	import StylizedWebcamFeed from '#lib/components/stylized-webcam-feed.svelte';
	import Button from '#lib/components/button.svelte';
	import WebcamPermissionButton from '#lib/components/webcam-permission-button.svelte';
	import Progress from '#lib/components/progress.svelte';

	import { colorPalette, cameraResolutionId } from '#lib/store.svelte.js';
	import { downloadFile, generateGIF } from '#lib/utils/filmstrip.js';
	import { CAMERA_RESOLUTIONS } from '#lib/constants.js';
	import { generateFilmstripWithCallback } from '#lib/utils/frames.js';
	import { quartOut } from 'svelte/easing';
	import { hapticBuzz } from '#lib/utils/vibration.js';
	import ResolutionSelector from '#lib/components/resolution-selector.svelte';

	const TOTAL_FRAMES = 20;

	let videoElement: HTMLVideoElement | undefined = $state();

	function generateShortId(length: number = 8): string {
		const timestamp = Date.now().toString(36); // Base36 timestamp for shorter representation
		const randomChars = Math.random().toString(36).substring(2, length); // Random characters

		return timestamp + randomChars;
	}

	let selectedResolution = $derived(CAMERA_RESOLUTIONS[cameraResolutionId.current]);
	let width = $derived(selectedResolution[0]);
	let height = $derived(selectedResolution[1]);
	let currentFrameNumber = $state(0);
	let progress = $derived((currentFrameNumber / TOTAL_FRAMES) * 100);
	let isCapturing = $state(false);

	async function handleGenerateGifClick() {
		if (!videoElement) {
			throw new Error('No video element to record from');
		}

		try {
			isCapturing = true;
			function handleFrame(frameNumber: number) {
				currentFrameNumber = frameNumber;
			}

			hapticBuzz();
			const filmstripData = await generateFilmstripWithCallback(videoElement, handleFrame, {
				width,
				height
			});
			hapticBuzz();
			const gifBlob = await generateGIF(filmstripData, colorPalette.colors, width, height);

			if (!gifBlob) {
				console.error('Could not create GIF from webcam feed');
				return;
			}

			downloadFile(gifBlob, `dither-gif_${generateShortId()}`);
		} catch (error) {
			console.error('error generating filmstrip', error);
		} finally {
			isCapturing = false;
			currentFrameNumber = 0;
		}
	}
</script>

<div class="cameraPage">
	<div class="cameraFeed">
		<svg class="line" viewBox="0 0 1 1" preserveAspectRatio="none">
			<line
				x1="0"
				y1="0"
				x2="1"
				y2="1"
				stroke="currentColor"
				stroke-width="0.001"
				stroke-dasharray="0.0025, 0.0025"
			/>
		</svg>
		<svg class="line" viewBox="0 0 1 1" preserveAspectRatio="none">
			<line
				x1="1"
				y1="0"
				x2="0"
				y2="1"
				stroke="currentColor"
				stroke-width="0.001"
				stroke-dasharray="0.0025, 0.0025"
			/>
		</svg>
		<div class="sizes">
			{#each Object.values(CAMERA_RESOLUTIONS) as [resolutionWidth] (resolutionWidth)}
				<div class="size" style={`width: ${resolutionWidth}px;`}></div>
			{/each}
		</div>
		<div class="cameraFeedActual">
			<StylizedWebcamFeed {width} {height} bind:videoElement />
		</div>
		{#if isCapturing}
			<div
				class="progress"
				in:slide={motion({ duration: 250, easing: quartOut })}
				out:slide={motion({ duration: 500, easing: quartOut, delay: 500 })}
			>
				<Progress {progress} />
			</div>
		{/if}
		<div class="enableWebcam">
			<WebcamPermissionButton />
		</div>
	</div>
	<div class="controls">
		<ResolutionSelector disabled={isCapturing} />
		<Button onclick={handleGenerateGifClick} disabled={isCapturing}>Generate Gif</Button>
	</div>
</div>

<style>
	.cameraPage {
		display: flex;
		flex-direction: column;
	}

	.cameraFeed {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		grid-template-areas: 'main';
		align-items: center;
		justify-items: center;
		aspect-ratio: 4/ 3;
		border-bottom: var(--white) 1px dotted;
	}

	.cameraFeedActual {
		grid-area: main;
	}

	.progress {
		grid-area: main;
		justify-self: center;
		align-self: end;
		z-index: 5;
		margin: 0.5em;
		width: 100%;
		max-width: 300px;
	}

	.enableWebcam {
		grid-area: main;
	}

	.line {
		aspect-ratio: 4 / 3;
		grid-area: main;
	}

	.sizes {
		grid-area: main;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: minmax(0, 1fr);
		grid-template-areas: 'main';
		align-items: center;
		justify-items: center;
		aspect-ratio: 4/ 3;
		max-width: 100vw;
	}

	.size {
		grid-area: main;
		font-family: sans-serif;
		font-size: 8px;
		text-transform: uppercase;
		letter-spacing: 0.25em;
		outline: var(--white) 1px dotted;
		max-width: 100%;
		padding: 0.25em 0.5em;
		display: flex;
		align-items: end;
		justify-content: start;
		aspect-ratio: 4 / 3;

		&:last-child {
			outline: none;
		}
	}

	.controls {
		display: flex;
		flex-direction: row;
		gap: 1.5em;
		align-items: center;
		justify-content: center;
		padding: 1em;
	}
</style>
