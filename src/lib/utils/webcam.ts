export function getCrop(videoElementToCrop: HTMLVideoElement, aspectRatio: number) {
	const { videoWidth, videoHeight } = videoElementToCrop;
	const webcamVideoAspect = videoWidth / videoHeight;
	let width, height;

	if (webcamVideoAspect > aspectRatio) {
		height = videoHeight;
		width = height * aspectRatio;
	} else {
		width = videoWidth;
		height = width / aspectRatio;
	}

	const x = videoWidth / 2 - width / 2;
	const y = videoHeight / 2 - height / 2;

	return { x, y, width, height };
}
