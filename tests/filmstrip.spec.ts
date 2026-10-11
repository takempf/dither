import { expect, test, type Locator, type Page } from '@playwright/test';

// index of the source frame the filmstrip canvas shows, or -1 if it shows none of them
function shownFrame(page: Page, stripUrl: string): Promise<number> {
	return page.evaluate(async (stripUrl) => {
		const canvas = document.querySelector<HTMLCanvasElement>('.filmstrip canvas')!;
		const shown = canvas.getContext('2d')!.getImageData(0, 0, 200, 150).data;
		const brightness = (i: number) => shown[i] + shown[i + 1] + shown[i + 2];
		let brightest = 0;
		for (let i = 0; i < shown.length; i += 4) {
			brightest = Math.max(brightest, brightness(i));
		}

		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.src = stripUrl;
		await image.decode();
		const context = document.createElement('canvas').getContext('2d')!;
		context.canvas.width = 200;
		context.canvas.height = 150;

		for (let frame = 0; frame < image.naturalHeight / 150; frame++) {
			context.drawImage(image, 0, frame * 150, 200, 150, 0, 0, 200, 150);
			const source = context.getImageData(0, 0, 200, 150).data;
			let matches = true;
			for (let i = 0; i < source.length && matches; i += 4) {
				matches = source[i] >= 128 === (brightness(i) === brightest);
			}
			if (matches) {
				return frame;
			}
		}
		return -1;
	}, stripUrl);
}

function shownColors(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const canvas = document.querySelector<HTMLCanvasElement>('.filmstrip canvas')!;
		const data = canvas.getContext('2d')!.getImageData(0, 0, 200, 150).data;
		const colors = new Set<string>();
		for (let i = 0; i < data.length; i += 4) {
			colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
		}
		return [...colors].sort();
	});
}

async function expectPlays(page: Page, stripUrl: string) {
	await expect(page.locator('.filmstrip canvas')).toBeAttached();
	// loading noise shows first
	await expect
		.poll(() => shownFrame(page, stripUrl), { timeout: 10_000 })
		.toBeGreaterThanOrEqual(0);

	const frames = new Set<number>();
	await expect
		.poll(
			async () => {
				frames.add(await shownFrame(page, stripUrl));
				return frames.size;
			},
			{ intervals: [150], timeout: 10_000 }
		)
		.toBeGreaterThanOrEqual(3);
	// never noise or a blank frame
	expect(frames.has(-1)).toBe(false);
}

// the feed canvas may be transferred to a worker, so compare screenshots
async function expectFeedMoves(feed: Locator) {
	await expect(feed.locator('..')).toHaveClass(/playing/);
	const first = await feed.screenshot();
	await expect.poll(async () => (await feed.screenshot()).equals(first)).toBe(false);
}

test('filmstrip plays its frames in palette colors', async ({ page }) => {
	await page.goto('/');
	await expectPlays(page, '/home-promo-filmstrip.png');
	expect(await shownColors(page)).toEqual(['18,29,29', '210,255,248']);

	await page.getByRole('button', { name: /^Theme:/ }).click();
	await page.getByRole('option', { name: 'IBM 5151' }).click();
	await expect.poll(() => shownColors(page)).toEqual(['1,235,97', '37,51,47']);
	await expectPlays(page, '/home-promo-filmstrip.png');
});

test('camera page loads without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto('/camera');
	await expect(page.locator('canvas.display-webcam')).toBeAttached();
	await expect(page.getByRole('button', { name: /enable your webcam/ })).toBeVisible();
	expect(errors).toEqual([]);
});

test('webcam feed shows moving video', { tag: '@camera' }, async ({ page }) => {
	await page.goto('/camera');
	await page.getByRole('button', { name: /enable your webcam/ }).click();
	await expectFeedMoves(page.locator('canvas.display-webcam'));
});

test('webcam feed works without canvas transfer', { tag: '@camera' }, async ({ page }) => {
	// like Safari before 16.4, so dithering falls back to the main thread
	await page.addInitScript(() => {
		// @ts-expect-error removing a built-in
		delete HTMLCanvasElement.prototype.transferControlToOffscreen;
	});
	await page.goto('/camera');
	await page.getByRole('button', { name: /enable your webcam/ }).click();
	await expectFeedMoves(page.locator('canvas.display-webcam'));
});

test('a sent clip plays back in the room', { tag: '@camera' }, async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Create a GIF Chat Room' }).click();
	await page.waitForURL(/\/rooms\/\w+$/);
	await page.getByRole('button', { name: /enable your webcam/ }).click();
	await expectFeedMoves(page.locator('canvas.display-webcam'));

	const stripResponse = page.waitForResponse(
		(response) => /filmstrip\.png\?alt=media/.test(response.url()) && response.ok()
	);
	const message = page.getByRole('textbox', { name: 'Message' });
	await message.fill('playback check');
	await message.press('Enter');

	await expectPlays(page, (await stripResponse).url());
});
