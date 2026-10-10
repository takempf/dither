import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
	initializeFirestore,
	getFirestore,
	connectFirestoreEmulator,
	persistentLocalCache,
	persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

import { PUBLIC_FIREBASE_API_KEY, PUBLIC_RECAPTCHA_SITE_KEY } from '$app/env/public';

// Vite can re-run this module on HMR, but Firebase only allows setup once
const isFirstRun = getApps().length === 0;

export const firebaseApp = isFirstRun
	? initializeApp({
			apiKey: PUBLIC_FIREBASE_API_KEY,
			storageBucket: 'not-firebase-58b83.appspot.com',
			projectId: 'not-firebase-58b83'
		})
	: getApp();

export const firestore = isFirstRun
	? initializeFirestore(firebaseApp, {
			// IndexedDB cache, shared across tabs
			localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
		})
	: getFirestore(firebaseApp);

export const firebaseStorage = getStorage(firebaseApp);
// fail a stuck upload in 30s instead of the default 10 min, so the sender sees an error
firebaseStorage.maxUploadRetryTime = 30_000;

if (isFirstRun) {
	// the emulators don't check App Check tokens, so only run it in prod builds
	if (!import.meta.env.DEV && PUBLIC_RECAPTCHA_SITE_KEY) {
		initializeAppCheck(firebaseApp, {
			provider: new ReCaptchaEnterpriseProvider(PUBLIC_RECAPTCHA_SITE_KEY),
			isTokenAutoRefreshEnabled: true
		});
	}

	if (import.meta.env.DEV) {
		connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
		connectStorageEmulator(firebaseStorage, '127.0.0.1', 9199);
	}
}
