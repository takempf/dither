# Dither - A lo-fi GIF chat app

![dither-gif_m19r7m8cdbblit](https://github.com/user-attachments/assets/55c15261-baf7-41d4-a40e-92418d795b3a)

https://dither.kempf.dev/

Taking inspiration from [Return of the Obra Dinn](https://obradinn.com/) and [Meatspac.es](https://chat.meatspac.es/), I got to work making my own mix of a micro-vlog and chat app. I used several new (to me) technologies to make it happen:

- [Svelte 5](https://svelte.dev/) and [SvelteKit](https://svelte.dev/docs/kit), as a static single-page app
- TypeScript
- Firebase [Firestore](https://firebase.google.com/docs/firestore/), [Storage](https://firebase.google.com/docs/storage) and [Hosting](https://firebase.google.com/docs/hosting)
- Lots of `<canvas>` antics I'm not _super_ familiar with, now partly in a Web Worker

## Development

You need Node 24 (see `.nvmrc`) and Java 21 or newer for the Firebase emulators.

```sh
npm install
npm run emulators   # Firestore and Storage emulators
npm run dev         # in another terminal; dev always talks to the emulators
```

| Script             | What it does                                                 |
| ------------------ | ------------------------------------------------------------ |
| `npm run lint`     | Prettier and ESLint                                          |
| `npm run check`    | svelte-check                                                 |
| `npm test`         | Starts the emulators and runs Playwright e2e and rules tests |
| `npm run test:e2e` | Same tests, reusing emulators that are already running       |
| `npm run build`    | Static build into `public/`                                  |
| `npm run deploy`   | Build and `firebase deploy`                                  |

CI deploys to Firebase automatically on every push to `master` that passes.

## Configuration

Copy `.env.example` to `.env` for production builds:

- `PUBLIC_FIREBASE_API_KEY`: the web app's Firebase API key.
- `PUBLIC_RECAPTCHA_SITE_KEY`: reCAPTCHA Enterprise key for [App Check](https://firebase.google.com/docs/app-check). App Check stays off when it's empty.
