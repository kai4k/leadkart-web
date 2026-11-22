/** What the impersonation store tells a form: errors with user-facing copy from the catalogue. */
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { ApiError } from '$api/errors';

/** The UI's rendering of `already` for a form: an error whose message is the one line. */
export class AlreadyImpersonatingError extends ApiError {
	constructor() {
		super();
		this.name = 'AlreadyImpersonatingError';
		this.message = get(_)('shell.impersonation.already');
	}
}

/** A refusal the store itself makes (nobody signed in, the state changed, the status could not be checked). */
export class ImpersonationRefusedError extends ApiError {
	constructor(message: string) {
		super();
		this.name = 'ImpersonationRefusedError';
		this.message = message;
	}
}

/** The start did not answer in time: the session may or may not exist. The store is checking. */
export class StartOutcomeUnknownError extends ApiError {
	constructor() {
		super();
		this.name = 'StartOutcomeUnknownError';
		this.message = get(_)('shell.impersonation.startUnknown');
	}
}
