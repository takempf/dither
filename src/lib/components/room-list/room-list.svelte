<script lang="ts">
	import RoomListItem from './room-list-item.svelte';

	import { roomHistory } from '#lib/store.svelte.js';

	interface RoomHistoryEntryT {
		lastSeen: number;
		name: string;
	}
	type RoomHistoryEntriesT = [string, RoomHistoryEntryT];

	const rooms = $derived.by(() =>
		Object.entries($roomHistory).map(([id, entry]: RoomHistoryEntriesT) => {
			const { lastSeen, name } = entry;
			return { id, lastSeen, name };
		})
	);
</script>

<div class="roomList">
	<h2 class="heading">Rooms You've Visited</h2>
	<ul class="list-items">
		{#each rooms as { id, name } (id)}
			<li>
				<RoomListItem {id} {name} />
			</li>
		{/each}
	</ul>
</div>

<style>
	.roomList {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}
</style>
