<script lang="ts">
	import humanId from 'human-id';
	import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { firestore } from '$/firebase';
	import { roomHistory } from '$/store.svelte';

	import Button from '$/components/button.svelte';
	import Message from '$/components/message.svelte';
	import RoomList from '$/components/room-list/room-list.svelte';
	import Aperture from '$/icons/aperture.svelte';
	import ArrowRight from '$/icons/arrow-right.svelte';

	const hasRoomHistory: boolean = Object.entries($roomHistory).length > 0;
	let isCreatingRoom: boolean = $state(false);

	const roomsRef = collection(firestore, 'rooms');

	async function handleNewRoomClick() {
		try {
			isCreatingRoom = true;
			const newRoomDoc = await addDoc(roomsRef, {
				name: humanId(' '),
				createdAt: serverTimestamp()
			});

			await goto(resolve('/(app)/rooms/[roomId]', { roomId: newRoomDoc.id }));
		} catch (error) {
			console.error('Error creating room', error);
		} finally {
			isCreatingRoom = false;
		}
	}

	function handleCameraClick() {
		goto(resolve('/(app)/camera'));
	}
</script>

<svelte:head>
	<title>Dither - Lofi GIF Chat</title>
</svelte:head>

<div class="index">
	<section class="intro">
		<h1 class="heading"><em>DITHER</em><br />is a lo-fi GIF chat app.</h1>
		<div>
			Create a room, invite your friends, and have fun lobbing <em>dithered</em> Game Boy Camera-esque
			animations of yourselves to each other!
		</div>
		<div class="demoMessage">
			<Message imageUrl="/home-promo-filmstrip.png" text="Howdy!" interactive={false} />
		</div>
		<div class="createNewRoom">
			<Button onclick={handleNewRoomClick} loading={isCreatingRoom} disabled={isCreatingRoom}>
				Create a GIF Chat Room<ArrowRight />
			</Button>
			<div>Prefer going solo? Try out the camera!</div>
			<Button onclick={handleCameraClick}>Use the Dither Cam<Aperture /></Button>
		</div>
	</section>

	{#if hasRoomHistory}
		<section class="room-history">
			<div class="rooms">
				<RoomList />
			</div>
		</section>
	{/if}

	<section class="credits">
		<h3>Prior Art:</h3>
		<div>
			This app wouldn't have been possible without inspiration from <a
				href="https://obradinn.com/"
				target="_blank">Return of the Obra Dinn</a
			>
			and <a href="https://meatspac.es/" target="_blank">Meatspac.es</a>
		</div>
	</section>
</div>

<style>
	.index {
		display: flex;
		flex-direction: column;
		gap: 0;

		section {
			display: flex;
			flex-direction: column;
			padding: 1.5em;
			gap: 1em;
			border-bottom: var(--white) 1px dotted;
		}
	}

	.heading {
		text-align: center;
	}

	.demoMessage {
		align-self: center;
		width: min(100%, 400px);
	}

	.createNewRoom {
		align-self: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	}

	.rooms {
		display: flex;
		flex-direction: column;
		align-items: center;
		align-self: center;
		gap: 0.5em;
	}
</style>
