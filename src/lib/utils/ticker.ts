import { readable } from 'svelte/store';

const FRAME_DURATION = 100; // 10 fps, the rate clips are recorded at

// one animation loop shared by every filmstrip. Only notifies when the frame number changes.
export const frameTick = readable(0, (set) => {
	let rafId = requestAnimationFrame(function tick(now) {
		set(Math.floor(now / FRAME_DURATION));
		rafId = requestAnimationFrame(tick);
	});

	return () => cancelAnimationFrame(rafId);
});
