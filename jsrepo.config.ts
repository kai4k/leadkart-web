import { defineConfig } from 'jsrepo';

export default defineConfig({
	registries: ['https://sveltebits.xyz/r'],
	paths: {
		component: 'src/lib/components/svelte-bits',
		'*': 'src/lib/components/svelte-bits'
	}
});
