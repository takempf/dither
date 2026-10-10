<script lang="ts">
	import { resolve } from '$app/paths';
	import { roomHistory } from '#lib/store.svelte.js';
	import X from '#lib/icons/x.svelte';

	import Button from '../button.svelte';

	interface PropsT {
		id: string;
		name: string;
	}

	const { id, name }: PropsT = $props();

	function deleteRoomFromHistory(roomId: string) {
		const updatedRoomHistory = { ...roomHistory.current };
		delete updatedRoomHistory[roomId];
		roomHistory.current = updatedRoomHistory;
	}

	function handleRemoveClick() {
		if (confirm(`Delete "${name}" from your room history?`)) {
			deleteRoomFromHistory(id);
		}
	}
</script>

<div class="roomListItem">
	<a href={resolve('/(app)/rooms/[roomId]', { roomId: id })}>{name || id}</a>
	<div class="remove">
		<Button
			variant="inverted"
			aria-label={`Remove ${name || id} from history`}
			onclick={handleRemoveClick}><X /></Button
		>
	</div>
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
