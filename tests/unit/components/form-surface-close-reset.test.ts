import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { openSurface } from '../helpers/surface-source.svelte.ts';

vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn() }));

describe('a form surface drops what was typed when it CLOSES, before anyone reopens it', () => {
	it('typed values (a password) are gone the moment the surface is closed', () => {
		const { state, surface, dispose } = openSurface();
		flushSync();
		surface.form.values.name = 'Someone else';
		surface.form.values.password = 'Typed-secret-1!';
		flushSync();
		expect(surface.dirty).toBe(true);

		state.open = false;
		flushSync();
		// asserted while still closed: nothing waits for the next open to clear it
		expect(surface.form.values.password).toBe('');
		expect(surface.form.values.name).toBe('Asha');
		expect(surface.dirty).toBe(false);
		dispose();
	});

	it('a second open starts from the seed too', () => {
		const { state, surface, dispose } = openSurface();
		flushSync();
		surface.form.values.password = 'Typed-secret-1!';
		state.open = false;
		flushSync();
		state.open = true;
		flushSync();
		expect(surface.form.values.password).toBe('');
		dispose();
	});
});
