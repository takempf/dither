import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

import { PUBLIC_FIREBASE_API_KEY } from '$app/env/public';

export const firebaseApp = initializeApp({
	apiKey: PUBLIC_FIREBASE_API_KEY,
	databaseURL: 'not-firebase-58b83.firebaseapp.com',
	storageBucket: 'not-firebase-58b83.appspot.com',
	projectId: 'not-firebase-58b83'
});

export const firestore = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

if (import.meta.env.DEV) {
	connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
	connectStorageEmulator(firebaseStorage, '127.0.0.1', 9199);
}
