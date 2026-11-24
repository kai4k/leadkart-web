import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

const held = vi.hoisted(() => ({ set: new Set<string>() }));
vi.mock('#lib/features/auth/index.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	session: {
		canAny: (...p: string[]) => p.some((x) => held.set.has(x)),
		can: (x: string) => held.set.has(x)
	}
}));
const mutation = vi.hoisted(() => () => ({
	isPending: false,
	mutate: () => {},
	mutateAsync: () => {}
}));
vi.mock('#lib/features/orders/queries.ts', () => ({
	approveQuotationMutation: mutation,
	completeOrderMutation: mutation,
	confirmOrderMutation: mutation,
	generateInvoiceMutation: mutation,
	markDeliveredMutation: mutation
}));
vi.mock('#lib/features/leads/queries.ts', () => ({
	changeStageMutation: mutation,
	changeTemperatureMutation: mutation
}));

import OrderActionButtons from '#lib/features/orders/components/OrderActionButtons.svelte';
import LeadDetailHeader from '#lib/features/leads/components/LeadDetailHeader.svelte';
import { P } from '#lib/features/auth/permissions.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
	held.set = new Set();
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

const buttons = () =>
	[...target.querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '');

describe("write buttons follow the caller's permissions (Go's route gates)", () => {
	const order = { id: 'o1', status: 'quotation_draft' } as never;
	const noop = () => {};
	const renderOrder = () => {
		component = mount(OrderActionButtons, {
			target,
			props: {
				order,
				onRevise: noop,
				onRecordPayment: noop,
				onMarkPacked: noop,
				onDispatch: noop,
				onCancel: noop
			}
		});
		flushSync();
	};

	it('a quotation draft: Revise and Approve need orders.quotations.manage', () => {
		renderOrder();
		expect(buttons()).toEqual([]);
		unmount(component!);
		held.set = new Set([P.ordersQuotationsManage]);
		renderOrder();
		expect(buttons().join(' ')).toMatch(/Revise/);
		expect(buttons().join(' ')).toMatch(/Approve quotation/);
	});

	it('holding only the read permission (or only orders.manage) shows no quotation action', () => {
		held.set = new Set([P.ordersQuotationsRead, P.ordersOrdersManage]);
		renderOrder();
		expect(buttons()).toEqual([]);
	});
});

describe('lead header', () => {
	const lead = {
		id: 'l1',
		contact_name: 'A',
		mobile_number: '1',
		stage: 'new',
		temperature: 'warm',
		address: { city: 'Pune', state: 'MH', pin_code: '411001' }
	} as never;
	const render = () => {
		component = mount(LeadDetailHeader, {
			target,
			props: { lead, onEdit: () => {}, onReassign: () => {} }
		});
		flushSync();
	};

	it('Reassign needs crm.leads.assign, Edit needs crm.leads.manage', () => {
		held.set = new Set([P.crmLeadsRead]);
		render();
		expect(buttons().join(' ')).not.toMatch(/Reassign|Edit/);
		unmount(component!);
		held.set = new Set([P.crmLeadsAssign]);
		render();
		expect(buttons().join(' ')).toMatch(/Reassign/);
		expect(buttons().join(' ')).not.toMatch(/Edit/);
		unmount(component!);
		held.set = new Set([P.crmLeadsManage]);
		render();
		expect(buttons().join(' ')).toMatch(/Edit/);
		expect(buttons().join(' ')).not.toMatch(/Reassign/);
	});
});
