/**
 * Unit tests for the roving-tabindex keyboard navigation hook.
 *
 * Exercises the public surface: `setItems`, `focusedIdx`, `tabindexFor`,
 * `focusRow`, `registerRef`, and the `handleKey` dispatch table that
 * routes j/k/Arrow/Enter/e/x/Home/End to the right callback. Focus
 * boundary (`onFocusIn` / `onFocusOut` walking up to `data-roving-root`)
 * is covered via jsdom DOM construction.
 */
import { describe, expect, it, vi } from 'vitest';
import { createKeyboardListNav } from '$lib/hooks/use-keyboard-list-nav.svelte';

type Item = { id: string; label: string };

const items: Item[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
	{ id: 'c', label: 'Charlie' }
];

function makeKey(
	key: string,
	target?: EventTarget,
	mods: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean } = {}
): KeyboardEvent {
	const evt = new KeyboardEvent('keydown', { key, cancelable: true, ...mods });
	if (target) {
		Object.defineProperty(evt, 'target', { value: target, writable: false });
	}
	return evt;
}

describe('KeyboardListNav — initial state', () => {
	it('focusedIdx starts at 0 (no -1 sentinel)', () => {
		const nav = createKeyboardListNav<Item>();
		expect(nav.focusedIdx).toBe(0);
	});

	it('hasFocus starts false', () => {
		const nav = createKeyboardListNav<Item>();
		expect(nav.hasFocus).toBe(false);
	});

	it('tabindexFor(0) === 0 and tabindexFor(1) === -1', () => {
		const nav = createKeyboardListNav<Item>();
		expect(nav.tabindexFor(0)).toBe(0);
		expect(nav.tabindexFor(1)).toBe(-1);
	});
});

describe('KeyboardListNav.setItems', () => {
	it('clamps focusedIdx to last row when list shrinks', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.focusRow(2);
		expect(nav.focusedIdx).toBe(2);
		nav.setItems(items.slice(0, 1));
		expect(nav.focusedIdx).toBe(0);
	});

	it('clamps to 0 when list becomes empty', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.focusRow(2);
		nav.setItems([]);
		expect(nav.focusedIdx).toBe(0);
	});
});

describe('KeyboardListNav.handleKey — movement', () => {
	it('j moves focus to the next row', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		expect(nav.focusedIdx).toBe(0);
		nav.handleKey(makeKey('j'));
		expect(nav.focusedIdx).toBe(1);
		nav.handleKey(makeKey('j'));
		expect(nav.focusedIdx).toBe(2);
	});

	it('j at the last row is a no-op (no wrap)', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.focusRow(2);
		nav.handleKey(makeKey('j'));
		expect(nav.focusedIdx).toBe(2);
	});

	it('k at the first row is a no-op (no wrap)', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.handleKey(makeKey('k'));
		expect(nav.focusedIdx).toBe(0);
	});

	it('ArrowDown is an alias for j', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.handleKey(makeKey('ArrowDown'));
		expect(nav.focusedIdx).toBe(1);
	});

	it('ArrowUp is an alias for k', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.focusRow(2);
		nav.handleKey(makeKey('ArrowUp'));
		expect(nav.focusedIdx).toBe(1);
	});

	it('Home jumps to the first row', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.focusRow(2);
		nav.handleKey(makeKey('Home'));
		expect(nav.focusedIdx).toBe(0);
	});

	it('End jumps to the last row', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.handleKey(makeKey('End'));
		expect(nav.focusedIdx).toBe(2);
	});
});

describe('KeyboardListNav.handleKey — callbacks', () => {
	it('Enter fires onSelect with the focused item', () => {
		const onSelect = vi.fn();
		const nav = createKeyboardListNav<Item>({ onSelect });
		nav.setItems(items);
		nav.focusRow(1);
		nav.handleKey(makeKey('Enter'));
		expect(onSelect).toHaveBeenCalledWith(items[1]);
	});

	it('e fires onEdit', () => {
		const onEdit = vi.fn();
		const nav = createKeyboardListNav<Item>({ onEdit });
		nav.setItems(items);
		nav.handleKey(makeKey('e'));
		expect(onEdit).toHaveBeenCalledWith(items[0]);
	});

	it('x fires onToggleSelect', () => {
		const onToggleSelect = vi.fn();
		const nav = createKeyboardListNav<Item>({ onToggleSelect });
		nav.setItems(items);
		nav.handleKey(makeKey('x'));
		expect(onToggleSelect).toHaveBeenCalledWith(items[0]);
	});
});

