<script lang="ts">
	import throttle from 'just-throttle';

	import { cameras, colorPalette, mediaDeviceId, mediaStream } from '#lib/store.svelte.js';
	import { getCrop } from '#lib/utils/webcam.js';
	import type { WebcamDitherMessageT } from '#lib/workers/webcam-dither.js';

	const TARGET_WIDTH = 200;
	const TARGET_HEIGHT = 150;
	const FRAME_INTERVAL = 100; // ms, so ~10 fps

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
	let displayCanvasElement: HTMLCanvasElement | undefined = $state();
	let worker: Worker | undefined = $state();

	let webcamVideoStatus = $state('initial');

	function postToWorker(
		targetWorker: Worker,
		message: WebcamDitherMessageT,
		transfer: Transferable[] = []
	) {
		targetWorker.postMessage(message, transfer);
	}

	// the worker draws to the display canvas, so dithering stays off the main thread
	$effect(() => {
		if (!displayCanvasElement) {
			return;
		}

		const ditherWorker = new Worker(new URL('../workers/webcam-dither.ts', import.meta.url), {
			type: 'module'
		});
		const offscreenCanvas = displayCanvasElement.transferControlToOffscreen();
		postToWorker(ditherWorker, { type: 'init', canvas: offscreenCanvas }, [offscreenCanvas]);
		worker = ditherWorker;

		return () => {
			ditherWorker.terminate();
			worker = undefined;
		};
	});

	$effect(() => {
		if (worker) {
			postToWorker(worker, { type: 'resize', width, height });
		}
	});

	$effect(() => {
		if (worker) {
			postToWorker(worker, { type: 'palette', colorPalette: $colorPalette });
		}
	});

	$effect(() => {
		const { stream } = $mediaStream;

		if (!stream) {
			console.warn('No stream available to attach to video element');
			return;
		}

		if (!videoElement || !worker) {
			return;
		}

		const video = videoElement;
		const ditherWorker = worker;
		video.srcObject = null;
		video.srcObject = stream;
		video.play();

		let videoFrameCallbackId = 0;
		let lastFrameTime = -Infinity;
		let isWorkerBusy = false;
		let stopped = false;

		function handleWorkerMessage() {
			isWorkerBusy = false;
		}

		async function sendFrame(now: DOMHighResTimeStamp) {
			videoFrameCallbackId = video.requestVideoFrameCallback(sendFrame);

			// skip frames while the worker is busy or the interval hasn't passed
			if (isWorkerBusy || now - lastFrameTime < FRAME_INTERVAL || !video.videoWidth) {
				return;
			}

			isWorkerBusy = true;
			lastFrameTime = now;

			try {
				const crop = getCrop(video, width / height);
				const bitmap = await createImageBitmap(video, crop.x, crop.y, crop.width, crop.height, {
					resizeWidth: width,
					resizeHeight: height
				});

				if (stopped) {
					bitmap.close();
					return;
				}

				postToWorker(ditherWorker, { type: 'frame', bitmap }, [bitmap]);
			} catch (error) {
				console.error('Could not capture webcam frame', error);
				isWorkerBusy = false;
			}
		}

		ditherWorker.addEventListener('message', handleWorkerMessage);
		videoFrameCallbackId = video.requestVideoFrameCallback(sendFrame);

		return () => {
			stopped = true;
			video.cancelVideoFrameCallback(videoFrameCallbackId);
			ditherWorker.removeEventListener('message', handleWorkerMessage);
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
	<!-- size is set in the worker, since the canvas is transferred -->
	<canvas
		class="display-webcam"
		bind:this={displayCanvasElement}
		style={`width: ${width}px; aspect-ratio: ${width} / ${height};`}
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
