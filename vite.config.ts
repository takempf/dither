import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	optimizeDeps: {
		// Vite only finds these on first page load, then re-bundles and reloads mid-session
		// ("504 Outdated Optimize Dep"). Listing them bundles them at startup instead.
		include: [
			'bits-ui',
			'firebase/app',
			'firebase/app-check',
			'firebase/firestore',
			'firebase/storage',
			'human-id',
			'modern-gif',
			'upng-js'
		]
	},
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapterStatic({
				pages: 'public',
				assets: 'public',
				fallback: 'index.html',
				// Firebase Hosting compresses on its own and ignores .br/.gz files
				precompress: false
			})
		})
	]
});
