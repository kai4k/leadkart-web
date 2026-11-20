import { describe, expect, it } from 'vitest';
import { permissionRequestState } from '#lib/features/permission-requests/view-models.ts';

describe('permissionRequestState', () => {
	it.each([
		['pending', 'Pending', 'warning'],
		['approved', 'Approved', 'success'],
		['denied', 'Denied', 'danger'],
		['cancelled', 'Cancelled', 'neutral']
	] as const)('%s -> %s (%s)', (state, label, variant) => {
		expect(permissionRequestState(state)).toEqual({ label, variant });
	});

	it('an unknown state renders raw in a neutral badge', () => {
		expect(permissionRequestState('expired' as never)).toEqual({
			label: 'expired',
			variant: 'neutral'
		});
	});
});
