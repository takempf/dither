import { defineConfig } from '@playwright/test';

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
		baseURL: 'http://localhost:4173',
		permissions: ['camera'],
		launchOptions: {
			// a synthetic webcam that needs no permission prompt
			args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
		}
	}
});
