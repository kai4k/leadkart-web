import { z } from 'zod';

/**
 * Response data is never format-checked beyond its type: format checks belong to FORM (request)
 * schemas only. Go's `email.New` accepts addresses Zod 4's `.email()` rejects (`josé@example.com`,
 * `u@münchen.de`, `a!b@x.com`, `u@ex_ample.com`, `u@x.c`); a response schema stricter than Go fails
 * the whole payload (a blank users list, a sign-in loop on a capabilities parse).
 *
 * The generated contract bakes `.email()` into every DTO that carries one, so a response schema
 * built from it replaces the field: `UserDto.extend({ email: responseEmail })`.
 */
export const responseEmail = z.string();
export const responseEmailOptional = responseEmail.optional();
