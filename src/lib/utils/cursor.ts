import { CURSOR_URL, CURSOR_POINTER_URL, CURSOR_TEXT_URL } from '#lib/constants.js';

export async function transformCursorColors(
	originalCursorUrl: string,
	colorA: string,
	colorB: string
): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const img = new Image();
		img.src = originalCursorUrl;

		img.onload = () => {
			let canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Canvas context not available'));
				return;
			}

			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);

			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;

			for (let i = 0; i < data.length; i += 4) {
				const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
				// Grayscale value
				const ratio = avg / 255; // Ratio of original color to white (0 to 1)

				// Interpolate between colorA and colorB based on the ratio
				data[i] = Math.round(
					parseInt(colorA.slice(1, 3), 16) * (1 - ratio) + parseInt(colorB.slice(1, 3), 16) * ratio
				); // Red
				data[i + 1] = Math.round(
					parseInt(colorA.slice(3, 5), 16) * (1 - ratio) + parseInt(colorB.slice(3, 5), 16) * ratio
				); // Green
				data[i + 2] = Math.round(
					parseInt(colorA.slice(5, 7), 16) * (1 - ratio) + parseInt(colorB.slice(5, 7), 16) * ratio
				); // Blue
			}

			ctx.putImageData(imageData, 0, 0);
			const newCursorUrl = canvas.toDataURL();
			resolve(newCursorUrl);
			(canvas as unknown) = null;
		};

		img.onerror = reject;
	});
}

export async function updateCursorColors(black: string, white: string) {
	try {
		// default cursor
		const cursorData = await transformCursorColors(CURSOR_URL, black, white);
		document.documentElement.style.setProperty('--cursor-default-image', `url(${cursorData})`);
		// pointer cursor
		const pointerCursorData = await transformCursorColors(CURSOR_POINTER_URL, black, white);
		document.documentElement.style.setProperty(
			'--cursor-pointer-image',
			`url(${pointerCursorData})`
		);
		// text cursor
		const textCursorData = await transformCursorColors(CURSOR_TEXT_URL, black, white);
		document.documentElement.style.setProperty('--cursor-text-image', `url(${textCursorData})`);
	} catch (error) {
		console.error('Error transforming cursor:', error);
	}
}
