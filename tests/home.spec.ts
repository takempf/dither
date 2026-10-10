import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});

test('theme choice is applied and remembered', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /^Theme:/ }).click();
	await page.getByRole('option', { name: 'IBM 5151' }).click();

	const white = () =>
		page.evaluate(() => document.documentElement.style.getPropertyValue('--white'));
	await expect.poll(white).toBe('#01EB61');

	await page.reload();
	await expect.poll(white).toBe('#01EB61');
});
