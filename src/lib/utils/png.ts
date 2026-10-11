// 1-bit grayscale PNG for dithered images, about 15% smaller than a palette PNG.
// Pixels with red >= 128 are white, the rest black.

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

let crcTable: Uint32Array | undefined;

function crc32(bytes: Uint8Array): number {
	if (!crcTable) {
		crcTable = new Uint32Array(256);
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) {
				c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			}
			crcTable[n] = c;
		}
	}

	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(12 + data.length);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, data.length);
	for (let i = 0; i < 4; i++) {
		bytes[4 + i] = type.charCodeAt(i);
	}
	bytes.set(data, 8);
	// CRC covers type and data
	view.setUint32(8 + data.length, crc32(bytes.subarray(4, 8 + data.length)));
	return bytes;
}

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
	const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeOneBitPng({ data, width, height }: ImageData): Promise<Blob> {
	const bytesPerRow = Math.ceil(width / 8);
	// each row starts with filter type 0 (none)
	const raw = new Uint8Array((bytesPerRow + 1) * height);

	for (let y = 0; y < height; y++) {
		const rowStart = y * (bytesPerRow + 1) + 1;
		for (let x = 0; x < width; x++) {
			if (data[(y * width + x) * 4] >= 128) {
				raw[rowStart + (x >> 3)] |= 0x80 >> (x & 7);
			}
		}
	}

	const header = new Uint8Array(13);
	const headerView = new DataView(header.buffer);
	headerView.setUint32(0, width);
	headerView.setUint32(4, height);
	header[8] = 1; // bit depth
	header[9] = 0; // grayscale
	// compression, filter and interlace methods stay 0

	return new Blob(
		[
			new Uint8Array(PNG_SIGNATURE),
			chunk('IHDR', header),
			chunk('IDAT', await deflate(raw)),
			chunk('IEND', new Uint8Array())
		],
		{ type: 'image/png' }
	);
}
