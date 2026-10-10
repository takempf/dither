<script lang="ts">
	import { quintOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import {
		setDoc,
		doc,
		collection,
		onSnapshot,
		query,
		orderBy,
		limit,
		serverTimestamp,
		updateDoc
	} from 'firebase/firestore';

	import { pageVisible, roomHistory } from '$/store.svelte.js';
	import { firebaseStorage, firestore } from '$/firebase.js';

	import Message from '$/components/message.svelte';

	const MESSAGES_COUNT = 15;

	const { data } = $props();

	const roomMessagesRef = collection(firestore, `rooms/${data.roomId}/messages`);

	let unreadCount: number = $state(0);
	let textAreaElement: HTMLTextAreaElement | null;
	let roomNameInputValue: string = $state(data.roomId);

	// firestore data
	let room: App.RoomT | undefined = $state();
	let messages: App.ChatMessageT[] = $state([]);

	let roomName: string = $derived(room?.name || data.roomId);

	function updateRoomHistory() {
		const updatedRoomHistory = {
			...$roomHistory,
			[data.roomId]: {
				lastSeen: Date.now(),
				name: roomName
			}
		};
		$roomHistory = updatedRoomHistory;
	}

	let NewMessage = $state();

	$effect(() => {
		(async function () {
			try {
				// import the NewMessage component
				const module = await import('$/components/new-message.svelte');
				NewMessage = module.default as any as typeof NewMessage;
			} catch (importError) {
				console.error('Error importing NewMessage component', importError);
			}
		})();
	});

	$effect(() => {
		if (!data.roomId) {
			return;
		}

		// get room data
		const currentRoomRef = doc(firestore, 'rooms', data.roomId);
		const roomUnsubscribe = onSnapshot(currentRoomRef, (roomSnapshot) => {
			// TODO // some kind of 404 if there's no room at all
			if (roomSnapshot.exists()) {
				room = roomSnapshot.data() as App.RoomT;
				roomNameInputValue = room.name;
				updateRoomHistory();
			}
		});

		return () => {
			roomUnsubscribe();
		};
	});

	$effect(() => {
		// get room messages
		const roomMessagesQuery = query(
			roomMessagesRef,
			limit(MESSAGES_COUNT),
			orderBy('createdAt', 'desc')
		);
		let isInitialSnapshot = true;
		const roomMessagesUnsubscribe = onSnapshot(roomMessagesQuery, (roomMessagesSnapshot) => {
			// count messages that arrive while the tab is in the background
			if (!isInitialSnapshot && document.hidden) {
				unreadCount += roomMessagesSnapshot
					.docChanges()
					.filter((change) => change.type === 'added').length;
			}
			isInitialSnapshot = false;

			messages = roomMessagesSnapshot.docs.map((doc) => {
				const { createdAt, imageUrl, text } = doc.data();

				return {
					id: doc.id,
					createdAt,
					imageUrl,
					text
				};
			});
		});

		return () => {
			roomMessagesUnsubscribe();
		};
	});

	$effect(() =>
		pageVisible.subscribe((visible) => {
			if (visible) {
				unreadCount = 0;
			}
		})
	);

	interface HandleCreateMessageArgs {
		text: string;
		imageDataBlob: Blob;
	}

	async function handleCreateMessage({ text, imageDataBlob }: HandleCreateMessageArgs) {
		try {
			// Generate a new document ID for the message
			const newMessageRef = doc(roomMessagesRef);
			const messageId = newMessageRef.id;

			// Upload the image to Firebase Storage
			const storageRef = ref(firebaseStorage, `messages/${messageId}/filmstrip.png`);
			await uploadBytes(storageRef, imageDataBlob); // Assuming imageDataURL is a data URL

			// Get the download URL of the uploaded image
			const imageUrl = await getDownloadURL(storageRef);

			await setDoc(newMessageRef, {
				createdAt: serverTimestamp(),
				imageUrl: imageUrl,
				text
			});
		} catch (addMessageError) {
			console.error('Error adding message to room', addMessageError);
		}
	}

	async function handleNameBlur() {
		const roomRef = doc(firestore, 'rooms', data.roomId);
		await updateDoc(roomRef, { name: roomNameInputValue });
	}

	function handleNameKeypress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			textAreaElement?.blur();
		}
	}

	function useResize(element: HTMLElement) {
		let resizeRAFId: number;

		function resize() {
			element.style.width = '1px';
			element.style.width = +element.scrollWidth + 'px';
			resizeRAFId = window.requestAnimationFrame(resize);
		}
		resizeRAFId = window.requestAnimationFrame(resize);

		return {
			destroy: () => window.cancelAnimationFrame(resizeRAFId)
		};
	}
</script>

<svelte:head>
	<title>{unreadCount ? `[${unreadCount}] ${roomName} - Dither` : `${roomName} - Dither`}</title>
</svelte:head>

<div class="content">
	<div class="room-name-container">
		߷
		<textarea
			class="room-name"
			rows="1"
			maxlength="55"
			bind:this={textAreaElement}
			bind:value={roomNameInputValue}
			onblur={handleNameBlur}
			onkeypress={handleNameKeypress}
			use:useResize></textarea>
		߷
	</div>
	<div class="new-message">
		{#if NewMessage}<NewMessage onCreateMessage={handleCreateMessage} />{/if}
	</div>

	<ul class="messages">
		{#if messages.length === 0}
			<p>Nothing has been said, <em>yet!</em></p>
		{/if}
		{#each messages as { id, text, imageUrl }, i (id)}
			<li class="message-container" animate:flip={{ duration: 500, easing: quintOut }}>
				<Message {text} {imageUrl} index={i} />
			</li>
		{/each}
	</ul>
</div>

<style>
	.content {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1em;
		padding: 1em;
	}

	.room-name-container {
		display: flex;
		align-items: center;
		justify-content: center;
		align-self: center;
		padding: 0 15px;
		border: var(--white) 1px dotted;
		border-radius: 0.25em;
		font-size: 12px;
		background: var(--black);
		margin-top: calc((1rem + 1.5rem) * -1);

		@media (width <= 900px) {
			margin-top: 0;
		}
	}

	.room-name {
		box-sizing: content-box;
		display: inline-block;
		margin: 0;
		padding: 10px;
		overflow: hidden;
		max-width: 100%;
		white-space: nowrap;
		font-size: 14px;
		resize: none;
		/* font-style: italic; */
		text-transform: uppercase;
		text-align: center;
		background: none;
		color: var(--white);
	}

	.room-name:focus {
		outline: none;
	}

	.new-message {
		z-index: 2;
		position: relative;
	}

	.messages {
		z-index: 1;
		position: relative;
		list-style-type: none;
		margin: 0;
		padding: 0;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1.5em;
	}

	.message-container {
		transform-origin: top left;
	}
</style>
