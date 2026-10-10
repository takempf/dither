import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	// static SPA, so inline at build time. Empty when unset, e.g. local builds against the emulators.
	PUBLIC_FIREBASE_API_KEY: { public: true, static: true, schema: (input) => input ?? '' }
});
