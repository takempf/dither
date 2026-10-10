<script lang="ts">
	import { quintOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
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

	import { pageVisible, roomHistory } from '#lib/store.svelte.js';
	import { firebaseStorage, firestore } from '#lib/firebase.js';
	import { ROOM_NAME_MAX_LENGTH } from '#lib/constants.js';

	import Message from '#lib/components/message.svelte';
	import type { NewMessageT } from '#lib/components/new-message.svelte';

	const MESSAGES_COUNT = 15;

	const { data } = $props();

	const roomMessagesRef = collection(firestore, `rooms/${data.roomId}/messages`);

	let unreadCount: number = $state(0);
	let textAreaElement: HTMLTextAreaElement | undefined = $state();
	let roomNameInputValue: string = $state(data.roomId);

	// firestore data
	let room: App.RoomT | undefined = $state();
	let roomStatus: 'loading' | 'ready' | 'missing' | 'error' = $state('loading');
	let messages: App.ChatMessageT[] = $state([]);
	let messagesError: boolean = $state(false);

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
				const module = await import('#lib/components/new-message.svelte');
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
		const roomUnsubscribe = onSnapshot(
			currentRoomRef,
			(roomSnapshot) => {
				if (roomSnapshot.exists()) {
					room = roomSnapshot.data() as App.RoomT;
					roomNameInputValue = room.name;
					roomStatus = 'ready';
					updateRoomHistory();
				} else if (!roomSnapshot.metadata.fromCache) {
					// a cache miss isn't proof the room is gone, so wait for the server
					roomStatus = 'missing';
				}
			},
			(error) => {
				console.error('Error loading room', error);
				roomStatus = 'error';
			}
		);

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
		const roomMessagesUnsubscribe = onSnapshot(
			roomMessagesQuery,
			(roomMessagesSnapshot) => {
				messagesError = false;

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
			},
			(error) => {
				console.error('Error loading messages', error);
				messagesError = true;
			}
		);

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

	// errors propagate to NewMessage, which shows them
	async function handleCreateMessage({ text, imageDataBlob }: NewMessageT) {
		const newMessageRef = doc(roomMessagesRef);

		const storageRef = ref(firebaseStorage, `messages/${newMessageRef.id}/filmstrip.png`);
		await uploadBytes(storageRef, imageDataBlob);
		const imageUrl = await getDownloadURL(storageRef);

		await setDoc(newMessageRef, {
			createdAt: serverTimestamp(),
			imageUrl,
			text
		});
	}

	async function handleNameBlur() {
		const name = roomNameInputValue.trim();

		if (!name || name === room?.name) {
			roomNameInputValue = roomName;
			return;
		}

		try {
			await updateDoc(doc(firestore, 'rooms', data.roomId), { name });
		} catch (error) {
			console.error('Error renaming room', error);
			roomNameInputValue = roomName;
		}
	}

	function handleNameKeydown(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.currentTarget.blur();
		}
	}

	// grow the name field to fit its text
	function fitNameWidth() {
		if (!textAreaElement) {
			return;
		}

		textAreaElement.style.width = '1px';
		textAreaElement.style.width = `${textAreaElement.scrollWidth}px`;
	}

	$effect(() => {
		void roomNameInputValue;
		fitNameWidth();
	});

	// refit once web fonts change the text width
	$effect(() => {
		document.fonts.ready.then(fitNameWidth);
	});
</script>

<svelte:head>
	<title>{unreadCount ? `[${unreadCount}] ${roomName} - Dither` : `${roomName} - Dither`}</title>
</svelte:head>

{#if roomStatus === 'missing' || roomStatus === 'error'}
	<div class="content notice">
		<p>{roomStatus === 'missing' ? "This room doesn't exist." : "Couldn't load this room."}</p>
		<a href={resolve('/(app)')}>Back home</a>
	</div>
{:else}
	<div class="content">
		<div class="room-name-container">
			߷
			<textarea
				class="room-name"
				rows="1"
				maxlength={ROOM_NAME_MAX_LENGTH}
				bind:this={textAreaElement}
				bind:value={roomNameInputValue}
				onblur={handleNameBlur}
				onkeydown={handleNameKeydown}></textarea>
			߷
		</div>
		<div class="new-message">
			{#if NewMessage}<NewMessage onCreateMessage={handleCreateMessage} />{/if}
		</div>

		{#if messagesError}
			<p class="messages-status">Couldn't load messages.</p>
		{:else if messages.length === 0}
			<p class="messages-status">Nothing has been said, <em>yet!</em></p>
		{/if}
		<ul class="messages">
			{#each messages as { id, text, imageUrl }, i (id)}
				<li class="message-container" animate:flip={{ duration: 500, easing: quintOut }}>
					<Message {text} {imageUrl} index={i} />
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.content {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1em;
		padding: 1em;
	}

	.notice {
		align-items: center;
		text-align: center;
	}

	.messages-status {
		margin: 0;
		text-align: center;
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
