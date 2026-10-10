<script lang="ts">
	import { cameraPermission, webcam, webcamEnabled } from '#lib/store.svelte.js';
	import { scale } from 'svelte/transition';
	import { motion } from '#lib/utils/motion.js';

	import Button from './button.svelte';

	// wait before showing, so a feed that loads quickly doesn't flash the button
	const SHOW_DELAY = 250; // ms

	// hidden while a request is pending with permission already granted, since the feed is coming
	const shouldShow = $derived(
		webcam.status !== 'active' &&
			!(webcam.status === 'requesting' && cameraPermission.state === 'granted')
	);
	let isVisible = $state(false);

	$effect(() => {
		if (!shouldShow) {
			isVisible = false;
			return;
		}

		const timeout = setTimeout(() => (isVisible = true), SHOW_DELAY);
		return () => clearTimeout(timeout);
	});

	function handleEnableWebcamClick() {
		webcamEnabled.current = true;
	}
</script>

{#if isVisible}
	<div in:scale={motion()} out:scale={motion()}>
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
