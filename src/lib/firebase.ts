import { initializeApp } from 'firebase/app';
import {
	initializeFirestore,
	connectFirestoreEmulator,
	memoryLocalCache,
	persistentLocalCache,
	persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

import { browser } from '$app/env';
import { PUBLIC_FIREBASE_API_KEY } from '$app/env/public';

export const firebaseApp = initializeApp({
	apiKey: PUBLIC_FIREBASE_API_KEY,
	storageBucket: 'not-firebase-58b83.appspot.com',
	projectId: 'not-firebase-58b83'
});

export const firestore = initializeFirestore(firebaseApp, {
	// IndexedDB cache in the browser, shared across tabs. No IndexedDB during SSR.
	localCache: browser
		? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
		: memoryLocalCache()
});
export const firebaseStorage = getStorage(firebaseApp);

if (import.meta.env.DEV) {
	connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
	connectStorageEmulator(firebaseStorage, '127.0.0.1', 9199);
}
