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
	logout,
	confirmEmailChange,
	requestEmailChange,
	changePassword,
	getMyCapabilities,
	getMyProfile,
	updateMyProfile,
	listSessions,
	revokeSession,
	revokeOtherSessions
} from './api';
export type { Capabilities } from './api';

export {
	myCapabilitiesQuery,
	myProfileQuery,
	mySessionsQuery,
	revokeSessionMutation,
	revokeOtherSessionsMutation,
	capabilitiesKey
} from './queries';

export { displayName, initials } from './view-models';
export { can, canAny, dashboardVariant, type DashboardVariant, type Tier } from './capabilities';
export { P, type Permission } from './permissions';

export type {
	LoginResponse,
	SessionPrincipal,
	UserDto,
	SessionDto,
	ListSessionsResponse,
	UpdateProfileRequest
} from './types';

export { session } from './stores/session.svelte';
export { default as ProfileForm } from './components/ProfileForm.svelte';
export { default as ChangePasswordForm } from './components/ChangePasswordForm.svelte';
export { default as ChangeEmailForm } from './components/ChangeEmailForm.svelte';
export { default as SessionsList } from './components/SessionsList.svelte';
export { default as ConfirmEmailChangeView } from './components/ConfirmEmailChangeView.svelte';
export { default as ForgotPasswordForm } from './components/ForgotPasswordForm.svelte';
export { default as ResetPasswordForm } from './components/ResetPasswordForm.svelte';
export { default as SigninForm } from './components/SigninForm.svelte';
