/**
 * Auth feature view-models — pure transforms from UserDto
 * to render-ready shapes. No async, no side effects, no DOM access.
 * Per CLAUDE.md gateway → service → VM → component layering.
 */
import { defineStatusMap } from '#lib/utils/status.ts';
import type { UserDto } from './types';

export { displayName, initials } from '#lib/utils/person-name.ts';

/** Membership status (Go: `active | inactive`) as a badge: the profile, the team list and the org tree. */
export const userStatus = defineStatusMap<UserDto['status']>({
	active: { label: 'Active', variant: 'success' },
	inactive: { label: 'Inactive', variant: 'neutral' }
});
