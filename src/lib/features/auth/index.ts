/**
 * Auth feature barrel.
 *
 * Public surface for signin / signup / forgot-password / reset / verify
 * flows plus the session store (the de-facto auth service today).
 *
 * Selectively re-exported (no `export *`) — schemas.ts and types.ts both
 * declare overlapping names like LoginRequest; the explicit list below
 * resolves the ambiguity in favour of the curated types module.
 */
export {
	login,
	logout,
	requestPasswordReset,
	resetPassword,
	confirmEmailChange,
	requestEmailChange,
	changePassword,
	getMyCapabilities,
	getMyProfile,
	updateMyProfile,
	listSessions,
	revokeSession,
	revokeOtherSessions,
	LoginError
} from './api';
export type { Capabilities, LoginResult } from './api';

export {
	myCapabilitiesQuery,
	myProfileQuery,
	updateMyProfileMutation,
	mySessionsQuery,
	revokeSessionMutation,
	revokeOtherSessionsMutation,
	capabilitiesKey
} from './queries';

export { hasCapability, deriveTier, type PrincipalTier } from './capabilities';

export type {
	LoginResponse,
	SessionPrincipal,
	UserDto,
	SessionDto,
	ListSessionsResponse,
	UpdateProfileRequest
} from './types';

export { session } from './stores/session.svelte';
