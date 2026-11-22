/**
 * What the impersonation store does after a mutation whose outcome is UNKNOWN (it did not settle inside its deadline):
 * it looks again on a schedule (`schedule.ts`) until one read tells the truth, and tells whoever is waiting for the
 * answer of a START whether the session exists. The store feeds it the facts (a read, whether it failed, how many
 * sessions are listed); it owns `checking` and the waiters.
 */
import { createFollowUp } from './schedule';

export interface UnknownOutcomeOptions {
	delays?: readonly number[];
	/** One read of the server's list, through the store's own queue. */
	reconcile: () => Promise<void>;
	/** The store's epoch: a bump (forget) means nothing is left to look for. */
	epoch: () => number;
	/** The last read failed. */
	readFailed: () => boolean;
	/** How many sessions are listed for the signed-in person. */
	sessionCount: () => number;
}

export type StartAnswer = 'started' | 'not-started';

export interface UnknownOutcome {
	/** A follow-up schedule is running: the status could not be settled yet. */
	readonly checking: boolean;
	/** A mutation's deadline passed (`isStart`: it was a start, which also ends with "not started"). */
	begin(isStart: boolean): void;
	/** After a start whose outcome is unknown: resolves once a follow-up read says whether a session exists. */
	resolveStart(): Promise<StartAnswer>;
	/** Sign-out / person change: stop looking, answer every waiter "not started" and forget it all. */
	reset(): void;
	/** Stop the timers (waiters stay as they are). */
	cancel(): void;
}

export function createUnknownOutcome(opts: UnknownOutcomeOptions): UnknownOutcome {
	let checking = $state(false);
	let startUnknown = false; // the unknown outcome is a start (it also ends with "not started")
	let waiters: ((r: StartAnswer) => void)[] = [];

	function settleWaiters(result: StartAnswer) {
		const w = waiters;
		waiters = [];
		for (const resolve of w) resolve(result);
	}

	const followUp = createFollowUp({
		delays: opts.delays,
		read: async (index) => {
			const e = opts.epoch();
			await opts.reconcile();
			if (e !== opts.epoch()) return true; // forgotten: nothing left to look for
			if (opts.readFailed()) return false;
			// a start's absence is only believed on the second read: the POST may still be landing
			if (startUnknown && opts.sessionCount() === 0 && index < 1) return false;
			return true;
		},
		onRead: (ok) => {
			if (!ok) return;
			checking = false;
			if (startUnknown) settleWaiters(opts.sessionCount() > 0 ? 'started' : 'not-started');
			startUnknown = false;
		}
	});

	return {
		get checking() {
			return checking;
		},
		begin(isStart) {
			checking = true;
			if (isStart) startUnknown = true;
			followUp.start();
		},
		resolveStart() {
			if (!startUnknown)
				return Promise.resolve<StartAnswer>(opts.sessionCount() > 0 ? 'started' : 'not-started');
			return new Promise((resolve) => waiters.push(resolve));
		},
		reset() {
			followUp.cancel();
			settleWaiters('not-started');
			checking = false;
			startUnknown = false;
		},
		cancel() {
			followUp.cancel();
		}
	};
}
