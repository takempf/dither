import { readFileSync } from 'node:fs';
import { test } from '@playwright/test';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	serverTimestamp,
	setDoc,
	updateDoc,
	type Firestore
} from 'firebase/firestore';

const PROJECT_ID = 'not-firebase-58b83';
const BUCKET = `gs://${PROJECT_ID}.appspot.com`;
const PNG = new Uint8Array([137, 80, 78, 71]);

let testEnv: RulesTestEnvironment;
let db: Firestore;

test.beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
		storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 }
	});
	db = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
});

test.afterAll(async () => {
	await testEnv?.cleanup();
});

function storage() {
	return testEnv.unauthenticatedContext().storage(BUCKET);
}

// UploadTask is thenable but not a Promise, which assertSucceeds/assertFails want
function upload(path: string, contentType = 'image/png') {
	const fileRef = storage().ref(path);
	return { fileRef, done: fileRef.put(PNG, { contentType }).then(() => fileRef) };
}

async function createRoom() {
	return addDoc(collection(db, 'rooms'), { name: 'room', createdAt: serverTimestamp() });
}

async function uploadFilmstrip(messageId: string) {
	const fileRef = await upload(`messages/${messageId}/filmstrip.png`).done;
	return (await fileRef.getDownloadURL()) as string;
}

test.describe('rooms', () => {
	test('can be created with a name and server timestamp', async () => {
		await assertSucceeds(createRoom());
	});

	test('reject extra fields, long names and client timestamps', async () => {
		const rooms = collection(db, 'rooms');
		await assertFails(addDoc(rooms, { name: 'room', createdAt: serverTimestamp(), extra: 1 }));
		await assertFails(addDoc(rooms, { name: 'a'.repeat(56), createdAt: serverTimestamp() }));
		await assertFails(addDoc(rooms, { name: 'room', createdAt: new Date() }));
	});

	test('can be read by id but not listed', async () => {
		const room = await createRoom();
		await assertSucceeds(getDoc(room));
		await assertFails(getDocs(collection(db, 'rooms')));
	});

	test('can only be renamed to a valid name', async () => {
		const room = await createRoom();
		await assertSucceeds(updateDoc(room, { name: 'renamed' }));
		await assertFails(updateDoc(room, { name: '' }));
		await assertFails(updateDoc(room, { name: 5 }));
		await assertFails(updateDoc(room, { createdAt: serverTimestamp() }));
	});
});

test.describe('messages', () => {
	test('can be created with their own filmstrip URL', async () => {
		const room = await createRoom();
		const message = doc(collection(db, `rooms/${room.id}/messages`));
		const imageUrl = await uploadFilmstrip(message.id);

		await assertSucceeds(setDoc(message, { text: 'hi', imageUrl, createdAt: serverTimestamp() }));
		await assertSucceeds(getDocs(collection(db, `rooms/${room.id}/messages`)));
		await assertFails(updateDoc(message, { text: 'edited' }));
	});

	test('reject foreign image URLs and long text', async () => {
		const room = await createRoom();
		const messages = collection(db, `rooms/${room.id}/messages`);
		const message = doc(messages);
		const imageUrl = await uploadFilmstrip(message.id);
		const createdAt = serverTimestamp();

		await assertFails(
			setDoc(message, { text: 'hi', imageUrl: 'https://evil.example/x.png', createdAt })
		);
		// another message's filmstrip
		await assertFails(setDoc(doc(messages), { text: 'hi', imageUrl, createdAt }));
		await assertFails(setDoc(message, { text: 'a'.repeat(281), imageUrl, createdAt }));
		await assertSucceeds(setDoc(message, { text: 'a'.repeat(280), imageUrl, createdAt }));
	});
});

test.describe('filmstrips', () => {
	test('can be uploaded once, as PNG', async () => {
		const path = `messages/${crypto.randomUUID()}/filmstrip.png`;
		await assertSucceeds(upload(path).done);
		await assertFails(upload(path).done);

		await assertFails(upload(`messages/${crypto.randomUUID()}/filmstrip.png`, 'text/html').done);
	});
});
