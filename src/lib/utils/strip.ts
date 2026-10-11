import { atkinsonDither, parseHexColor, type ColorPaletteT } from './canvas.js';

// a filmstrip packed to 1 bit per pixel, about 75KB instead of 2.4MB as RGBA
export interface PackedStripT {
	width: number;
	frameHeight: number;
	frameCount: number;
	bits: Uint8Array;
}

// packed strips are small, so keeping a few rooms' worth is cheap
const CACHE_SIZE = 50;
const NOISE_FRAME_COUNT = 4;

// least recently used first
const cache = new Map<string, Promise<PackedStripT>>();
let scratchContext: CanvasRenderingContext2D | null | undefined;
let noiseStrip: PackedStripT | undefined;

function bytesPerRow(width: number): number {
	return Math.ceil(width / 8);
}

// white where red >= 128, like the dithered upload
function packRows(
	data: Uint8ClampedArray,
	width: number,
	rows: number,
	bits: Uint8Array,
	offset: number
) {
	const rowBytes = bytesPerRow(width);
	for (let y = 0; y < rows; y++) {
		const rowStart = offset + y * rowBytes;
		for (let x = 0; x < width; x++) {
			if (data[(y * width + x) * 4] >= 128) {
				bits[rowStart + (x >> 3)] |= 0x80 >> (x & 7);
			}
		}
	}
}

async function decodeStrip(url: string, frameHeight: number): Promise<PackedStripT> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Filmstrip request failed with ${response.status}`);
	}
	const bitmap = await createImageBitmap(await response.blob());

	try {
		const { width } = bitmap;
		const frameCount = Math.max(1, Math.floor(bitmap.height / frameHeight));
		const bits = new Uint8Array(bytesPerRow(width) * frameHeight * frameCount);

		// one shared frame-sized canvas, so decoding never holds a full RGBA copy
		scratchContext ??= document.createElement('canvas').getContext('2d', {
			willReadFrequently: true
		});
		if (!scratchContext) {
			throw new Error('Canvas 2D context could not be initialized');
		}
		const { canvas } = scratchContext;
		if (canvas.width !== width || canvas.height !== frameHeight) {
			canvas.width = width;
			canvas.height = frameHeight;
		}

		for (let frame = 0; frame < frameCount; frame++) {
			scratchContext.drawImage(
				bitmap,
				0,
				frame * frameHeight,
				width,
				frameHeight,
				0,
				0,
				width,
				frameHeight
			);
			const { data } = scratchContext.getImageData(0, 0, width, frameHeight);
			packRows(data, width, frameHeight, bits, frame * frameHeight * bytesPerRow(width));
		}

		return { width, frameHeight, frameCount, bits };
	} finally {
		bitmap.close();
	}
}

export function loadStrip(url: string, frameHeight: number): Promise<PackedStripT> {
	let strip = cache.get(url);
	if (strip) {
		// move to the most recently used end
		cache.delete(url);
	} else {
		strip = decodeStrip(url, frameHeight);
		// failed loads can be retried
		strip.catch(() => {
			if (cache.get(url) === strip) {
				cache.delete(url);
			}
		});
	}
	cache.set(url, strip);

	if (cache.size > CACHE_SIZE) {
		cache.delete(cache.keys().next().value!);
	}
	return strip;
}

// dithered gray noise for strips that are still loading, made once
export function getNoiseStrip(width: number, frameHeight: number): PackedStripT {
	if (noiseStrip?.width === width && noiseStrip.frameHeight === frameHeight) {
		return noiseStrip;
	}

	const bits = new Uint8Array(bytesPerRow(width) * frameHeight * NOISE_FRAME_COUNT);
	const imageData = new ImageData(width, frameHeight);
	for (let frame = 0; frame < NOISE_FRAME_COUNT; frame++) {
		const { data } = imageData;
		for (let i = 0; i < data.length; i += 4) {
			// base gray with slight variation
			data.fill(128 + Math.random() * 10 - 5, i, i + 3);
		}
		atkinsonDither(imageData);
		packRows(data, width, frameHeight, bits, frame * frameHeight * bytesPerRow(width));
	}

	noiseStrip = { width, frameHeight, frameCount: NOISE_FRAME_COUNT, bits };
	return noiseStrip;
}

// palette colors as whole pixels, in the platform's byte order
export function paletteToPixels(colorPalette: ColorPaletteT): [black: number, white: number] {
	const pixel = new Uint8ClampedArray(4);
	const pixel32 = new Uint32Array(pixel.buffer);
	return colorPalette.map((color) => {
		pixel.set([...parseHexColor(color), 255]);
		return pixel32[0];
	}) as [number, number];
}

// writes one recolored frame into a reused, frame-sized buffer
export function renderFrame(
	strip: PackedStripT,
	frame: number,
	[black, white]: [number, number],
	pixels: Uint32Array
) {
	const rowBytes = bytesPerRow(strip.width);
	let byteIndex = frame * strip.frameHeight * rowBytes;

	for (let y = 0, pixelIndex = 0; y < strip.frameHeight; y++, byteIndex += rowBytes) {
		for (let x = 0; x < strip.width; x++, pixelIndex++) {
			pixels[pixelIndex] = strip.bits[byteIndex + (x >> 3)] & (0x80 >> (x & 7)) ? white : black;
		}
	}
}

// the whole strip in palette colors, for GIF export
export function stripToImageData(strip: PackedStripT, colorPalette: ColorPaletteT): ImageData {
	const imageData = new ImageData(strip.width, strip.frameHeight * strip.frameCount);
	const pixels = new Uint32Array(imageData.data.buffer);
	const colors = paletteToPixels(colorPalette);
	const framePixels = strip.width * strip.frameHeight;

	for (let frame = 0; frame < strip.frameCount; frame++) {
		renderFrame(
			strip,
			frame,
			colors,
			pixels.subarray(frame * framePixels, (frame + 1) * framePixels)
		);
	}
	return imageData;
}
