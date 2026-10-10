import { expect, test } from '@playwright/test';

test('camera shows the dithered feed and saves a GIF', async ({ page }) => {
	await page.goto('/camera');
	await page.getByRole('button', { name: /enable your webcam/ }).click();
	await expect(page.locator('.stylized-webcam-feed.playing')).toBeVisible();

	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Generate Gif' }).click();
	expect((await download).suggestedFilename()).toMatch(/^dither-gif_\w+\.gif$/);
});

test('resolution choice resizes the feed', async ({ page }) => {
	await page.goto('/camera');
	await page.getByRole('button', { name: /^Camera resolution:/ }).click();
	await page.getByRole('option', { name: '480 x 360' }).click();

	await expect(page.locator('canvas.display-webcam')).toHaveCSS('width', '480px');
});
