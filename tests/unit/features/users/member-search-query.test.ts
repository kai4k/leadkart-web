/** The picker's search does not fire below Go's minimum (2 characters), and its rows are keyed by membership_id. */
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ options: [] as { enabled: boolean; queryKey: unknown[] }[] }));
vi.mock('@tanstack/svelte-query', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	createQuery: (opts: () => { enabled: boolean; queryKey: unknown[] }) => {
		h.options.push(opts());
		return {};
	}
}));
vi.mock('#lib/features/users/api.ts', async (importOriginal) => importOriginal());

import { membershipSearchQuery } from '#lib/features/users/queries.ts';
import { memberSearchOptions } from '#lib/features/users/view-models.ts';

const enabledFor = (q: string) => {
	h.options = [];
	membershipSearchQuery(() => q);
	return h.options[0]!.enabled;
};

describe('membershipSearchQuery', () => {
	it('is off at one character, on at two, off past 100 (characters, trimmed)', () => {
		expect(enabledFor('a')).toBe(false);
		expect(enabledFor('  a  ')).toBe(false);
		expect(enabledFor('as')).toBe(true);
		expect(enabledFor('x'.repeat(100))).toBe(true);
		expect(enabledFor('x'.repeat(101))).toBe(false);
	});
});

describe('memberSearchOptions', () => {
	it('the option value is the membership_id, the label the display name, the description the designation', () => {
		expect(
			memberSearchOptions([
				{ membership_id: 'm-9', display_name: 'Asha Verma', designation: 'Sales' }
			])
		).toEqual([{ value: 'm-9', label: 'Asha Verma', description: 'Sales' }]);
	});
});
