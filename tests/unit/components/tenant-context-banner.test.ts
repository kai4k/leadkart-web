/**
 * The context banner: an operator acting inside a company sees its name and ONE Exit control, from
 * the committed page data (`page.data.tenantContext`), on every page. Exit is the existing flow
 * (`exitTenantContext`); the banner only displays and calls it.
 */
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc,
		{},
		{ swallowRejections: true }
	)
);
const pageState = vi.hoisted(() => ({
	data: { tenantContext: null } as { tenantContext: unknown }
}));
vi.mock('$app/state', () => ({
	page: {
		get data() {
			return pageState.data;
		},
		url: new URL('http://localhost/operator/scope/profile')
	}
}));
const service = vi.hoisted(() => ({ exitTenantContext: vi.fn() }));
vi.mock('#lib/features/operator/scope/service.ts', () => service);
vi.mock('#lib/features/operator/scope/service', () => service);

import TenantContextBanner from '$layouts/TenantContextBanner.svelte';
import ContextBanner from '$layouts/ContextBanner.svelte';
import { createQueryClient } from '#lib/api/query-client.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';
import { Building2 } from '#lib/icons/index.ts';
import en from '../../../src/lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	pageState.data = { tenantContext: { displayName: 'Acme', isPlatform: false } };
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const render = () => {
	component = mount(TenantContextBanner, { target });
	flushSync();
};
const region = () =>
	document.querySelector<HTMLElement>(
		`[role="region"][aria-label="${en.shell.tenantContext.region}"]`
	);
const exitButton = () =>
	[...document.querySelectorAll('button')].find((b) =>
		b.textContent?.includes(en.shell.tenantContext.exit)
	) as HTMLButtonElement | undefined;

describe('TenantContextBanner', () => {
	it('is a named region that says which company the operator acts in', () => {
		render();
		expect(region()).not.toBeNull();
		expect(region()!.textContent).toContain('Acme');
		expect(region()!.textContent).toContain('You are acting in');
	});

	it('marks the platform company', () => {
		pageState.data = { tenantContext: { displayName: 'LeadKart Platform', isPlatform: true } };
		render();
		expect(region()!.textContent).toContain('LeadKart Platform');
		expect(region()!.textContent).toContain('Platform');
	});

	it('renders nothing without a tenant context', () => {
		pageState.data = { tenantContext: null };
		render();
		expect(region()).toBeNull();
		expect(document.body.textContent).toBe('');
	});

	it('Exit calls the one exit flow once and shows aria-busy while it is pending', async () => {
		let release!: () => void;
		service.exitTenantContext.mockReturnValueOnce(new Promise<void>((r) => (release = r)));
		render();
		const btn = exitButton()!;
		expect(btn).toBeDefined();
		expect(btn.tagName).toBe('BUTTON');
		btn.click();
		flushSync();
		await tick();
		expect(service.exitTenantContext).toHaveBeenCalledTimes(1);
		expect(service.exitTenantContext).toHaveBeenCalledWith(h.qc);
		expect(exitButton()!.getAttribute('aria-busy')).toBe('true');
		release();
		await vi.waitFor(() => expect(exitButton()!.getAttribute('aria-busy')).not.toBe('true'));
	});

	it('follows the committed page data when it changes (a new context replaces the name)', () => {
		render();
		expect(region()!.textContent).toContain('Acme');
	});
});

describe('Exit on a stale page', () => {
	afterEach(() => resetBlock.clear());

	it('while a reset is pending the text stays but Exit is aria-disabled and does nothing', async () => {
		resetBlock.show('stalled');
		render();
		expect(region()!.textContent).toContain('Acme');
		const btn = exitButton()!;
		expect(btn.getAttribute('aria-disabled')).toBe('true');
		btn.click();
		flushSync();
		await tick();
		expect(service.exitTenantContext).not.toHaveBeenCalled();
	});

	it('Exit works again once the block is cleared', async () => {
		resetBlock.show('offline');
		render();
		expect(exitButton()!.getAttribute('aria-disabled')).toBe('true');
		resetBlock.clear();
		flushSync();
		expect(exitButton()!.getAttribute('aria-disabled')).toBeNull();
		service.exitTenantContext.mockResolvedValueOnce(undefined);
		exitButton()!.click();
		flushSync();
		await tick();
		expect(service.exitTenantContext).toHaveBeenCalledTimes(1);
	});
});

describe('ContextBanner', () => {
	it('is a region named by its label, with the message and the action', () => {
		component = mount(ContextBanner, {
			target,
			props: {
				tone: 'destructive',
				icon: Building2,
				label: 'Impersonation',
				children: createRawSnippet(() => ({ render: () => '<span>Impersonating Acme</span>' })),
				action: createRawSnippet(() => ({ render: () => '<button>End</button>' }))
			}
		});
		flushSync();
		const el = document.querySelector('[role="region"]')!;
		expect(el.getAttribute('aria-label')).toBe('Impersonation');
		expect(el.textContent).toContain('Impersonating Acme');
		expect(el.querySelector('button')?.textContent).toBe('End');
		expect(el.getAttribute('data-shell')).toBe('banner');
	});
});
