import { z } from 'zod';
import {
	CapabilitiesDto,
	ChangePasswordRequest,
	ListSessionsResponse,
	LoginRequest,
	RevokeAllSessionsResponse,
	SessionDto,
	UpdateUserProfileRequest,
	UserDto
} from '#lib/api/generated/index.ts';
import { responseEmail, responseEmailOptional } from '#lib/api/response-schema.ts';

/**
 * CapabilitiesDto — GET /v1/auth/me/capabilities, straight from the generated
 * contract. `email` / `first_name` / `last_name` are omitzero in Go
 * (me_http.go), so they are optional here: a missing name never signs the
 * user out. The backend does NOT send a `tier` field — tier is derived
 * client-side via `deriveTier()` in capabilities.ts from `is_platform`,
 * `is_super_user` and `permissions`.
 */
export const capabilitiesSchema = CapabilitiesDto.extend({ email: responseEmailOptional });

/**
 * Auth feature Zod schemas — each response schema IS the generated one,
 * `.extend`ed only where the web needs a default. Used for both client-side
 * form validation AND runtime API response validation.
 *
 * Self-serve registration + email-link reset + email-change remain
 * disabled — see api.ts header.
 */

export const loginRequestSchema = LoginRequest.pick({ email: true, password: true }).extend({
	email: z.string().min(1, 'Email is required').email('Invalid email format'),
	password: z.string().min(1, 'Password is required')
});

/**
 * Change password (authenticated). Length floor mirrors the generated
 * ChangePasswordRequest (min 12); "new must differ from current" is
 * enforced server-side.
 */
export const changePasswordSchema = ChangePasswordRequest.extend({
	current_password: z.string().min(1, 'Current password is required'),
	new_password: z.string().min(12, 'Password must be at least 12 characters')
});

/**
 * UserDto — GET /v1/users/:membership_id. The profile strings are omitzero in
 * Go, so an absent value is read as ''.
 */
export const userDtoSchema = UserDto.extend({
	email: responseEmail,
	designation: z.string().default(''),
	department: z.string().default(''),
	status_message: z.string().default('')
});

export const sessionDtoSchema = SessionDto;
export const listSessionsResponseSchema = ListSessionsResponse;
export const revokeOtherSessionsResponseSchema = RevokeAllSessionsResponse;

/**
 * UpdateProfileRequest — strict so extra fields (first_name, email) are
 * caught at the gateway boundary. Only the three editable fields are
 * accepted, and all three are required by the form.
 */
export const updateProfileRequestSchema = UpdateUserProfileRequest.extend({
	designation: z.string().max(120),
	department: z.string().max(120),
	status_message: z.string().max(280)
}).strict();
