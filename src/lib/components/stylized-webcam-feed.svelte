<script lang="ts">
	import Dither from 'canvas-dither';
	import throttle from 'just-throttle';

	import { cameras, colorPalette, mediaDeviceId, mediaStream } from '#lib/store.svelte.js';
	import { convertImageData } from '#lib/utils/canvas.js';
	import { getCrop } from '#lib/utils/webcam.js';

	const TARGET_WIDTH = 200;
	const TARGET_HEIGHT = 150;

	interface Props {
		width: number;
		height: number;
		videoElement?: HTMLVideoElement | undefined;
	}

	let {
		width = TARGET_WIDTH,
		height = TARGET_HEIGHT,
		videoElement = $bindable()
	}: Props = $props();
	let displayCanvasElement: HTMLCanvasElement | undefined;
	let processedImageDrawRequestId: number;

	let webcamVideoStatus = $state('initial');

	function drawProcessedImage() {
		if (!displayCanvasElement) {
			console.error('No canvas element to draw to');
			return;
		}

		const displayCanvas2dContext = displayCanvasElement.getContext('2d');

		if (!displayCanvas2dContext) {
			console.error('Canvas context could not be initialized');
			return;
		}

		if (!videoElement) {
			console.error('No video element to draw from');
			return;
		}

		const { x, y, width: cropWidth, height: cropHeight } = getCrop(videoElement, width / height);
		displayCanvas2dContext.drawImage(
			videoElement,
			x,
			y,
			cropWidth,
			cropHeight, // source (webcam)
			0,
			0,
			width,
			height // destination (canvas)
		);
		const canvasImageData = displayCanvas2dContext.getImageData(0, 0, width, height);
		const filteredImageData = Dither.atkinson(canvasImageData);
		displayCanvas2dContext.putImageData(filteredImageData, 0, 0);
		convertImageData(displayCanvasElement, $colorPalette);
	}

	const throttledDrawProcessedImage = throttle(drawProcessedImage, 100, { leading: true });

	function tryToDraw() {
		throttledDrawProcessedImage();

		processedImageDrawRequestId = requestAnimationFrame(tryToDraw);
	}

	$effect(() => {
		const { stream } = $mediaStream;

		if (!stream) {
			console.warn('No stream available to attach to video element');
			return;
		}

		if (!videoElement) {
			console.warn('No video element available to attach stream to');
			return;
		}

		videoElement.srcObject = null;
		videoElement.srcObject = stream;
		videoElement.play();

		cancelAnimationFrame(processedImageDrawRequestId);
		processedImageDrawRequestId = requestAnimationFrame(tryToDraw);

		return function onUnMount() {
			cancelAnimationFrame(processedImageDrawRequestId);
		};
	});

	const handleVideoPlaying = throttle(function () {
		// TODO see if this can be done without artificial delay
		setTimeout(() => (webcamVideoStatus = 'playing'), 250);
	}, 1000);

	function handleVideoSuspend() {
		webcamVideoStatus = 'suspended';
	}

	function handleVideoWaiting() {
		webcamVideoStatus = 'waiting';
	}

	function handleFeedClick() {
		if ($cameras.length <= 1) {
			return;
		}

		const activeCameraIndex = $mediaDeviceId
			? $cameras.findIndex((camera) => camera.deviceId === $mediaDeviceId)
			: 0;
		const nextCameraIndex = $cameras.length - 1 > activeCameraIndex ? activeCameraIndex + 1 : 0;
		const nextCameraDeviceId = $cameras[nextCameraIndex].deviceId;
		mediaDeviceId.set(nextCameraDeviceId);
	}
</script>

<button
	type="button"
	class="stylized-webcam-feed"
	class:playing={webcamVideoStatus === 'playing'}
	onclick={handleFeedClick}
>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		class="raw-webcam sekrit"
		bind:this={videoElement}
		{width}
		{height}
		onplaying={handleVideoPlaying}
		onsuspend={handleVideoSuspend}
		onwaiting={handleVideoWaiting}
		playsinline={true}
	></video>
	<canvas
		class="display-webcam"
		{width}
		{height}
		bind:this={displayCanvasElement}
		style={`width: ${width}px;`}
	></canvas>
	{#if $cameras.length > 1}<span class="switch-camera-icon">⟲</span>{/if}
</button>

<style>
	.stylized-webcam-feed {
		all: unset;
		position: relative;
		cursor: var(--cursor-pointer);
		clip-path: circle(0%);
		transition: clip-path 1000ms var(--ease-out-quint);
		display: block;
	}

	.stylized-webcam-feed.playing {
		clip-path: circle(100%);
	}

	.display-webcam {
		display: block;
	}

	.display-webcam {
		background: var(--black);
		transition: all 500ms cubic-bezier(0.16, 1, 0.3, 1);
		max-width: 100%;
	}

	.sekrit {
		position: fixed;
		z-index: 9999;
		top: -9999px;
		visibility: hidden;
		display: none;
	}

	.switch-camera-icon {
		position: absolute;
		top: 50%;
		left: 50%;
		color: var(--white);
		font-size: 40px;
		filter: drop-shadow(-2px 2px 0 var(--black));
		transform: translateY(-50%) translateX(-50%) scale(0.75);
		opacity: 0;
		transition:
			transform 400ms,
			opacity 400ms;
	}

	.stylized-webcam-feed:hover .switch-camera-icon {
		opacity: 1;
		transform: translateY(-50%) translateX(-50%) scale(1);
		transition:
			transform 200ms,
			opacity 200ms;
	}
</style>
