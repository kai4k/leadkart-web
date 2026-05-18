import {
	getPerson,
	listPersonMemberships,
	globalSuspend,
	liftGlobalSuspension,
	anonymisePerson
} from '$features/operator/people/api';
import type { PersonDto } from '$features/operator/people/types';
import type { UserDto } from '$features/auth/types';

export type OperatorPeopleStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

/**
 * Until the backend exposes GET /v1/platform/persons (list), this store
 * operates as a one-person cache fed by manual lookup-by-ID. The `list`
 * field is a one-element array (or empty) so list-view components can
 * iterate without special-casing.
 *
 * Once backend ships the list endpoint, replace `lookupById` with a
 * proper `load()` that populates `list` with the full collection.
 */
export class OperatorPeopleStore {
	list = $state<PersonDto[]>([]);
	current = $state<PersonDto | null>(null);
	memberships = $state<UserDto[]>([]);
	status = $state<OperatorPeopleStatus>('idle');
	error = $state<string | null>(null);

	/** Search by a single person ID (workaround for missing list endpoint).
	 *  Clears the list and error state when given an empty string. */
	async lookupById(personId: string): Promise<void> {
		const trimmed = personId.trim();
		if (!trimmed) {
			this.list = [];
			this.error = null;
			return;
		}
		this.status = 'loading';
		this.error = null;
		try {
			this.list = [await getPerson(trimmed)];
			this.status = 'ready';
		} catch (e) {
			this.list = [];
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Lookup failed';
		}
	}

	/** Load a Person + their cross-tenant memberships in parallel for the
	 *  detail route. Populates `current` and `memberships`. */
	async loadDetail(personId: string): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			const [person, { memberships }] = await Promise.all([
				getPerson(personId),
				listPersonMemberships(personId)
			]);
			this.current = person;
			this.memberships = memberships;
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load person';
		}
	}

	async suspend(personId: string, reason: string): Promise<void> {
		await this.mutate(() => globalSuspend(personId, { reason }), personId);
	}

	async liftSuspension(personId: string): Promise<void> {
		await this.mutate(() => liftGlobalSuspension(personId), personId);
	}

	async anonymise(personId: string, reason: string): Promise<void> {
		await this.mutate(() => anonymisePerson(personId, { reason }), personId);
	}

	reset(): void {
		this.list = [];
		this.current = null;
		this.memberships = [];
		this.status = 'idle';
		this.error = null;
	}

	private async mutate(op: () => Promise<void>, personId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await op();
			const fresh = await getPerson(personId);
			if (this.current?.id === personId) this.current = fresh;
			const idx = this.list.findIndex((p) => p.id === personId);
			if (idx >= 0) {
				const next = this.list.slice();
				next[idx] = fresh;
				this.list = next;
			}
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Operation failed';
			throw e;
		}
	}
}

export const operatorPeople = new OperatorPeopleStore();
