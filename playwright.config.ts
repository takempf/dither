import { defineConfig, devices } from '@playwright/test';

// a synthetic webcam that needs no permission prompt. Chromium only.
const fakeCamera = {
	permissions: ['camera'],
	launchOptions: {
		args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
	}
};

// Run with `npm test`, which starts the Firestore and Storage emulators first.
// `npm run test:e2e` reuses emulators that are already running (`npm run emulators`).
export default defineConfig({
	testDir: 'tests',
	testMatch: /.+\.spec\.ts/,
	retries: process.env.CI ? 1 : 0,
	webServer: {
		// prod build pointed at the emulators
		command: 'npm run build && npm run preview',
		env: { PUBLIC_USE_FIREBASE_EMULATORS: 'true' },
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173'
	},
	projects: [
		{ name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], ...fakeCamera } },
		{
			name: 'mobile-chrome',
			use: { ...devices['Pixel 7'], ...fakeCamera },
			// rules tests don't use a browser, so desktop runs them once
			testIgnore: /rules\.spec\.ts/
		},
		{
			// WebKit, the engine behind every iPhone browser. It has no fake camera.
			name: 'mobile-safari',
			use: devices['iPhone 13'],
			testIgnore: /rules\.spec\.ts/,
			grepInvert: /@camera/
		}
	]
});
