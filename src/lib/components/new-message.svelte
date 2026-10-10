<script lang="ts" module>
	export interface NewMessageT {
		text: string;
		imageDataBlob: Blob;
	}
</script>

<script lang="ts">
	import { slide } from 'svelte/transition';

	import { webcam } from '#lib/store.svelte.js';
	import { generateFilmstripWithCallback } from '#lib/utils/frames.js';
	import { hapticBuzz } from '#lib/utils/vibration.js';
	import { MESSAGE_TEXT_MAX_LENGTH } from '#lib/constants.js';

	import StylizedWebcamFeed from '#lib/components/stylized-webcam-feed.svelte';
	import Button from './button.svelte';
	import WebcamPermissionButton from './webcam-permission-button.svelte';
	import SendArrowIcon from '#lib/icons/send-arrow.svelte';
	import Progress from './progress.svelte';

	const TOTAL_FRAMES = 20;

	interface Props {
		onCreateMessage: (message: NewMessageT) => Promise<void>;
	}

	let { onCreateMessage }: Props = $props();

	let videoElement: HTMLVideoElement | undefined = $state();
	let inputMessage: string = $state('');
	let isCapturing: boolean = $state(false);
	let isSending: boolean = $state(false);
	let sendError: string | null = $state(null);
	let currentFrameNumber = $state(0);
	let progress = $derived((currentFrameNumber / TOTAL_FRAMES) * 100);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (isCapturing || isSending) {
			return;
		}

		if (!videoElement) {
			console.error('No camera to record from for message.');
			return;
		}

		sendError = null;

		let imageDataBlob: Blob;
		try {
			isCapturing = true;
			function handleFrame(frameNumber: number) {
				currentFrameNumber = frameNumber;
			}

			hapticBuzz();
			const filmstripData = await generateFilmstripWithCallback(videoElement, handleFrame, {
				width: 200,
				height: 150
			});
			hapticBuzz();
			// loaded on first send, to keep the encoder out of the room page bundle
			const { default: uPNG } = await import('upng-js');
			const optimizedImageArrayBuffer = uPNG.encode(
				[filmstripData.data.buffer],
				filmstripData.width,
				filmstripData.height,
				2 + 1
			);
			imageDataBlob = new Blob([optimizedImageArrayBuffer], { type: 'image/png' });
		} catch (error) {
			console.error('error generating filmstrip', error);
			sendError = "Couldn't record a clip. Try again.";
			return;
		} finally {
			isCapturing = false;
			currentFrameNumber = 0;
		}

		try {
			isSending = true;
			await onCreateMessage({ text: inputMessage, imageDataBlob });
			inputMessage = '';
		} catch (error) {
			console.error('Error sending message', error);
			// keep the text so the user can retry
			sendError = "Couldn't send your message. Try again.";
		} finally {
			isSending = false;
		}
	}

	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			handleSubmit(event);
		}
	}
</script>

<div class="newMessage">
	<form class="form" onsubmit={handleSubmit}>
		<div class="recordingBooth">
			<div class="webcamFeed">
				<StylizedWebcamFeed bind:videoElement />
			</div>
			{#if isCapturing}
				<div
					class="progress"
					in:slide={{ duration: 250 }}
					out:slide={{ duration: 500, delay: 500 }}
				>
					<Progress {progress} />
				</div>
			{/if}
		</div>
		<div class="fakeInput">
			<textarea
				class="input"
				bind:value={inputMessage}
				maxlength={MESSAGE_TEXT_MAX_LENGTH}
				onkeydown={handleInputKeydown}
				placeholder="Press enter to record a clip and send a message"
				disabled={webcam.status !== 'active'}></textarea>
			<span class="fakeInput__action">
				<Button
					type="submit"
					disabled={webcam.status !== 'active' || isCapturing || isSending}
					loading={isSending}
					tall={true}
				>
					<SendArrowIcon />
				</Button>
			</span>
		</div>
	</form>
	{#if sendError}
		<p class="sendError" role="alert">{sendError}</p>
	{/if}
	<div class="enableWebcamMessage__container">
		<WebcamPermissionButton />
	</div>
</div>

<style>
	.newMessage {
		position: relative;
		max-width: 540px;
		margin: 0 auto;
		border-radius: 0.25em;
		padding: 1px;
		background: var(--white);
		overflow: hidden;
	}

	.form {
		display: flex;
		align-items: stretch;
		justify-content: center;
		gap: 1px;
		margin: 0;
	}

	.fakeInput {
		display: flex;
		flex-grow: 1;
		position: relative;
		background: none;
		color: var(--black);
		overflow: hidden;
		transition: transform 200ms;
		border: transparent 2px solid;
		border-radius: 0.25em;
	}

	.fakeInput:focus-within {
		border-color: var(--black);
	}

	.input {
		display: block;
		border: none;
		margin: 0;
		padding: 0.5em 2.5em 0.5em 0.5em;
		font-size: inherit;
		font-style: italic;
		width: 100%;
		resize: none;
	}

	.input:focus {
		outline: none;
	}

	.fakeInput__action {
		position: absolute;
		top: 50%;
		right: 0.5em;
		transform: translateY(-50%);
		font-size: 0.5em;
	}

	.recordingBooth {
		position: relative;
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'main';
		flex-shrink: 0;
		width: 150px;
		height: 113px;
		overflow: hidden;
		border-radius: calc(0.25em - 1px);
	}

	.webcamFeed {
		grid-area: main;
	}

	.progress {
		grid-area: main;
		align-self: end;
		z-index: 3;
	}

	.sendError {
		margin: 0;
		padding: 0.25em 0.5em;
		color: var(--black);
		font-size: 0.8em;
		font-style: italic;
		text-align: center;
	}

	.enableWebcamMessage__container {
		width: max-content;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	@media (max-width: 480px) {
		.recordingBooth {
			width: 100px;
			height: 75px;
		}
	}
</style>
