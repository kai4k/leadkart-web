/** Rows and state of a legacy `ui/data-table` that a test can change after it is mounted. */
export type HostRow = { id: string; name: string };
export type HostState = 'loading' | 'error' | 'empty' | 'ready';

export function createLegacyTableControl(rows: HostRow[]) {
	let current = $state<HostRow[]>(rows);
	let state = $state<HostState>('ready');
	return {
		get rows() {
			return current;
		},
		set rows(next: HostRow[]) {
			current = next;
		},
		get state() {
			return state;
		},
		set state(next: HostState) {
			state = next;
		}
	};
}
