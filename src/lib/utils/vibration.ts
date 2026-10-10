export function hapticBuzz() {
	if ('vibrate' in navigator) {
		try {
			// A short, sharp vibration pattern, 50ms
			navigator.vibrate([50]);
		} catch (error) {
			console.error('Error triggering vibration:', error);
		}
	}
}
