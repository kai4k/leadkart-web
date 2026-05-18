/**
 * SessionsStore — the caller's active refresh-token families.
 * Mirrors ProfileStore's shape. Exposes the current family ID
 * (read from the session store) so SessionsList can mark the
 * "you are here" row.
 */
import {
	listSessions,
	revokeSession as revokeSessionApi,
	revokeOtherSessions as revokeOtherSessionsApi
} from '$features/auth/api';
import { session } from '$features/auth/stores/session.svelte';
import type { SessionDto } from '$features/auth/types';

export type SessionsStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

export class SessionsStore {
	list = $state<SessionDto[]>([]);
	status = $state<SessionsStatus>('idle');
	error = $state<string | null>(null);

	get activeFamilyId(): string | null {
		return session.activeFamilyId ?? null;
	}

	async load(): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			this.list = await listSessions();
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load sessions';
		}
	}

	async revoke(familyId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await revokeSessionApi(familyId);
			this.list = this.list.filter((s) => s.family_id !== familyId);
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to revoke session';
			throw e;
		}
	}

	async revokeOthers(): Promise<number> {
		this.status = 'mutating';
		try {
			const { revoked_count } = await revokeOtherSessionsApi('user_revoked_others');
			const current = this.activeFamilyId;
			this.list = current ? this.list.filter((s) => s.family_id === current) : [];
			this.status = 'ready';
			return revoked_count;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to revoke other sessions';
			throw e;
		}
	}

	reset(): void {
		this.list = [];
		this.status = 'idle';
		this.error = null;
	}
}

export const sessions = new SessionsStore();
