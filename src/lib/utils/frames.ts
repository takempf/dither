import { atkinsonDither } from './canvas.js';
import { getCrop } from './webcam.js';

interface FilmstripOptions {
	frameCount: number;
	frameRate: number;
	width: number;
	height: number;
}

const defaultFilmstripOptions: FilmstripOptions = {
	frameCount: 20,
	frameRate: 10,
	width: 200,
	height: 150
};

// give up if the camera sends no new frame for this long
const STALL_TIMEOUT = 2000;

export function generateFilmstripWithCallback(
	video: HTMLVideoElement,
	frameCallback: (frameNumber: number) => void,
	filmstripOptions?: Partial<FilmstripOptions> | undefined
): Promise<ImageData> {
	const { frameCount, frameRate, width, height } = {
		...defaultFilmstripOptions,
		...filmstripOptions
	};
	const frameInterval = 1000 / frameRate;
	// camera frames jitter, so accept one arriving a bit early
	const earlyTolerance = frameInterval / 4;

	return new Promise((resolve, reject) => {
		let canvas: HTMLCanvasElement = document.createElement('canvas');
		let context = canvas.getContext('2d');

		canvas.width = video.width;
		canvas.height = video.height * frameCount;

		let capturedFrameCount: number = 0;
		let nextCaptureTime: number | undefined;
		let videoFrameCallbackId: number;
		let stallTimeoutId: ReturnType<typeof setTimeout>;

		function resetStallTimeout() {
			clearTimeout(stallTimeoutId);
			stallTimeoutId = setTimeout(() => {
				reject(new Error('Camera stopped sending frames'));
				cleanup();
			}, STALL_TIMEOUT);
		}

		// runs once per new camera frame, so the same frame is never captured twice
		function handleVideoFrame(now: DOMHighResTimeStamp) {
			if (!context) {
				reject(new Error('Canvas 2D context could not be initialized'));
				cleanup();
				return;
			}

			resetStallTimeout();
			nextCaptureTime ??= now;

			if (now < nextCaptureTime - earlyTolerance) {
				videoFrameCallbackId = video.requestVideoFrameCallback(handleVideoFrame);
				return;
			}

			// sometimes camera aspect does not match desired aspect
			const { x, y, width: cropWidth, height: cropHeight } = getCrop(video, width / height);
			context.drawImage(
				video,
				x,
				y,
				cropWidth,
				cropHeight, // source (webcam)
				0,
				capturedFrameCount * height,
				width,
				height // destination (canvas)
			);

			capturedFrameCount++;
			frameCallback(capturedFrameCount);

			if (capturedFrameCount < frameCount) {
				// step from the schedule, not from now, so timing doesn't drift
				nextCaptureTime += frameInterval;
				// fell behind, so restart the schedule instead of bursting
				if (nextCaptureTime < now) {
					nextCaptureTime = now + frameInterval;
				}
				videoFrameCallbackId = video.requestVideoFrameCallback(handleVideoFrame);
				return;
			}

			// finish up
			const canvasImageData = context.getImageData(0, 0, canvas.width, canvas.height);
			const ditheredImageData = atkinsonDither(canvasImageData);
			resolve(ditheredImageData);
			cleanup();
		}

		function cleanup() {
			(canvas as unknown) = null;
			(context as unknown) = null;
			video.cancelVideoFrameCallback(videoFrameCallbackId);
			clearTimeout(stallTimeoutId);
		}

		resetStallTimeout();
		videoFrameCallbackId = video.requestVideoFrameCallback(handleVideoFrame);
	});
}
