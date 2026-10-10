<script lang="ts">
	import { expoInOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { motion } from '#lib/utils/motion.js';
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
		updateDoc,
		deleteDoc,
		type DocumentReference
	} from 'firebase/firestore';

	import { pageVisibility, roomHistory } from '#lib/store.svelte.js';
	import { firebaseStorage, firestore } from '#lib/firebase.js';
	import { ROOM_NAME_MAX_LENGTH } from '#lib/constants.js';

	import Message from '#lib/components/message.svelte';
	import NewMessage, { type ActivityT, type NewMessageT } from '#lib/components/new-message.svelte';

	const MESSAGES_COUNT = 15;
	// rewrite our presence this often while active, so others know we're still here
	const PRESENCE_HEARTBEAT_MS = 5_000;
	// ignore presence not refreshed in this long, like from a closed tab
	const PRESENCE_STALE_MS = 15_000;

	// one per tab, so we can skip our own presence
	const clientId = crypto.randomUUID();

	const { data } = $props();

	const roomMessagesRef = $derived(collection(firestore, `rooms/${data.roomId}/messages`));

	let unreadCount: number = $state(0);
	let textAreaElement: HTMLTextAreaElement | undefined = $state();

	// firestore data
	let room: App.RoomT | undefined = $state();
	let roomStatus: 'loading' | 'ready' | 'missing' | 'error' = $state('loading');
	let messages: App.ChatMessageT[] = $state([]);
	let messagesError: boolean = $state(false);
	let presence: App.PresenceT[] = $state([]);
	let now: number = $state(Date.now());

	let roomName: string = $derived(room?.name || data.roomId);
	// follows roomName until edited
	let roomNameInputValue: string = $derived(roomName);

	function updateRoomHistory() {
		roomHistory.current = {
			...roomHistory.current,
			[data.roomId]: {
				lastSeen: Date.now(),
				name: roomName
			}
		};
	}

	$effect(() => {
		room = undefined;
		roomStatus = 'loading';

		// get room data
		const currentRoomRef = doc(firestore, 'rooms', data.roomId);
		const roomUnsubscribe = onSnapshot(
			currentRoomRef,
			(roomSnapshot) => {
				if (roomSnapshot.exists()) {
					room = roomSnapshot.data() as App.RoomT;
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
		messages = [];
		messagesError = false;

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

	$effect(() => {
		presence = [];

		// see what everyone else in the room is doing
		const presenceUnsubscribe = onSnapshot(
			collection(firestore, `rooms/${data.roomId}/presence`),
			(presenceSnapshot) => {
				presence = presenceSnapshot.docs
					.filter((doc) => doc.id !== clientId)
					.map((doc) => {
						const { activity, updatedAt } = doc.data();
						return { activity, updatedAt };
					});
			},
			(error) => console.error('Error loading presence', error)
		);

		return () => {
			presenceUnsubscribe();
		};
	});

	// tick while anyone is around, so stale presence drops out
	$effect(() => {
		if (presence.length === 0) {
			return;
		}

		const interval = setInterval(() => (now = Date.now()), 1_000);
		return () => clearInterval(interval);
	});

	const activeCounts = $derived.by(() => {
		const counts: Record<ActivityT, number> = { typing: 0, recording: 0 };
		for (const { activity, updatedAt } of presence) {
			if (updatedAt && now - updatedAt.toMillis() < PRESENCE_STALE_MS) {
				counts[activity]++;
			}
		}
		return counts;
	});

	const statusText: string = $derived(
		(['recording', 'typing'] as const)
			.filter((activity) => activeCounts[activity] > 0)
			.map((activity) =>
				activeCounts[activity] === 1 ? `someone is ${activity}` : `folks are ${activity}`
			)
			.join(' · ')
	);

	// width of the status text, which the status box eases to so the text recenters smoothly
	let statusTextWidth: number = $state(0);

	// start fresh next time, so it doesn't ease from the last status's width
	$effect(() => {
		if (!statusText) {
			statusTextWidth = 0;
		}
	});

	let presenceRef: DocumentReference | undefined;
	let presenceInterval: ReturnType<typeof setInterval> | undefined;

	function writePresence(activity: ActivityT) {
		if (!presenceRef) {
			return;
		}

		setDoc(presenceRef, { activity, updatedAt: serverTimestamp() }).catch((error) =>
			console.error('Error saving presence', error)
		);
	}

	function clearPresence() {
		clearInterval(presenceInterval);

		if (presenceRef) {
			deleteDoc(presenceRef).catch((error) => console.error('Error clearing presence', error));
			presenceRef = undefined;
		}
	}

	// set directly instead of in an effect, so going from typing to recording doesn't delete first
	function handleActivityChange(activity: ActivityT | null) {
		if (!activity) {
			clearPresence();
			return;
		}

		clearInterval(presenceInterval);
		presenceRef = doc(firestore, `rooms/${data.roomId}/presence/${clientId}`);
		writePresence(activity);
		presenceInterval = setInterval(() => writePresence(activity), PRESENCE_HEARTBEAT_MS);
	}

	// clear presence when leaving the room
	$effect(() => {
		void data.roomId;
		return clearPresence;
	});

	$effect(() => {
		if (pageVisibility.visible) {
			unreadCount = 0;
		}
	});

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

<svelte:window onpagehide={clearPresence} />

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
				aria-label="Room name"
				rows="1"
				maxlength={ROOM_NAME_MAX_LENGTH}
				bind:this={textAreaElement}
				bind:value={roomNameInputValue}
				onblur={handleNameBlur}
				onkeydown={handleNameKeydown}></textarea>
			߷
		</div>
		<div class="new-message">
			<NewMessage onCreateMessage={handleCreateMessage} onActivityChange={handleActivityChange} />
		</div>
		<p class="statuses" role="status">
			{#if statusText}
				<span
					class="status"
					style:width={statusTextWidth ? `${statusTextWidth}px` : undefined}
					in:scale={motion({ duration: 150, easing: expoInOut })}
					out:scale={motion({ duration: 300, easing: expoInOut })}
				>
					<span class="status__text" bind:clientWidth={statusTextWidth}>{statusText}</span>
				</span>
			{/if}
		</p>

		{#if messagesError}
			<p class="messages-status">Couldn't load messages.</p>
		{:else if messages.length === 0}
			<p class="messages-status">Nothing has been said, <em>yet!</em></p>
		{/if}
		<ul class="messages">
			{#each messages as { id, text, imageUrl }, i (id)}
				<li class="message-container" animate:flip={motion({ duration: 300, easing: expoInOut })}>
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

	/* keeps its height when empty, so messages don't jump */
	.statuses {
		display: flex;
		justify-content: center;
		min-height: 1.5em;
		margin: -0.5em 0;
		font-size: 0.7em;
	}

	.status {
		display: inline-block;
		white-space: nowrap;
		transition: width 300ms var(--ease-in-out-expo);
	}

	.status__text {
		display: inline-block;
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
