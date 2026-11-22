import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import { ValidationError } from '$api/errors';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc
	)
);
vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('$ui', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: toastMock
}));
const gw = vi.hoisted(() => ({ registerTenant: vi.fn() }));
vi.mock('#lib/features/operator/tenants/api.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));

import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { createQueryClient } from '#lib/api/query-client.ts';
import CreateTenantDrawer from '#lib/features/operator/tenants/components/CreateTenantDrawer.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: ComponentProps<typeof CreateTenantDrawer>;
const onOpenChange = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ open: true, onOpenChange });
	component = mount(CreateTenantDrawer, { target, props });
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const fill = (name: string, value: string) => {
	const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const VALUES = {
	slug: 'acme-pharma',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme Pharma',
	admin_first_name: 'Asha',
	admin_last_name: 'Rao',
	admin_email: 'asha@acme.test',
	admin_password: 'Str0ng-Passw0rd!'
};
const fillAll = () => {
	for (const [k, v] of Object.entries(VALUES)) fill(k, v);
};
const submit = () => {
	document.querySelector<HTMLFormElement>('#register-tenant-form')!.requestSubmit();
	flushSync();
};

describe('CreateTenantDrawer is a FormSheet', () => {
	it('the submit button is in the sheet footer and points at the form', () => {
		const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		expect(btn.getAttribute('form')).toBe('register-tenant-form');
		expect(document.querySelector('[data-slot="sheet-footer"]')!.contains(btn)).toBe(true);
		expect(document.querySelector('[data-slot="sheet-content"]')!.className).toContain(
			'material-pane'
		);
	});

	it('a submit calls the mutation with the parsed values, then shows the one-time credentials in the sheet', async () => {
		gw.registerTenant.mockResolvedValue({ tenant_id: 't-1' });
		fillAll();
		submit();
		await vi.waitFor(() => expect(document.body.textContent).toContain('one-time view'));
		expect(gw.registerTenant).toHaveBeenCalledTimes(1);
		expect(gw.registerTenant.mock.calls[0]![0]).toMatchObject(VALUES);
		expect(onOpenChange).not.toHaveBeenCalled(); // the sheet stays open to show the credentials
		expect(document.body.textContent).toContain(VALUES.admin_password);
		// each credential has its own copy button (the shared CopyButton)
		for (const label of ['Copy tenant ID', 'Copy email', 'Copy password'])
			expect(document.querySelector(`button[aria-label="${label}"]`), label).not.toBeNull();
		// the form is not holding the password any more, and there is no footer submit
		expect(document.querySelector('#register-tenant-form')).toBeNull();
		expect(document.querySelector('[data-slot="sheet-footer"]')).toBeNull();
	});

	it('Done closes the sheet; reopening shows an empty form, never the previous credentials', async () => {
		gw.registerTenant.mockResolvedValue({ tenant_id: 't-1' });
		fillAll();
		submit();
		await vi.waitFor(() => expect(document.body.textContent).toContain('one-time view'));
		[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Done')!.click();
		flushSync();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		props.open = false;
		flushSync();
		props.open = true;
		flushSync();
		await vi.waitFor(() => expect(document.querySelector('#register-tenant-form')).not.toBeNull());
		expect(document.body.textContent).not.toContain(VALUES.admin_password);
		expect(document.querySelector<HTMLInputElement>('input[name="slug"]')!.value).toBe('');
	});

	it('a 422 on a name field renders as that field`s message and focuses it', async () => {
		gw.registerTenant.mockRejectedValue(
			new ValidationError({ display_name: 'invalid_characters' }, 422)
		);
		fillAll();
		submit();
		const field = () => document.querySelector<HTMLInputElement>('input[name="display_name"]')!;
		await vi.waitFor(() => expect(field().getAttribute('aria-invalid')).toBe('true'));
		expect(document.body.textContent).toContain('Remove the characters that are not allowed.');
		await vi.waitFor(() => expect(document.activeElement).toBe(field()));
	});
});
