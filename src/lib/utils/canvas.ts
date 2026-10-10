import Dither from 'canvas-dither';

export type ColorPaletteT = readonly [black: string, white: string];

type RgbT = readonly [r: number, g: number, b: number];

const parsedColors = new Map<string, RgbT>();

function parseHexColor(hex: string): RgbT {
	let rgb = parsedColors.get(hex);
	if (!rgb) {
		rgb = [
			parseInt(hex.slice(1, 3), 16),
			parseInt(hex.slice(3, 5), 16),
			parseInt(hex.slice(5, 7), 16)
		];
		parsedColors.set(hex, rgb);
	}
	return rgb;
}

// snap each pixel to the nearer palette color. No DOM, so it also runs in workers.
export function recolorImageData(imageData: ImageData, colorPalette: ColorPaletteT): void {
	const [blackR, blackG, blackB] = parseHexColor(colorPalette[0]);
	const [whiteR, whiteG, whiteB] = parseHexColor(colorPalette[1]);
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		const red = data[i];
		const green = data[i + 1];
		const blue = data[i + 2];

		// squared distances compare the same as real ones
		const distanceToBlack = (red - blackR) ** 2 + (green - blackG) ** 2 + (blue - blackB) ** 2;
		const distanceToWhite = (red - whiteR) ** 2 + (green - whiteG) ** 2 + (blue - whiteB) ** 2;

		if (distanceToBlack < distanceToWhite) {
			data[i] = blackR;
			data[i + 1] = blackG;
			data[i + 2] = blackB;
		} else {
			data[i] = whiteR;
			data[i + 1] = whiteG;
			data[i + 2] = whiteB;
		}
	}
}

export function convertImageData(canvas: HTMLCanvasElement, colorPalette: ColorPaletteT): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Canvas context not available');
	}

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	recolorImageData(imageData, colorPalette);
	ctx.putImageData(imageData, 0, 0);
}

export function drawDitheredNoise(
	canvasContext: CanvasRenderingContext2D,
	width: number,
	height: number
) {
	const imageData = canvasContext.createImageData(width, height);
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		const grayValue = 128 + Math.random() * 10 - 5; // Base gray with slight variation
		data[i] = grayValue; // Red
		data[i + 1] = grayValue; // Green
		data[i + 2] = grayValue; // Blue
		data[i + 3] = 255; // Alpha (fully opaque)
	}

	canvasContext.putImageData(Dither.atkinson(imageData), 0, 0);
}
