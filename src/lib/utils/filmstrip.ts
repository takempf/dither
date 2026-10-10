import workerUrl from 'modern-gif/worker?url';

import { convertImageData, type ColorPaletteT } from './canvas.js';

const FRAME_HEIGHT = 150;
const FRAME_WIDTH = 200;
const FRAMES_PER_SECOND = 10;
const DURATION = 2000;
const FRAME_DELAY = 1000 / FRAMES_PER_SECOND;
const FRAME_TOTAL = (DURATION / 1000) * FRAMES_PER_SECOND;

export async function generateGIF(
	source: HTMLCanvasElement | HTMLImageElement | ImageData,
	colorPalette: ColorPaletteT,
	width: number = FRAME_WIDTH,
	height: number = FRAME_HEIGHT
): Promise<Blob | undefined> {
	const { encode } = await import('modern-gif');

	const bufferCanvasElement: HTMLCanvasElement = document.createElement('canvas');
	bufferCanvasElement.width = width;
	bufferCanvasElement.height = height;
	const bufferContext = bufferCanvasElement.getContext('2d');

	if (!bufferContext) {
		console.error('Error creating 2d canvas context while generating GIF');
		return;
	}

	const frames = [];

	for (let i = 0; i < FRAME_TOTAL; i++) {
		if (source instanceof ImageData) {
			bufferContext.putImageData(source, 0, i * -1 * height);
		} else {
			bufferContext.drawImage(
				source,
				0,
				i * height,
				width,
				height, // source
				0,
				0,
				width,
				height // destination
			);
		}

		convertImageData(bufferCanvasElement, colorPalette);
		const bufferImageData = bufferContext.getImageData(0, 0, width, height);
		frames.push({ data: bufferImageData.data, delay: FRAME_DELAY });
	}

	const output = await encode({
		// workerUrl is optional
		workerUrl,
		width: width,
		height: height,
		frames
	});
	bufferCanvasElement.remove();

	const blob = new Blob([output], { type: 'image/gif' });
	return blob;
}

export function downloadFile(blob: Blob, fileName: string) {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${fileName}.gif`;
	const clickEvent = new MouseEvent('click');
	link.dispatchEvent(clickEvent);
	setTimeout(() => window.URL.revokeObjectURL(url), 100);
}
