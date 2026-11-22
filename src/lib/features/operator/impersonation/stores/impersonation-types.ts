/** The impersonation store's public contract: what it exposes and what a caller can configure. */
import {
	BFF_MAX_UPSTREAM_HOPS,
	DEFAULT_READ_TIMEOUT_MS,
	DEFAULT_UPSTREAM_TIMEOUT_MS
} from '$api/timeouts';
import type { ImpersonationSessionDto, CreateImpersonationSessionRequest } from '../types';

export type ImpersonationStatus = 'idle' | 'loading' | 'active' | 'mutating' | 'error';

/** `started`: a session was opened. `already`: the server lists one for this person (it is shown), nothing was posted. */
export type StartResult = { kind: 'started' } | { kind: 'already' };

/**
 * A MUTATION is allowed longer than the BFF can spend on one browser request (3 upstream hops of 10 s plus a margin
 * that clears the read deadline): a write the server committed is never reported as timed out (`api/timeouts.ts`).
 * Past it the outcome is UNKNOWN, not failed.
 */
export const MUTATION_DEADLINE_MS =
	BFF_MAX_UPSTREAM_HOPS * DEFAULT_UPSTREAM_TIMEOUT_MS + DEFAULT_READ_TIMEOUT_MS;

export interface Impersonation {
	/** The session shown: the first the server listed for the signed-in person, or null. */
	readonly active: ImpersonationSessionDto | null;
	/** How many more sessions the server lists for this person (the banner says "+N more"). */
	readonly more: number;
	readonly status: ImpersonationStatus;
	/** The last READ failed (the status could not be checked). Retry reads again; it never ends anything. */
	readonly readError: string | null;
	/** The last END failed for the session shown. Trying again ends that session. */
	readonly endError: string | null;
	/** Nothing is shown and the status could not be checked, or a mutation's outcome is still being checked. */
	readonly unknown: boolean;
	/** A start or end did not answer in time: follow-up reads are running until one tells the truth. */
	readonly checking: boolean;
	/** The company's name, in memory only (the DTO carries an id): the banner says "a company" without it. */
	readonly targetName: string | null;
	/** Read the server's list for the signed-in person. Reads queued behind each other collapse into one. */
	reconcile(): Promise<void>;
	/** Check the server's list, then POST a session only if it lists none. */
	start(req: CreateImpersonationSessionRequest, targetName?: string): Promise<StartResult>;
	/** After a start whose outcome is unknown: resolves once the follow-up reads say whether a session exists. */
	resolveUnknownStart(): Promise<'started' | 'not-started'>;
	/** DELETE a session. The id is the one SHOWN when the user clicked (default: the shown one now). */
	end(sessionId?: string): Promise<void>;
	/** Sign-out / person change: empty the store and drop every result still on its way. */
	forget(): void;
	/** Stop listening to other tabs and cancel timers (tests, and any caller that owns an instance). */
	dispose(): void;
}

export interface ImpersonationOptions {
	/** The signed-in person (null: nobody). State is tagged with it; a result for another person is dropped. */
	personId: () => string | null;
	/** Longest a READ may take before it counts as failed. Default: the client read timeout. */
	deadlineMs?: number;
	/** Longest a START or END may take before its outcome is UNKNOWN. Default: above the BFF's worst case. */
	mutationDeadlineMs?: number;
	/** Follow-up read schedule after an unknown outcome (ms). */
	followUpDelaysMs?: readonly number[];
	now?: () => number;
}
