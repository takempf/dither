// Dithers webcam frames and draws them to the display canvas. Runs in a worker when the
// canvas can be transferred, otherwise on the main thread.
import { atkinsonDither, recolorImageData, type ColorPaletteT } from './canvas.js';

export type WebcamDitherMessageT =
	| { type: 'init'; canvas: OffscreenCanvas | HTMLCanvasElement }
	| { type: 'resize'; width: number; height: number }
	| { type: 'palette'; colorPalette: ColorPaletteT }
	| { type: 'frame'; bitmap: ImageBitmap };

export function createWebcamDitherer(onFrameDone: () => void) {
	let context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
	let colorPalette: ColorPaletteT | undefined;
	// resizing clears the canvas, so wait until a new frame is ready to replace the old one
	let pendingSize: { width: number; height: number } | undefined;

	function drawFrame(bitmap: ImageBitmap) {
		if (context && colorPalette) {
			if (pendingSize) {
				context.canvas.width = pendingSize.width;
				context.canvas.height = pendingSize.height;
				pendingSize = undefined;
			}

			const { width, height } = context.canvas;
			context.drawImage(bitmap, 0, 0, width, height);
			const imageData = atkinsonDither(context.getImageData(0, 0, width, height));
			recolorImageData(imageData, colorPalette);
			context.putImageData(imageData, 0, 0);
		}

		bitmap.close();
		// ready for the next frame
		onFrameDone();
	}

	return function handleMessage(message: WebcamDitherMessageT) {
		switch (message.type) {
			case 'init':
				context = message.canvas.getContext('2d', { willReadFrequently: true }) as
					OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
				break;
			case 'resize':
				pendingSize = { width: message.width, height: message.height };
				break;
			case 'palette':
				colorPalette = message.colorPalette;
				break;
			case 'frame':
				drawFrame(message.bitmap);
				break;
		}
	};
}
