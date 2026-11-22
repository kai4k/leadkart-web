import { z } from 'zod';
import { createFormSurface } from '#lib/components/form/form-surface.svelte.ts';

/** A form surface (no DOM) over a reactive `open` flag, run in its own effect root. */
export function openSurface(initialOpen = true) {
	const schema = z.object({ name: z.string(), password: z.string() });
	const state = $state({ open: initialOpen });
	let surface!: ReturnType<typeof createFormSurface<typeof schema>>;
	const dispose = $effect.root(() => {
		surface = createFormSurface(() => ({
			open: state.open,
			onOpenChange: (o: boolean) => (state.open = o),
			schema,
			initial: () => ({ name: 'Asha', password: '' }),
			onSubmit: async () => {}
		}));
	});
	return { state, surface, dispose };
}
