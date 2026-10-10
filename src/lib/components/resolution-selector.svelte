<script lang="ts">
	import Select from './select.svelte';

	import { cameraResolutionId } from '#lib/store.svelte.js';

	import { CAMERA_RESOLUTIONS, type CameraResolutionId } from '#lib/constants.js';

	interface ResolutionOptionT {
		value: string;
		label: string;
		id: CameraResolutionId;
	}

	const { ...restProps } = $props();

	let resolutions = [];
	let resolutionOptions: ResolutionOptionT[] = [];
	Object.entries(CAMERA_RESOLUTIONS).forEach(([cameraResolutionId, cameraResolution]) => {
		resolutions.push(cameraResolution);
		resolutionOptions.push({
			id: cameraResolutionId as CameraResolutionId,
			value: cameraResolutionId,
			label: cameraResolutionId
		});
	});

	function handleValueChange(value: string) {
		cameraResolutionId.current = value as CameraResolutionId;
	}
</script>

<Select
	name="resolution"
	label="Camera resolution"
	placeholder="Select a Resolution"
	options={resolutionOptions}
	value={cameraResolutionId.current}
	onValueChange={handleValueChange}
	{...restProps}
/>
