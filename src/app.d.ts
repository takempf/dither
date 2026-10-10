// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces
declare namespace App {
	// `null` until a pending `serverTimestamp()` write is confirmed
	type FirestoreTimestamp = import('firebase/firestore').Timestamp | null;

	interface ChatMessageT {
		id: string;
		createdAt: FirestoreTimestamp;
		imageUrl: string;
		text?: string;
	}

	// what another tab in the room is doing
	interface PresenceT {
		activity: import('#lib/components/new-message.svelte').ActivityT;
		updatedAt: FirestoreTimestamp;
	}

	interface RoomT {
		createdAt: FirestoreTimestamp;
		name: string;
	}
}
