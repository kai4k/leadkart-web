/**
 * Pure, framework-free pieces of the impersonation store: a serial queue (no two operations of the store in flight
 * together) and a deadline for a promise. Nothing here knows about sessions, people or the UI.
 */

/** An operation did not settle inside its deadline. What that means (failed? unknown?) is the caller's call. */
export class DeadlineError extends Error {
	constructor() {
		super('The request took too long.');
		this.name = 'DeadlineError';
	}
}

/** Settle like `p`, or reject with a `DeadlineError` after `ms`. `p` itself is NOT cancelled. */
export function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new DeadlineError()), ms);
		p.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			(e: unknown) => {
				clearTimeout(timer);
				reject(e);
			}
		);
	});
}

export interface SerialQueue {
	/** Run `task` after every task queued before it has settled (whether it resolved or rejected). */
	run<T>(task: () => Promise<T>): Promise<T>;
	/** Start a new chain: what is queued or running still runs, but nothing new waits for it. */
	abandon(): void;
}

export function createSerialQueue(): SerialQueue {
	let tail: Promise<unknown> = Promise.resolve();
	return {
		run<T>(task: () => Promise<T>): Promise<T> {
			const op = tail.then(task);
			tail = op.then(
				() => undefined,
				() => undefined
			);
			return op;
		},
		abandon() {
			tail = Promise.resolve();
		}
	};
}
