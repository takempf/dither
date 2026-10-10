<script lang="ts">
	interface Props {
		imageUrl: string;
		blur: number;
	}

	let { imageUrl, blur = 0 }: Props = $props();
	let canvas: HTMLCanvasElement | null = $state(null);
	let error: string | null = $state(null);

	$effect(() => {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error('Error getting 2d context from canvas in dithered bg');
			return;
		}

		const img = document.createElement('img');
		img.crossOrigin = 'anonymous';
		img.src = imageUrl;

		const handleResize = () => {
			if (!canvas) {
				return;
			}

			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			if (img.complete) generateDitheredBackground(ctx, img);
		};

		img.onload = () => {
			handleResize();
			window.addEventListener('resize', handleResize);
		};

		img.onerror = () => {
			error = 'Failed to load the image. Please check the URL and try again.';
		};

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	function generateDitheredBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
		const { width, height } = ctx.canvas;
		const imageData = ctx.createImageData(width, height);
		const data = imageData.data;

		// Create a temporary canvas to sample colors from the image
		const tempCanvas = document.createElement('canvas');
		const tempCtx = tempCanvas.getContext('2d');
		if (!tempCtx) return;

		tempCanvas.width = img.width;
		tempCanvas.height = img.height;
		tempCtx.drawImage(img, 0, 0, img.width, img.height);

		// Generate blue noise
		const noise = generateBlueNoise(width, height);

		// Apply dithering
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const index = (y * width + x) * 4;
				const noiseValue = noise[y * width + x];

				// Sample color from the original image
				const sampleX = Math.floor((x / width) * img.width);
				const sampleY = Math.floor((y / height) * img.height);
				const sampleColor = tempCtx.getImageData(sampleX, sampleY, 1, 1).data;

				// Apply dithering based on noise value
				const dither = noiseValue < 0.5 ? -0.2 : 0.2;

				data[index] = Math.max(0, Math.min(255, sampleColor[0] + dither * 255)); // Red
				data[index + 1] = Math.max(0, Math.min(255, sampleColor[1] + dither * 255)); // Green
				data[index + 2] = Math.max(0, Math.min(255, sampleColor[2] + dither * 255)); // Blue
				data[index + 3] = 255; // Alpha
			}
		}

		ctx.putImageData(imageData, 0, 0);

		// Apply blur if specified
		if (blur > 0) {
			ctx.filter = `blur(${blur}px)`;
			ctx.drawImage(ctx.canvas, 0, 0);
			ctx.filter = 'none';
		}
	}

	function generateBlueNoise(width: number, height: number): Float32Array {
		const size = width * height;
		const noise = new Float32Array(size);

		// Generate initial white noise
		for (let i = 0; i < size; i++) {
			noise[i] = Math.random();
		}

		// Apply blue noise algorithm (simple version)
		const kernel = [
			[0, 1, 0],
			[1, 0, 1],
			[0, 1, 0]
		];

		const newNoise = new Float32Array(size);

		for (let i = 0; i < 10; i++) {
			// Adjust iterations for quality vs performance
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					let sum = 0;
					let count = 0;

					for (let ky = -1; ky <= 1; ky++) {
						for (let kx = -1; kx <= 1; kx++) {
							const nx = x + kx;
							const ny = y + ky;

							if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
								sum += noise[ny * width + nx] * kernel[ky + 1][kx + 1];
								count += kernel[ky + 1][kx + 1];
							}
						}
					}

					newNoise[y * width + x] = sum / count;
				}
			}

			for (let j = 0; j < size; j++) {
				noise[j] += (noise[j] - newNoise[j]) * 0.5;
			}
		}

		// Normalize noise values
		let min = Infinity;
		let max = -Infinity;
		for (let i = 0; i < size; i++) {
			min = Math.min(min, noise[i]);
			max = Math.max(max, noise[i]);
		}
		for (let i = 0; i < size; i++) {
			noise[i] = (noise[i] - min) / (max - min);
		}

		return noise;
	}
</script>

{#if error}
	<div class="text-red-500" role="alert">{error}</div>
{:else}
	<canvas
		bind:this={canvas}
		class="fixed inset-0 w-full h-full"
		style="z-index: -1;"
		aria-hidden="true"
	></canvas>
{/if}
