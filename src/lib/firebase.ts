import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
	initializeFirestore,
	connectFirestoreEmulator,
	memoryLocalCache,
	persistentLocalCache,
	persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

import { browser } from '$app/env';
import { PUBLIC_FIREBASE_API_KEY, PUBLIC_RECAPTCHA_SITE_KEY } from '$app/env/public';

export const firebaseApp = initializeApp({
	apiKey: PUBLIC_FIREBASE_API_KEY,
	storageBucket: 'not-firebase-58b83.appspot.com',
	projectId: 'not-firebase-58b83'
});

// the emulators don't check App Check tokens, so only run it in prod builds
if (browser && !import.meta.env.DEV && PUBLIC_RECAPTCHA_SITE_KEY) {
	initializeAppCheck(firebaseApp, {
		provider: new ReCaptchaEnterpriseProvider(PUBLIC_RECAPTCHA_SITE_KEY),
		isTokenAutoRefreshEnabled: true
	});
}

export const firestore = initializeFirestore(firebaseApp, {
	// IndexedDB cache in the browser, shared across tabs. No IndexedDB during SSR.
	localCache: browser
		? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
		: memoryLocalCache()
});
export const firebaseStorage = getStorage(firebaseApp);
// fail a stuck upload in 30s instead of the default 10 min, so the sender sees an error
firebaseStorage.maxUploadRetryTime = 30_000;

if (import.meta.env.DEV) {
	connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
	connectStorageEmulator(firebaseStorage, '127.0.0.1', 9199);
}