describe('KeyboardListNav.handleKey — guards', () => {
	it('bails when target is an <input>', () => {
		const input = document.createElement('input');
		const onSelect = vi.fn();
		const nav = createKeyboardListNav<Item>({ onSelect });
		nav.setItems(items);
		nav.handleKey(makeKey('j', input));
		expect(nav.focusedIdx).toBe(0);
		nav.handleKey(makeKey('Enter', input));
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('bails when target is a <textarea>', () => {
		const ta = document.createElement('textarea');
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.handleKey(makeKey('j', ta));
		expect(nav.focusedIdx).toBe(0);
	});

	it('bails when target is a <select>', () => {
		const sel = document.createElement('select');
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.handleKey(makeKey('j', sel));
		expect(nav.focusedIdx).toBe(0);
	});

	it('bails when meta/ctrl/alt is held (Cmd+K wins)', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.handleKey(makeKey('j', undefined, { metaKey: true }));
		expect(nav.focusedIdx).toBe(0);
		nav.handleKey(makeKey('j', undefined, { ctrlKey: true }));
		expect(nav.focusedIdx).toBe(0);
		nav.handleKey(makeKey('j', undefined, { altKey: true }));
		expect(nav.focusedIdx).toBe(0);
	});
});

describe('KeyboardListNav.registerRef + focusRow', () => {
	it('focusRow calls .focus() on the registered element', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		const el = document.createElement('tr');
		const focusSpy = vi.spyOn(el, 'focus');
		nav.registerRef('b', el);
		nav.focusRow(1);
		expect(focusSpy).toHaveBeenCalled();
	});

	it('focusRow on out-of-range index is a no-op', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		nav.focusRow(-1);
		expect(nav.focusedIdx).toBe(0);
		nav.focusRow(99);
		expect(nav.focusedIdx).toBe(0);
	});

	it('registerRef(id, null) unregisters the ref', () => {
		const nav = createKeyboardListNav<Item>();
		nav.setItems(items);
		const el = document.createElement('tr');
		const focusSpy = vi.spyOn(el, 'focus');
		nav.registerRef('a', el);
		nav.registerRef('a', null);
		nav.focusRow(0);
		expect(focusSpy).not.toHaveBeenCalled();
	});
});

describe('KeyboardListNav.onFocusIn / onFocusOut', () => {
	it('onFocusIn flips hasFocus on', () => {
		const nav = createKeyboardListNav<Item>();
		nav.onFocusIn();
		expect(nav.hasFocus).toBe(true);
	});

	it('onFocusOut to null relatedTarget flips hasFocus off', () => {
		const nav = createKeyboardListNav<Item>();
		nav.onFocusIn();
		const event = { relatedTarget: null } as FocusEvent;
		nav.onFocusOut(event);
		expect(nav.hasFocus).toBe(false);
	});

	it('onFocusOut to a sibling row inside data-roving-root keeps hasFocus on', () => {
		const root = document.createElement('table');
		root.setAttribute('data-roving-root', '');
		const tbody = document.createElement('tbody');
		const row1 = document.createElement('tr');
		const row2 = document.createElement('tr');
		root.append(tbody);
		tbody.append(row1, row2);
		document.body.append(root);

		const nav = createKeyboardListNav<Item>();
		nav.onFocusIn();
		const event = { relatedTarget: row2 } as unknown as FocusEvent;
		nav.onFocusOut(event);
		expect(nav.hasFocus).toBe(true);

		root.remove();
	});

	it('onFocusOut to an outside element flips hasFocus off', () => {
		const outside = document.createElement('button');
		document.body.append(outside);

		const nav = createKeyboardListNav<Item>();
		nav.onFocusIn();
		const event = { relatedTarget: outside } as unknown as FocusEvent;
		nav.onFocusOut(event);
		expect(nav.hasFocus).toBe(false);

		outside.remove();
	});
});
