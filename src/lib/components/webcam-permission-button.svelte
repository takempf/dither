<script lang="ts">
	import { webcam, webcamEnabled } from '#lib/store.svelte.js';
	import { scale } from 'svelte/transition';

	import Button from './button.svelte';

	function handleEnableWebcamClick() {
		webcamEnabled.current = true;
	}
</script>

{#if webcam.status !== 'active'}
	<div in:scale out:scale>
		<Button onclick={handleEnableWebcamClick} disabled={webcam.status === 'requesting'}>
			{#if webcam.status === 'initial'}
				<em>Click</em> to enable your webcam and chat<em>!</em>
			{/if}
			{#if webcam.status === 'requesting'}
				<em>Requesting webcam feed...</em>
			{/if}
			{#if webcam.status === 'error'}
				Webcam error. <em>Try again?</em>
			{/if}
		</Button>
	</div>
{/if}
