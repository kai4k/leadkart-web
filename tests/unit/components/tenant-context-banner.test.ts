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
	page: undefined as unknown as { data: { tenantContext: unknown } }
}));
vi.mock('$app/state', async () => {
	const { createReactivePage } = await import('../helpers/reactive-page.svelte.ts');
	pageState.page = createReactivePage<{ tenantContext: unknown }>({ tenantContext: null });
	return {
		page: {
			get data() {
				return pageState.page.data;
			},
			url: new URL('http://localhost/operator/scope/profile')
		}
	};
});
const service = vi.hoisted(() => ({ exitTenantContext: vi.fn() }));
vi.mock('#lib/features/operator/scope/service.ts', () => service);
vi.mock('#lib/features/operator/scope/service', () => service);

import TenantContextBanner from '#lib/layouts/TenantContextBanner.svelte';
import ContextBanner from '#lib/layouts/ContextBanner.svelte';
import { createQueryClient } from '#lib/api/query-client.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';
import { Building2 } from '#lib/icons/index.ts';
import en from '../../../src/lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	pageState.page.data = { tenantContext: { displayName: 'Acme', isPlatform: false } };
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
		pageState.page.data = { tenantContext: { displayName: 'LeadKart Platform', isPlatform: true } };
		render();
		expect(region()!.textContent).toContain('LeadKart Platform');
		expect(region()!.textContent).toContain('Platform');
	});

	it('renders nothing without a tenant context', () => {
		pageState.page.data = { tenantContext: null };
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
		pageState.page.data = { tenantContext: { displayName: 'Globex', isPlatform: false } };
		flushSync();
		expect(region()!.textContent).toContain('Globex');
		expect(region()!.textContent).not.toContain('Acme');
	});

	it('shows a long or bidi-laden name inside <bdi>, with the full text in title', () => {
		const name = String.fromCharCode(0x202e) + 'x'.repeat(200);
		pageState.page.data = { tenantContext: { displayName: name, isPlatform: false } };
		render();
		const bdi = region()!.querySelector('bdi')!;
		expect(bdi.textContent).toBe(name);
		expect(bdi.getAttribute('title')).toBe(name);
	});

	it('Exit navigates to the tenants list through the one exit flow', async () => {
		service.exitTenantContext.mockResolvedValueOnce(undefined);
		render();
		exitButton()!.click();
		flushSync();
		await tick();
		expect(service.exitTenantContext).toHaveBeenCalledWith(h.qc);
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

describe('a reset that starts while the banner is showing', () => {
	it('flips Exit to aria-disabled at once, without another render trigger', async () => {
		vi.stubGlobal('location', { replace: vi.fn(), pathname: '/x', search: '' });
		render();
		expect(exitButton()!.getAttribute('aria-disabled')).toBeNull();
		const { hardReset } = await import('#lib/api/hard-reset.ts');
		expect(hardReset('context')).toBe(true);
		flushSync();
		expect(exitButton()!.getAttribute('aria-disabled')).toBe('true');
		window.dispatchEvent(new Event('pageshow'));
		flushSync();
		expect(exitButton()!.getAttribute('aria-disabled')).toBeNull();
		vi.unstubAllGlobals();
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
