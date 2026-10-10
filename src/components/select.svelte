<script lang="ts">
	import { Select } from 'bits-ui';
	import { onMount } from 'svelte';

	import Button from './button.svelte';
	import CaretLeftIcon from '$/icons/caret-left.svelte';
	import SelectArrowsIcon from '$/icons/select-arrows.svelte';

	interface SelectOptionT {
		value: string;
		label: string;
		style?: string;
	}

	interface PropsT {
		name: string;
		placeholder: string;
		options: SelectOptionT[];
		prefix?: string;
		value: string;
		onValueChange: (value: string) => void;
		disabled?: boolean;
	}

	let { name, options, prefix, value, onValueChange, placeholder, disabled }: PropsT = $props();

	let fontSize: string = $state('1em');
	let selectArrowsElement: HTMLElement; // Reference to the element you want to check

	onMount(() => {
		fontSize = window.getComputedStyle(selectArrowsElement).fontSize;
	});
</script>

<Select.Root type="single" items={options} {name} {value} {onValueChange} {disabled}>
	<Select.Trigger aria-label={placeholder}>
		{#snippet child({ props })}
			<Button {...props}>
				<span class="trigger">
					{#if prefix}{prefix}{/if}
					<strong><Select.Value {placeholder} /></strong>
					<span class="select-arrows" bind:this={selectArrowsElement}><SelectArrowsIcon /></span>
				</span>
			</Button>
		{/snippet}
	</Select.Trigger>
	<Select.Portal to="#content">
		<Select.Content strategy="fixed">
			{#snippet child({ wrapperProps, props, open })}
				{#if open}
					<div {...wrapperProps}>
						<div class="content" {...props}>
							{#each options as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{#snippet child({ props, selected })}
										<div
											class="item"
											style={`font-size: ${fontSize}; ${option.style ?? ''}`}
											{...props}
										>
											{option.label}
											{#if selected}
												<span class="item-indicator">
													<CaretLeftIcon />
												</span>
											{/if}
										</div>
									{/snippet}
								</Select.Item>
							{/each}
						</div>
					</div>
				{/if}
			{/snippet}
		</Select.Content>
	</Select.Portal>
</Select.Root>

<style>
	.trigger {
		display: flex;
		gap: 0.5em;
		margin-right: -0.25em;
	}

	.select-arrows {
		display: inline-block;
		width: 1em;
		height: 1em;
	}

	.content {
		z-index: 9999;
		position: relative;
		background: var(--white);
		color: var(--black);
		border-radius: 0.5em;
		border: var(--black) 1px dotted;
		padding: 2px;
	}

	.item {
		display: flex;
		gap: 1em;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 0.25em 1em;
		border-radius: 0.5em;
	}

	.item-indicator {
		width: 1em;
		height: 1em;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.item[data-highlighted] {
		cursor: var(--cursor-pointer);
		background: var(--black);
		color: var(--white);
	}
</style>
