// Dithers webcam frames off the main thread and draws them to the transferred display canvas.
import { atkinsonDither, recolorImageData, type ColorPaletteT } from '#lib/utils/canvas.js';

export type WebcamDitherMessageT =
	| { type: 'init'; canvas: OffscreenCanvas }
	| { type: 'resize'; width: number; height: number }
	| { type: 'palette'; colorPalette: ColorPaletteT }
	| { type: 'frame'; bitmap: ImageBitmap };

let context: OffscreenCanvasRenderingContext2D | null = null;
let colorPalette: ColorPaletteT | undefined;

function drawFrame(bitmap: ImageBitmap) {
	if (context && colorPalette) {
		const { width, height } = context.canvas;
		context.drawImage(bitmap, 0, 0, width, height);
		const imageData = atkinsonDither(context.getImageData(0, 0, width, height));
		recolorImageData(imageData, colorPalette);
		context.putImageData(imageData, 0, 0);
	}

	bitmap.close();
	// ready for the next frame
	self.postMessage('done');
}

self.onmessage = ({ data }: MessageEvent<WebcamDitherMessageT>) => {
	switch (data.type) {
		case 'init':
			context = data.canvas.getContext('2d', { willReadFrequently: true });
			break;
		case 'resize':
			if (context) {
				context.canvas.width = data.width;
				context.canvas.height = data.height;
			}
			break;
		case 'palette':
			colorPalette = data.colorPalette;
			break;
		case 'frame':
			drawFrame(data.bitmap);
			break;
	}
};
