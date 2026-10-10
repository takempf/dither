import { expect, test, type Page } from '@playwright/test';

async function createRoom(page: Page) {
	await page.goto('/');
	await page.getByRole('button', { name: 'Create a GIF Chat Room' }).click();
	await page.waitForURL(/\/rooms\/\w+$/);

	// the name field shows the room id until the room doc loads
	const roomId = new URL(page.url()).pathname.split('/').pop()!;
	await expect(page.getByRole('textbox', { name: 'Room name' })).not.toHaveValue(roomId);
}

async function enableWebcam(page: Page) {
	await page.getByRole('button', { name: /enable your webcam/ }).click();
	await expect(page.getByRole('textbox', { name: 'Message' })).toBeEnabled();
}

test('create a room, send a message, and see it after reload', async ({ page }) => {
	await createRoom(page);
	await enableWebcam(page);

	const message = page.getByRole('textbox', { name: 'Message' });
	await message.fill('hello from playwright');
	await message.press('Enter');

	await expect(page.getByText('hello from playwright')).toBeVisible({ timeout: 30_000 });
	await expect(message).toHaveValue('');

	await page.reload();
	await expect(page.getByText('hello from playwright')).toBeVisible();
});

test('a failed upload shows an error and keeps the text', async ({ page }) => {
	await createRoom(page);
	await enableWebcam(page);
	await page.route(/:9199\/v0\/b\/.+\/o\?/, (route) =>
		route.fulfill({ status: 403, json: { error: { code: 403, message: 'Permission denied.' } } })
	);

	const message = page.getByRole('textbox', { name: 'Message' });
	await message.fill('this one fails');
	await message.press('Enter');

	await expect(page.getByRole('alert')).toHaveText("Couldn't send your message. Try again.", {
		timeout: 30_000
	});
	await expect(message).toHaveValue('this one fails');
});

test('rename a room', async ({ page }) => {
	await createRoom(page);

	const name = page.getByRole('textbox', { name: 'Room name' });
	await name.fill('renamed by playwright');
	await name.press('Enter');

	await expect(page).toHaveTitle('renamed by playwright - Dither');
	await page.reload();
	await expect(name).toHaveValue('renamed by playwright');
});

test('a visited room shows up in the room list', async ({ page }) => {
	await createRoom(page);
	const name = await page.getByRole('textbox', { name: 'Room name' }).inputValue();

	await page.goto('/');
	await page.getByRole('link', { name }).click();
	await expect(page).toHaveURL(/\/rooms\/\w+$/);
});

test('a missing room shows not-found', async ({ page }) => {
	await page.goto('/rooms/doesNotExist');
	await expect(page.getByText("This room doesn't exist.")).toBeVisible();
	await page.getByRole('link', { name: 'Back home' }).click();
	await expect(page.locator('h1')).toBeVisible();
});
