import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Pagination from '#lib/components/data/Pagination.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Pagination as never, { target, props });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

const byLabel = (l: string) => target.querySelector<HTMLElement>(`[aria-label="${l}"]`)!;

describe('Pagination', () => {
	it('Next calls onChange(page + 1) and Previous page - 1', () => {
		const onChange = vi.fn();
		render({ page: 3, pageCount: 9, onChange });
		byLabel('Next page').click();
		expect(onChange).toHaveBeenLastCalledWith(4);
	});
	it('Previous calls onChange(page - 1)', () => {
		const onChange = vi.fn();
		render({ page: 3, pageCount: 9, onChange });
		byLabel('Previous page').click();
		expect(onChange).toHaveBeenLastCalledWith(2);
	});
	it('marks the current page with aria-current="page", and only it', () => {
		render({ page: 3, pageCount: 9, onChange: vi.fn() });
		const current = target.querySelectorAll('[aria-current="page"]');
		expect(current).toHaveLength(1);
		expect(current[0]!.textContent?.trim()).toBe('3');
	});
	it('is a labelled navigation landmark', () => {
		render({ page: 1, pageCount: 2, onChange: vi.fn(), label: 'Users pages' });
		expect(target.querySelector('[role="navigation"]')?.getAttribute('aria-label')).toBe(
			'Users pages'
		);
	});
	it('refuses Previous on the first page and Next on the last', () => {
		const onChange = vi.fn();
		render({ page: 1, pageCount: 1, onChange });
		byLabel('Previous page').click();
		byLabel('Next page').click();
		expect(onChange).not.toHaveBeenCalled();
		expect(byLabel('Previous page').hasAttribute('disabled')).toBe(true);
		expect(byLabel('Next page').hasAttribute('disabled')).toBe(true);
	});
	it('collapses a long range with gaps and keeps the first and last page', () => {
		render({ page: 10, pageCount: 20, onChange: vi.fn() });
		const labels = [...target.querySelectorAll('a,button')].map((e) => e.textContent?.trim());
		expect(labels).toContain('1');
		expect(labels).toContain('20');
		expect(target.querySelectorAll('[data-slot="pagination-ellipsis"]').length).toBe(2);
	});
	it('clicking a page number calls onChange with it', () => {
		const onChange = vi.fn();
		render({ page: 1, pageCount: 3, onChange });
		byLabel('Page 3').click();
		expect(onChange).toHaveBeenCalledWith(3);
	});
});
