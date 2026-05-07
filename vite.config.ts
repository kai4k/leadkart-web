import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5173,
		strictPort: true,
		proxy: {
			// Dev-only proxy: /api/v1/* → leadkart-go on :8080. Avoids CORS
			// in development while production goes through whatever
			// reverse-proxy / API-gateway terminates the public domain.
			'/api': {
				target: 'http://localhost:8080',
				changeOrigin: true
			}
		}
	}
});
