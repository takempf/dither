<script lang="ts">
	import { type Snippet } from 'svelte';
	import { type HTMLButtonAttributes } from 'svelte/elements';

	import { scale } from 'svelte/transition';

	import Loading from '#lib/icons/loading.svelte';

	interface Props extends HTMLButtonAttributes {
		children: Snippet;
		variant?: 'normal' | 'inverted';
		tall?: boolean;
		loading?: boolean;
	}

	const {
		children,
		variant = 'normal',
		tall = false,
		loading = false,
		...restProps
	}: Props = $props();
</script>

<button {...restProps} class:invert={variant === 'inverted'} class:tall>
	<div class="inner">{@render children()}</div>
	{#if loading}
		<div class="loading" in:scale={{ delay: 250 }} out:scale>
			<div class="loadingRotation">
				<div class="loadingIcon"><Loading /></div>
			</div>
		</div>
	{/if}
</button>

<style>
	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	button {
		--background-color: var(--white);
		--foreground-color: var(--black);
		--border-radius: 0.5em;
		--outer-border-width: 3px;
		--transition-duration: 150ms;

		position: relative;
		background: var(--background-color);
		color: var(--foreground-color);
		padding: var(--outer-border-width);
		border-radius: var(--border-radius);
		border: var(--foreground-color) 1px dotted;
	}

	.inner {
		display: flex;
		flex-direction: row;
		gap: 0.5em;
		align-items: center;
		justify-content: center;
		border: var(--foreground-color) 1px solid;
		padding: 0.25em 0.75em;
		border-radius: calc(var(--border-radius) - var(--outer-border-width));
		transition:
			transform var(--transition-duration),
			box-shadow var(--transition-duration);
	}

	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--white);
		background: var(--black);
		outline: var(--white) 1px dotted;
		border-radius: 50%;
		aspect-ratio: 1 / 1;
		line-height: 1;
		font-size: 1.5em;
	}

	.loadingRotation {
		animation: rotate 3s infinite linear;
	}

	.loadingIcon {
		animation: rotate 1.5s infinite;
		animation-timing-function: var(--ease-out-expo);
	}

	button:hover:not(:disabled) {
		.inner {
			transform: translateY(-3px);
			box-shadow: var(--foreground-color) 0px 3px 0px;
		}
	}

	button:active:not(:disabled) {
		.inner {
			--transition-duration: 25ms;
			transform: translateY(1px);
			box-shadow: var(--foreground-color) 0px -1px 0px;
		}
	}

	button:disabled {
		pointer-events: none;

		.inner {
			background-color: var(--foreground-color);
			background-image:
				linear-gradient(90deg, var(--background-color) 0% 75%, transparent 76% 100%),
				linear-gradient(var(--white) 0% 75%, transparent 76% 100%);
			background-size: 4px 4px;
		}
	}

	.invert {
		--background-color: var(--black);
		--foreground-color: var(--white);
	}

	.tall {
		.inner {
			padding: 0.75em 0.5em;
		}
	}
</style>
