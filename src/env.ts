import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	// static SPA, so inline at build time. Empty when unset, e.g. local builds against the emulators.
	PUBLIC_FIREBASE_API_KEY: { public: true, static: true, schema: (input) => input ?? '' },
	// reCAPTCHA Enterprise key for App Check. App Check is off when unset.
	PUBLIC_RECAPTCHA_SITE_KEY: { public: true, static: true, schema: (input) => input ?? '' },
	// point a prod build at the local emulators, for e2e tests. Dev always uses them.
	PUBLIC_USE_FIREBASE_EMULATORS: { public: true, static: true, schema: (input) => input === 'true' }
});
