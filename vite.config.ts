import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
