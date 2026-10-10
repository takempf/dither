import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: {
			globals: globals.browser
		},
		rules: {
			// TypeScript checks undefined names itself, including ambient ones like `App`
			'no-undef': 'off'
		}
	},
	{
		// config files and tests run in Node
		files: ['*.config.{js,ts}', 'tests/**'],
		languageOptions: {
			globals: globals.node
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	}
);
