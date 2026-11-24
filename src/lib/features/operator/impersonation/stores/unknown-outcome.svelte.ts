/**
 * What the impersonation store does after a mutation whose outcome is UNKNOWN (it did not settle inside its deadline):
 * it looks again on a schedule (`schedule.ts`) until one read tells the truth, and tells whoever is waiting for the
 * answer of a START whether the session exists. The store feeds it the facts (a read, whether it failed, how many
 * sessions are listed); it owns `checking` and the waiters.
 */
import { createFollowUp, FOLLOW_UP_DELAYS_MS } from './schedule';

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

/**
 * What a start came to. `not-started` needs a SUCCESSFUL read that does not list the session; when every read failed
 * nothing is known, and the answer is `unknown` (the session may exist).
 */
type StartAnswer = 'started' | 'not-started' | 'unknown';

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
	let verdictGiven = false; // the modal was told "not started"; later reads still look
	let noRead = false; // every read failed and no session is listed: the start's outcome is not known
	let waiters: ((r: StartAnswer) => void)[] = [];

	function settleWaiters(result: StartAnswer) {
		const w = waiters;
		waiters = [];
		for (const resolve of w) resolve(result);
	}

	const delays = opts.delays ?? FOLLOW_UP_DELAYS_MS;
	const followUp = createFollowUp({
		delays,
		read: async (index) => {
			const e = opts.epoch();
			await opts.reconcile();
			if (e !== opts.epoch()) return true; // forgotten: nothing left to look for
			if (opts.readFailed()) return false;
			if (!startUnknown) return true;
			if (opts.sessionCount() > 0) return true;
			// a start's absence is only believed on the second read: the POST may still be landing
			if (index < 1) return false;
			// the MODAL gets its verdict now ("did not start"), but the server may commit later: the later reads keep
			// running and a session they list is shown; the status stays unsettled until the last one answers
			verdictGiven = true;
			settleWaiters('not-started');
			return index >= delays.length - 1;
		},
		onRead: (ok) => {
			if (!ok) return;
			noRead = false;
			checking = false;
			if (startUnknown) settleWaiters(opts.sessionCount() > 0 ? 'started' : 'not-started');
			startUnknown = false;
		},
		// every read failed: nobody keeps waiting; the banner still says the status is unknown and offers Retry
		onExhausted: () => {
			// no read ever answered: "did not start" would be a guess on an audited security action
			noRead = !verdictGiven && opts.sessionCount() === 0;
			settleWaiters(noRead ? 'unknown' : 'not-started');
			checking = false;
			startUnknown = false;
		}
	});

	return {
		get checking() {
			return checking;
		},
		begin(isStart) {
			checking = true;
			noRead = false;
			if (isStart) {
				startUnknown = true;
				verdictGiven = false;
			}
			followUp.start();
		},
		resolveStart() {
			if (!startUnknown || verdictGiven)
				return Promise.resolve<StartAnswer>(
					opts.sessionCount() > 0 ? 'started' : noRead ? 'unknown' : 'not-started'
				);
			return new Promise((resolve) => waiters.push(resolve));
		},
		reset() {
			followUp.cancel();
			settleWaiters('not-started');
			checking = false;
			startUnknown = false;
			verdictGiven = false;
			noRead = false;
		},
		cancel() {
			followUp.cancel();
		}
	};
}
