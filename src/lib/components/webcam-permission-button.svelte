<script>
	import { webcamEnabled, mediaStream } from '#lib/store.svelte.js';
	import { scale } from 'svelte/transition';

	import Button from './button.svelte';

	function handleEnableWebcamClick() {
		$webcamEnabled = true;
	}
</script>

{#if $mediaStream.status !== 'active'}
	<div in:scale out:scale>
		<Button onclick={handleEnableWebcamClick} disabled={$mediaStream.status === 'requesting'}>
			{#if $mediaStream.status === 'initial'}
				<em>Click</em> to enable your webcam and chat<em>!</em>
			{/if}
			{#if $mediaStream.status === 'requesting'}
				<em>Requesting webcam feed...</em>
			{/if}
			{#if $mediaStream.status === 'error'}
				Webcam error. <em>Try again?</em>
			{/if}
		</Button>
	</div>
{/if}
