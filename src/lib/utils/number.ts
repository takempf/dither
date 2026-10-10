export function clamp(min: number, input: number, max: number): number {
	return Math.max(min, Math.min(max, input));
}
