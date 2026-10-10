import Dither from 'canvas-dither';

export function convertImageData(
	canvas: HTMLCanvasElement,
	colorPalette: [black: string, white: string]
): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Canvas context not available');
	}

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;
	const blackColor = {
		r: parseInt(colorPalette[0].slice(1, 3), 16),
		g: parseInt(colorPalette[0].slice(3, 5), 16),
		b: parseInt(colorPalette[0].slice(5, 7), 16)
	};
	const whiteColor = {
		r: parseInt(colorPalette[1].slice(1, 3), 16),
		g: parseInt(colorPalette[1].slice(3, 5), 16),
		b: parseInt(colorPalette[1].slice(5, 7), 16)
	};

	for (let i = 0; i < data.length; i += 4) {
		const red = data[i];
		const green = data[i + 1];
		const blue = data[i + 2];

		// Calculate distances to both colors in the palette
		const distanceToBlack = Math.sqrt(
			Math.pow(red - blackColor.r, 2) +
				Math.pow(green - blackColor.g, 2) +
				Math.pow(blue - blackColor.b, 2)
		);

		const distanceToWhite = Math.sqrt(
			Math.pow(red - whiteColor.r, 2) +
				Math.pow(green - whiteColor.g, 2) +
				Math.pow(blue - whiteColor.b, 2)
		);

		// Choose the closest color
		const closestColor = distanceToBlack < distanceToWhite ? blackColor : whiteColor;

		// Set the pixel to the closest color
		data[i] = closestColor.r;
		data[i + 1] = closestColor.g;
		data[i + 2] = closestColor.b;
	}

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

	canvasContext.putImageData(imageData, 0, 0);
	const canvasImageData = canvasContext.getImageData(0, 0, 200, 150);
	const filteredImageData = Dither.atkinson(canvasImageData);
	canvasContext.putImageData(filteredImageData, 0, 0);
}
