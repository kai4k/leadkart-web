/**
 * ProfileStore — the caller's OWN profile state. Mirrors the shape
 * of lib/features/tenant/stores/tenant.svelte.ts: class with $state
 * fields, status enum, idempotent load(), update() that patches
 * optimistically then re-loads on success.
 *
 * Caller's membership ID comes from the session store (set at login).
 * If session.principal is null this store stays in 'idle' — the
 * (app) auth guard prevents that from happening in practice.
 */

import { getMyProfile, updateMyProfile } from '../api';
import { session } from '$lib/features/auth/stores/session.svelte';
import type { UserDto, UpdateProfileRequest } from '../types';

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

export class ProfileStore {
	current = $state<UserDto | null>(null);
	status = $state<ProfileStatus>('idle');
	error = $state<string | null>(null);

	async load(): Promise<void> {
		const membershipId = this.requireMembershipId();
		this.status = 'loading';
		this.error = null;
		try {
			this.current = await getMyProfile(membershipId);
			this.status = 'ready';
		} catch (err) {
			this.status = 'error';
			this.error = err instanceof Error ? err.message : 'Failed to load profile';
		}
	}

	async update(patch: UpdateProfileRequest): Promise<void> {
		const membershipId = this.requireMembershipId();
		this.status = 'saving';
		this.error = null;
		try {
			await updateMyProfile(membershipId, patch);
			// Optimistic merge; silentRefresh round-trips to capture server
			// canonicalization without flapping status through 'loading'.
			if (this.current) {
				this.current = { ...this.current, ...patch };
			}
			await this.silentRefresh(membershipId);
		} catch (err) {
			this.status = 'error';
			this.error = err instanceof Error ? err.message : 'Failed to save profile';
			throw err;
		}
	}

	/**
	 * Post-mutation re-fetch that does NOT flap status through 'loading'.
	 * The optimistic merge above means the user's typed values are already
	 * reflected. If the re-fetch fails the merge stays in place — preferable
	 * to a confusing "saved-but-also-error" state. The next load() will
	 * reconcile any drift.
	 */
	private async silentRefresh(membershipId: string): Promise<void> {
		try {
			this.current = await getMyProfile(membershipId);
			this.status = 'ready';
		} catch {
			// Mutation succeeded (200/204); swallow the refresh failure.
			// see godoc above.
			this.status = 'ready';
		}
	}

	reset(): void {
		this.current = null;
		this.status = 'idle';
		this.error = null;
	}

	private requireMembershipId(): string {
		const id = session.principal?.membershipId;
		if (!id) {
			// Reaching here means a profile-feature call slipped past the
			// (app) auth guard in routes/(app)/+layout.ts. Surface as a
			// loud error so the wiring bug is visible — components should
			// never see this in practice.
			throw new Error('profile store called without an authenticated session');
		}
		return id;
	}
}

export const profile = new ProfileStore();
