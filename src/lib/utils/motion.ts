import { prefersReducedMotion } from 'svelte/motion';

// Svelte transitions run via the Web Animations API, which the CSS media query can't reach.
// Wrap transition params so they become instant when the user prefers reduced motion.
export function motion<T extends { duration?: number; delay?: number }>(params: T = {} as T): T {
	return prefersReducedMotion.current ? { ...params, duration: 0, delay: 0 } : params;
}
