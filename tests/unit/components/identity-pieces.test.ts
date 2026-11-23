import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import IdentityCell from '#lib/components/data/IdentityCell.svelte';
import IdChip from '#lib/components/data/IdChip.svelte';
import BackLink from '#lib/components/data/BackLink.svelte';
import RowActionsMenu from '#lib/components/data/RowActionsMenu.svelte';
import { Trash2, Edit } from '#lib/icons/index.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(Component: unknown, props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Component as never, { target, props });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

async function openMenu(label: string) {
	const trigger = target.querySelector<HTMLElement>(`button[aria-label="${label}"]`)!;
	trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	await tick();
	flushSync();
}
const menuItems = () => [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];

describe('IdentityCell', () => {
	it('shows the initials when there is no avatar image', () => {
		render(IdentityCell, { name: 'Ravi Kumar' });
		expect(target.textContent).toContain('RK');
		expect(target.textContent).toContain('Ravi Kumar');
	});

	it('shows the subtitle under the name', () => {
		render(IdentityCell, { name: 'Ravi Kumar', subtitle: 'ravi@acme.test' });
		expect(target.textContent).toContain('ravi@acme.test');
	});

	it('with href the name is a link', () => {
		render(IdentityCell, { name: 'Ravi Kumar', href: '/people/1' });
		const link = target.querySelector('a');
		expect(link?.getAttribute('href')).toBe('/people/1');
		expect(link?.textContent?.trim()).toBe('Ravi Kumar');
	});

	it('without href there is no link', () => {
		render(IdentityCell, { name: 'Ravi Kumar' });
		expect(target.querySelector('a')).toBeNull();
	});

	it('renders the avatar image when a URL is given, with the name as its text alternative', () => {
		render(IdentityCell, { name: 'Ravi Kumar', avatarUrl: '/a.png' });
		const img = target.querySelector('img');
		expect(img?.getAttribute('src')).toBe('/a.png');
		expect(img?.getAttribute('alt')).toBe('');
	});

	it('the initials are decoration: the name is the only accessible text', () => {
		render(IdentityCell, { name: 'Ravi Kumar' });
		expect(target.querySelector('[data-slot="avatar"]')?.getAttribute('aria-hidden')).toBe('true');
	});
});

describe('IdChip', () => {
	it('shows a short form of the value and the copy button names what it copies', () => {
		render(IdChip, { value: '3f2a9c10-aaaa-bbbb-cccc-0123456789ab', label: 'tenant ID' });
		expect(target.querySelector('code')?.textContent).toBe('3f2a9c10');
		expect(target.querySelector('button')?.getAttribute('aria-label')).toBe('Copy tenant ID');
	});

	it('keeps the full value reachable on the chip', () => {
		render(IdChip, { value: '3f2a9c10-aaaa-bbbb-cccc-0123456789ab', label: 'tenant ID' });
		expect(target.querySelector('code')?.getAttribute('title')).toBe(
			'3f2a9c10-aaaa-bbbb-cccc-0123456789ab'
		);
	});

	it('a value already short is not cut', () => {
		render(IdChip, { value: 'abc', label: 'code' });
		expect(target.querySelector('code')?.textContent).toBe('abc');
	});
});

describe('BackLink', () => {
	it('is a link with the label and a decorative arrow', () => {
		render(BackLink, { href: '/requests', label: 'Permission requests' });
		const link = target.querySelector('a')!;
		expect(link.getAttribute('href')).toBe('/requests');
		expect(link.textContent?.trim()).toBe('Permission requests');
		expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
	});
});

describe('RowActionsMenu', () => {
	const actions = (over: Record<string, unknown> = {}) => [
		{ id: 'edit', label: 'Edit', onSelect: vi.fn(), ...over },
		{ id: 'delete', label: 'Delete', variant: 'destructive' as const, onSelect: vi.fn() }
	];

	it('the trigger names the row it acts on', () => {
		render(RowActionsMenu, { label: 'Sales Lead', actions: actions() });
		expect(target.querySelector('button[aria-label="Actions for Sales Lead"]')).not.toBeNull();
	});

	it('picking an action runs its handler', async () => {
		const list = actions();
		render(RowActionsMenu, { label: 'Sales Lead', actions: list });
		await openMenu('Actions for Sales Lead');
		menuItems()
			.find((i) => i.textContent?.includes('Edit'))!
			.click();
		await tick();
		expect(list[0]!.onSelect).toHaveBeenCalledTimes(1);
		expect(list[1]!.onSelect).not.toHaveBeenCalled();
	});

	it('an href action is the menuitem itself, an anchor, with nothing interactive inside', async () => {
		render(RowActionsMenu, {
			label: 'Sales Lead',
			actions: [{ id: 'open', label: 'Open', href: '/roles/1' }]
		});
		await openMenu('Actions for Sales Lead');
		const item = menuItems()[0]!;
		expect(item.tagName).toBe('A');
		expect(item.getAttribute('href')).toBe('/roles/1');
		expect(item.querySelector('a,button,input,select,textarea,[role="menuitem"]')).toBeNull();
		expect(item.closest('a, button')).toBe(item);
	});

	it('a disabled action is aria-disabled', async () => {
		render(RowActionsMenu, {
			label: 'Sales Lead',
			actions: actions({ disabled: true })
		});
		await openMenu('Actions for Sales Lead');
		const edit = menuItems().find((i) => i.textContent?.includes('Edit'))!;
		expect(edit.getAttribute('aria-disabled')).toBe('true');
	});

	it('a destructive action is marked destructive', async () => {
		render(RowActionsMenu, { label: 'Sales Lead', actions: actions() });
		await openMenu('Actions for Sales Lead');
		const del = menuItems().find((i) => i.textContent?.includes('Delete'))!;
		expect(del.getAttribute('data-variant')).toBe('destructive');
	});

	it('every action gets an icon when all have one', async () => {
		render(RowActionsMenu, {
			label: 'x',
			actions: [
				{ id: 'a', label: 'Edit', icon: Edit, onSelect: vi.fn() },
				{ id: 'b', label: 'Delete', icon: Trash2, onSelect: vi.fn() }
			]
		});
		await openMenu('Actions for x');
		expect(menuItems().every((i) => i.querySelector('svg'))).toBe(true);
	});

	it('icons are all or none: a group with one plain action shows no icons', async () => {
		render(RowActionsMenu, {
			label: 'x',
			actions: [
				{ id: 'a', label: 'Edit', icon: Edit, onSelect: vi.fn() },
				{ id: 'b', label: 'Archive', onSelect: vi.fn() }
			]
		});
		await openMenu('Actions for x');
		expect(menuItems()).toHaveLength(2);
		expect(menuItems().some((i) => i.querySelector('svg'))).toBe(false);
	});
});
