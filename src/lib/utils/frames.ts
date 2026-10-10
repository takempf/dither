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

export function generateFilmstripWithCallback(
	video: HTMLVideoElement,
	frameCallback: (frameNumber: number) => void,
	filmstripOptions?: Partial<FilmstripOptions> | undefined
): Promise<ImageData> {
	const { frameCount, frameRate, width, height } = {
		...defaultFilmstripOptions,
		...filmstripOptions
	};

	return new Promise((resolve, reject) => {
		let canvas: HTMLCanvasElement = document.createElement('canvas');
		let context = canvas.getContext('2d');

		canvas.width = video.width;
		canvas.height = video.height * frameCount;

		let capturedFrameCount: number = 0;
		let videoFrameCallbackId: NodeJS.Timeout;

		function captureFrame() {
			if (!context) {
				reject(new Error('Canvas 2D context could not be initialized'));
				cleanup();
				return;
			}

			// iterate through frames
			if (capturedFrameCount < frameCount) {
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

				videoFrameCallbackId = setTimeout(captureFrame, 1000 / frameRate);
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
			clearTimeout(videoFrameCallbackId);
		}

		videoFrameCallbackId = setTimeout(captureFrame, 1000 / frameRate);
	});
}
