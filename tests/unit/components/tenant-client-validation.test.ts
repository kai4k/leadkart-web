/**
 * The statutory and contact forms tidy what was typed and refuse a value Go would refuse, BEFORE anything is posted:
 * on blur (the tidied text is written into the input, an error shows under it) and on submit (nothing is sent, focus
 * goes to the first invalid field). Never per keystroke. The server's own answer still renders (last test).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

const h = vi.hoisted(() => ({
	submit: undefined as
		| ((i: { formElement: HTMLFormElement; cancel: () => void }) => unknown)
		| undefined
}));
vi.mock('$app/forms', () => ({
	enhance: (_f: HTMLFormElement, submit?: typeof h.submit) => {
		h.submit = submit;
		return { destroy() {} };
	},
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/navigation', () => ({
	goto: async () => {},
	invalidate: async () => {},
	beforeNavigate: () => {}
}));
vi.mock('$app/state', () => ({ page: { data: { scopeContext: 'fp' }, form: null } }));
vi.mock('$features/auth', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	session: { can: () => true }
}));

import TenantContactForm from '#lib/features/tenant/components/TenantContactForm.svelte';
import TenantStatutoryForm from '#lib/features/tenant/components/TenantStatutoryForm.svelte';
import type { Tenant } from '#lib/features/tenant/types.ts';

const tenant = {
	id: '00000000-0000-4000-8000-000000000001',
	slug: 'acme',
	legal_name: 'Acme',
	display_name: 'Acme',
	status: 'active',
	created_at: '2026-01-01T00:00:00Z',
	gst_number: '',
	pan_number: '',
	drug_licence_number: '',
	admin_phone: '',
	admin_address: { street: '', city: '', district: '', state: '', state_code: '', pincode: '' }
} as unknown as Tenant;

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	h.submit = undefined;
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

async function render(Form: typeof TenantContactForm, form?: Record<string, unknown>) {
	component = mount(Form, { target, props: { tenant, form } as never });
	flushSync();
	await tick();
}
const input = (name: string) => target.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
function type(name: string, text: string) {
	const el = input(name);
	el.value = text;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}
async function leave(name: string) {
	input(name).focus();
	input(name).blur();
	input(name).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
	flushSync();
	await tick();
}
const errorsText = () =>
	[...target.querySelectorAll('[data-slot="field-error"]')].map((e) => e.textContent?.trim());
const invalidNames = () =>
	[...target.querySelectorAll('[aria-invalid="true"]')].map((e) => e.getAttribute('name'));

describe('statutory form', () => {
	it('blur writes the tidied value into the input and shows nothing for a valid one', async () => {
		await render(TenantStatutoryForm);
		type('gst_number', ' 29abcpe1234f1z5 ');
		await leave('gst_number');
		expect(input('gst_number').value).toBe('29ABCPE1234F1Z5');
		expect(invalidNames()).toEqual([]);
	});

	it('blur shows the same sentence the server code reads as', async () => {
		await render(TenantStatutoryForm);
		type('pan_number', 'abcxe1234f');
		await leave('pan_number');
		expect(input('pan_number').value).toBe('ABCXE1234F');
		expect(invalidNames()).toEqual(['pan_number']);
		expect(errorsText()).toEqual(['Enter a valid PAN, for example AAAAA9999A.']);
	});

	it('no check per keystroke: an invalid value typed and not left shows nothing', async () => {
		await render(TenantStatutoryForm);
		type('gst_number', '29ABC');
		expect(invalidNames()).toEqual([]);
	});

	it('typing clears the stale message of that field', async () => {
		await render(TenantStatutoryForm);
		type('gst_number', 'bad');
		await leave('gst_number');
		expect(invalidNames()).toEqual(['gst_number']);
		type('gst_number', 'bad2');
		expect(invalidNames()).toEqual([]);
	});

	it('a GSTIN whose PAN differs from the PAN field marks the PAN field', async () => {
		await render(TenantStatutoryForm);
		type('gst_number', '29ABCPE1234F1Z5');
		type('pan_number', 'ZZZPZ9999G');
		await leave('gst_number');
		await leave('pan_number');
		expect(invalidNames()).toEqual(['pan_number']);
		expect(errorsText()[0]).toContain('does not match the PAN inside the GSTIN');
	});

	it('submit with an invalid value is cancelled: nothing is sent, the first invalid field takes focus', async () => {
		await render(TenantStatutoryForm);
		type('gst_number', '29abcpe1234f1z');
		type('drug_licence_number', 'x');
		const cancel = vi.fn();
		h.submit!({ formElement: target.querySelector('form')!, cancel });
		flushSync();
		await tick();
		await tick();
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(invalidNames()).toEqual(['gst_number', 'drug_licence_number']);
		expect(document.activeElement).toBe(input('gst_number'));
	});

	it('submit with a tidy-able value sends it tidied', async () => {
		await render(TenantStatutoryForm);
		type('gst_number', ' 29abcpe1234f1z5 ');
		type('pan_number', 'abcpe1234f');
		const cancel = vi.fn();
		h.submit!({ formElement: target.querySelector('form')!, cancel });
		expect(cancel).not.toHaveBeenCalled();
		expect(input('gst_number').value).toBe('29ABCPE1234F1Z5');
		expect(input('pan_number').value).toBe('ABCPE1234F');
	});

	it('blank everywhere is accepted (not declared)', async () => {
		await render(TenantStatutoryForm);
		const cancel = vi.fn();
		h.submit!({ formElement: target.querySelector('form')!, cancel });
		expect(cancel).not.toHaveBeenCalled();
	});
});

describe('contact form', () => {
	it.each([
		['9876543210', '+919876543210'],
		['098765 43210', '+919876543210'],
		['+91 98765-43210', '+919876543210']
	])('phone %j is tidied to %j on blur', async (typed, sent) => {
		await render(TenantContactForm);
		type('phone', typed);
		await leave('phone');
		expect(input('phone').value).toBe(sent);
		expect(invalidNames()).toEqual([]);
	});

	it('a phone that cannot be tidied stays as typed and shows the format', async () => {
		await render(TenantContactForm);
		type('phone', '12345');
		await leave('phone');
		expect(input('phone').value).toBe('12345');
		expect(errorsText()).toEqual([
			'Enter the number with + and country code, for example +919876543210.'
		]);
	});

	it('submit: a half-filled address names every part that is wrong, nothing is sent', async () => {
		await render(TenantContactForm);
		type('address.street', '1 MG Road');
		type('address.pincode', '012345');
		const cancel = vi.fn();
		h.submit!({ formElement: target.querySelector('form')!, cancel });
		flushSync();
		await tick();
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(invalidNames()).toEqual(['address.city', 'address.state', 'address.pincode']);
		expect(errorsText()).toEqual([
			'This field is required.',
			'This field is required.',
			'Enter a 6-digit PIN code that does not start with 0.'
		]);
	});

	it('a wholly blank address is not an error (Go treats it as not declared)', async () => {
		await render(TenantContactForm);
		const cancel = vi.fn();
		h.submit!({ formElement: target.querySelector('form')!, cancel });
		expect(cancel).not.toHaveBeenCalled();
	});

	it('a pincode written with a space is tidied', async () => {
		await render(TenantContactForm);
		type('address.pincode', '560 001');
		await leave('address.pincode');
		expect(input('address.pincode').value).toBe('560001');
	});
});

describe('the server stays the authority', () => {
	it('a request that got past this side and was refused renders the server code', async () => {
		await render(TenantStatutoryForm, {
			values: { gst_number: '27AAAPL1234C1Z1' },
			fieldMessages: { gst_number: 'invalid_gstin' }
		});
		expect(invalidNames()).toEqual(['gst_number']);
		expect(errorsText()).toEqual(['Enter a valid 15-character GSTIN.']);
	});
});
