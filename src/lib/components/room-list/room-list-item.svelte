<script lang="ts">
	import { roomHistory } from '#lib/store.svelte.js';
	import X from '#lib/icons/x.svelte';

	import Button from '../button.svelte';

	interface PropsT {
		id: string;
		name: string;
	}

	const { id, name }: PropsT = $props();

	function deleteRoomFromHistory(roomId: string) {
		const updatedRoomHistory = {
			...$roomHistory
		};
		delete updatedRoomHistory[roomId];
		roomHistory.set(updatedRoomHistory);
	}

	function handleRemoveClick() {
		if (confirm(`Delete "${name}" from your room history?`)) {
			deleteRoomFromHistory(id);
		}
	}
</script>

<div class="roomListItem">
	<a href="/rooms/{id}">{name || id}</a>
	<div class="remove"><Button variant="inverted" onclick={handleRemoveClick}><X /></Button></div>
</div>

<style>
	.roomListItem {
		display: flex;
		flex-direction: row;
		gap: 1em;
		justify-content: space-between;
	}

	.remove {
		font-size: 0.5em;
	}
</style>
