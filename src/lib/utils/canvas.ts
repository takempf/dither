export type ColorPaletteT = readonly [black: string, white: string];

type RgbT = readonly [r: number, g: number, b: number];

const parsedColors = new Map<string, RgbT>();

export function parseHexColor(hex: string): RgbT {
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

// 1-bit Atkinson dithering, in place. Ported from canvas-dither.
export function atkinsonDither(imageData: ImageData): ImageData {
	const { data, width } = imageData;
	// clamped, so diffused error saturates at 0 and 255 like the original
	const luminance = new Uint8ClampedArray(width * imageData.height);

	for (let l = 0, i = 0; i < data.length; l++, i += 4) {
		luminance[l] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
	}

	for (let l = 0, i = 0; i < data.length; l++, i += 4) {
		const value = luminance[l] < 129 ? 0 : 255;
		// Atkinson spreads 6/8 of the error, so 1/8 to each neighbor
		const error = Math.floor((luminance[l] - value) / 8);
		data.fill(value, i, i + 3);

		luminance[l + 1] += error;
		luminance[l + 2] += error;
		luminance[l + width - 1] += error;
		luminance[l + width] += error;
		luminance[l + width + 1] += error;
		luminance[l + 2 * width] += error;
	}

	return imageData;
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
