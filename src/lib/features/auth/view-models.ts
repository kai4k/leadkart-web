/**
 * Auth feature view-models — pure transforms from UserDto / SessionDto
 * to render-ready shapes. No async, no side effects, no DOM access.
 * Per CLAUDE.md gateway → service → VM → component layering.
 */
import { defineStatusMap } from '#lib/utils/status.ts';
import type { SessionDto, UserDto } from './types';

export { displayName, initials } from '#lib/utils/person-name.ts';

/** Membership status (Go: `active | inactive`) as a badge: the profile, the team list and the org tree. */
export const userStatus = defineStatusMap<UserDto['status']>({
	active: { label: 'Active', variant: 'success' },
	inactive: { label: 'Inactive', variant: 'neutral' }
});

/**
 * Does this session represent the caller's CURRENT login? The session
 * store exposes the active refresh-token family ID; if it matches the
 * session's family_id, this row is the "you are here" entry.
 */
export function isCurrentSession(session: SessionDto, activeFamilyId: string | null): boolean {
	if (!activeFamilyId) return false;
	return session.family_id === activeFamilyId;
}
