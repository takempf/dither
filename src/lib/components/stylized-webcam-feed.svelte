<script lang="ts">
	import { colorPalette, webcam } from '#lib/store.svelte.js';
	import { getCrop } from '#lib/utils/webcam.js';
	import { createWebcamDitherer, type WebcamDitherMessageT } from '#lib/utils/webcam-ditherer.js';

	const TARGET_WIDTH = 200;
	const TARGET_HEIGHT = 150;
	const FRAME_INTERVAL = 100; // ms, so ~10 fps

	interface Props {
		width?: number;
		height?: number;
		videoElement?: HTMLVideoElement | undefined;
	}

	let {
		width = TARGET_WIDTH,
		height = TARGET_HEIGHT,
		videoElement = $bindable()
	}: Props = $props();
	interface DithererT {
		post: (message: WebcamDitherMessageT, transfer?: Transferable[]) => void;
		// called once a frame is drawn, so the next one can be sent
		onFrameDone?: () => void;
		stop: () => void;
	}

	let displayCanvasElement: HTMLCanvasElement | undefined = $state();
	let ditherer: DithererT | undefined = $state.raw();

	let webcamVideoStatus = $state('initial');

	function createDitherer(canvas: HTMLCanvasElement): DithererT {
		// a worker keeps dithering off the main thread
		if (typeof canvas.transferControlToOffscreen === 'function') {
			const worker = new Worker(new URL('../workers/webcam-dither.ts', import.meta.url), {
				type: 'module'
			});
			const workerDitherer: DithererT = {
				post: (message, transfer = []) => worker.postMessage(message, transfer),
				stop: () => worker.terminate()
			};
			worker.onmessage = () => workerDitherer.onFrameDone?.();
			const offscreenCanvas = canvas.transferControlToOffscreen();
			workerDitherer.post({ type: 'init', canvas: offscreenCanvas }, [offscreenCanvas]);
			return workerDitherer;
		}

		// no canvas transfer (Safari before 16.4), so dither on the main thread
		const mainThreadDitherer: DithererT = {
			post: (message) => handleMessage(message),
			stop: () => {}
		};
		const handleMessage = createWebcamDitherer(() => mainThreadDitherer.onFrameDone?.());
		mainThreadDitherer.post({ type: 'init', canvas });
		return mainThreadDitherer;
	}

	$effect(() => {
		if (!displayCanvasElement) {
			return;
		}

		const newDitherer = createDitherer(displayCanvasElement);
		ditherer = newDitherer;

		return () => {
			newDitherer.stop();
			ditherer = undefined;
		};
	});

	$effect(() => {
		ditherer?.post({ type: 'resize', width, height });
	});

	$effect(() => {
		ditherer?.post({ type: 'palette', colorPalette: colorPalette.colors });
	});

	$effect(() => {
		const { stream } = webcam;

		if (!stream) {
			console.warn('No stream available to attach to video element');
			return;
		}

		if (!videoElement || !ditherer) {
			return;
		}

		const video = videoElement;
		const activeDitherer = ditherer;
		video.srcObject = null;
		video.srcObject = stream;
		video.play();

		let videoFrameCallbackId = 0;
		let lastFrameTime = -Infinity;
		let isDithererBusy = false;
		let stopped = false;

		async function sendFrame(now: DOMHighResTimeStamp) {
			videoFrameCallbackId = video.requestVideoFrameCallback(sendFrame);

			// skip frames while the ditherer is busy or the interval hasn't passed
			if (isDithererBusy || now - lastFrameTime < FRAME_INTERVAL || !video.videoWidth) {
				return;
			}

			isDithererBusy = true;
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

				activeDitherer.post({ type: 'frame', bitmap }, [bitmap]);
			} catch (error) {
				console.error('Could not capture webcam frame', error);
				isDithererBusy = false;
			}
		}

		activeDitherer.onFrameDone = () => {
			isDithererBusy = false;
		};
		videoFrameCallbackId = video.requestVideoFrameCallback(sendFrame);

		return () => {
			stopped = true;
			video.cancelVideoFrameCallback(videoFrameCallbackId);
			activeDitherer.onFrameDone = undefined;
		};
	});

	function handleVideoPlaying() {
		// TODO see if this can be done without artificial delay
		setTimeout(() => (webcamVideoStatus = 'playing'), 250);
	}

	function handleVideoSuspend() {
		webcamVideoStatus = 'suspended';
	}

	function handleVideoWaiting() {
		webcamVideoStatus = 'waiting';
	}

	function handleFeedClick() {
		if (webcam.cameras.length <= 1) {
			return;
		}

		const activeCameraIndex = webcam.deviceId
			? webcam.cameras.findIndex((camera) => camera.deviceId === webcam.deviceId)
			: 0;
		const nextCameraIndex =
			webcam.cameras.length - 1 > activeCameraIndex ? activeCameraIndex + 1 : 0;
		const nextCameraDeviceId = webcam.cameras[nextCameraIndex].deviceId;
		webcam.deviceId = nextCameraDeviceId;
	}
</script>

<button
	type="button"
	class="stylized-webcam-feed"
	class:playing={webcamVideoStatus === 'playing'}
	aria-label="Switch camera"
	aria-disabled={webcam.cameras.length <= 1}
	onclick={handleFeedClick}
>
	<video
		class="raw-webcam"
		aria-hidden="true"
		bind:this={videoElement}
		{width}
		{height}
		onplaying={handleVideoPlaying}
		onsuspend={handleVideoSuspend}
		onwaiting={handleVideoWaiting}
		playsinline={true}
		muted
	></video>
	<!-- size is set by the ditherer, since the canvas may be transferred -->
	<canvas
		class="display-webcam"
		bind:this={displayCanvasElement}
		style={`width: ${width}px; aspect-ratio: ${width} / ${height};`}
	></canvas>
	{#if webcam.cameras.length > 1}<span class="switch-camera-icon">⟲</span>{/if}
</button>

<style>
	.stylized-webcam-feed {
		all: unset;
		position: relative;
		cursor: var(--cursor-pointer);
		clip-path: circle(0%);
		transition: clip-path 600ms var(--ease-in-out-expo);
		display: block;
	}

	.stylized-webcam-feed.playing {
		clip-path: circle(100%);
	}

	.display-webcam {
		position: relative;
		display: block;
	}

	.display-webcam {
		background: var(--black);
		transition: all 300ms var(--ease-in-out-expo);
		max-width: 100%;
	}

	/* rendered under the canvas, since some mobile browsers send no frames for hidden video */
	.raw-webcam {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
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
