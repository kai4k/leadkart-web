/**
 * Auth feature view-models — pure transforms from UserDto / SessionDto
 * to render-ready shapes. No async, no side effects, no DOM access.
 * Per CLAUDE.md gateway → service → VM → component layering.
 */
import type { UserDto, SessionDto } from './types';

/**
 * Human display name for a user. Falls back to the email local-part
 * when both first + last are blank (rare but possible during the
 * pre-profile-fill window).
 */
export function displayName(user: UserDto): string {
	const first = user.first_name.trim();
	const last = user.last_name.trim();
	if (first && last) return `${first} ${last}`;
	if (first) return first;
	if (last) return last;
	return user.email.split('@')[0] ?? user.email;
}

/**
 * Two-letter monogram for Avatar. Uppercased.
 */
export function initials(user: UserDto): string {
	const first = user.first_name.trim();
	const last = user.last_name.trim();
	const f = first[0];
	const l = last[0];
	if (f && l) return `${f}${l}`.toUpperCase();
	if (f) return f.toUpperCase();
	if (l) return l.toUpperCase();
	const e = user.email[0];
	return e ? e.toUpperCase() : '?';
}

/**
 * Relative time label: "just now" / "N minutes ago" / "N hours ago"
 * within the first day, absolute date afterwards. Used by SessionsList.
 */
export function lastSeenLabel(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return iso;
	const diffMs = Date.now() - then;
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) return 'just now';
	if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Does this session represent the caller's CURRENT login? The session
 * store exposes the active refresh-token family ID; if it matches the
 * session's family_id, this row is the "you are here" entry.
 */
export function isCurrentSession(session: SessionDto, activeFamilyId: string | null): boolean {
	if (!activeFamilyId) return false;
	return session.family_id === activeFamilyId;
}
