/**
 * When the impersonation store looks again, without being asked: follow-up reads after a mutation whose outcome is
 * unknown (it did not settle inside its deadline), and one read at the earliest expiry. Framework-free; timers are
 * injectable and all cleared by `cancel()` / `clear()`.
 */
import type { ImpersonationSessionDto } from '../types';

/** After an unknown outcome: look at 2 s, 5 s, 15 s and 30 s; the first successful read is the truth. */
export const FOLLOW_UP_DELAYS_MS = [2_000, 5_000, 15_000, 30_000] as const;

export interface FollowUpOptions {
	/** One read; true when it succeeded (the list is now known). */
	/** One read (zero-based index in the schedule); true when it settled the question, false to look again later. */
	read: (index: number) => Promise<boolean>;
	/** Called after each read of the schedule, with its zero-based index. */
	onRead?: (ok: boolean, index: number) => void;
	delays?: readonly number[];
}

export interface FollowUp {
	/** Begin the schedule (a second call while one is running keeps the running one). */
	start(): void;
	cancel(): void;
	readonly running: boolean;
}

export function createFollowUp(opts: FollowUpOptions): FollowUp {
	const delays = opts.delays ?? FOLLOW_UP_DELAYS_MS;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let running = false;
	let run = 0;

	function step(index: number, mine: number) {
		if (index >= delays.length) {
			running = false;
			return;
		}
		timer = setTimeout(() => {
			void opts.read(index).then(
				(ok) => finish(ok, index, mine),
				() => finish(false, index, mine)
			);
		}, delays[index]);
	}
	function finish(ok: boolean, index: number, mine: number) {
		if (mine !== run) return; // cancelled meanwhile
		opts.onRead?.(ok, index);
		if (ok) running = false;
		else step(index + 1, mine);
	}

	return {
		start() {
			if (running) return;
			running = true;
			run++;
			step(0, run);
		},
		cancel() {
			run++;
			running = false;
			clearTimeout(timer);
			timer = undefined;
		},
		get running() {
			return running;
		}
	};
}

const MAX_TIMER = 2 ** 31 - 1;

/** The EARLIEST `expires_at` among the listed sessions, as a time, or null when none parses. */
export function earliestExpiry(sessions: readonly ImpersonationSessionDto[]): number | null {
	let earliest: number | null = null;
	for (const s of sessions) {
		const at = Date.parse(s.expires_at);
		if (Number.isFinite(at) && (earliest === null || at < earliest)) earliest = at;
	}
	return earliest;
}

/** A read at the earliest expiry (never a hide): if the server still lists it (clock skew) the next read re-arms. */
export function createExpiryTimer(onExpiry: () => void, now: () => number) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return {
		arm(sessions: readonly ImpersonationSessionDto[]) {
			clearTimeout(timer);
			timer = undefined;
			const at = earliestExpiry(sessions);
			if (at === null || typeof window === 'undefined') return;
			const delay = Math.min(Math.max(at - now() + 1000, 5000), MAX_TIMER);
			timer = setTimeout(onExpiry, delay);
		},
		clear() {
			clearTimeout(timer);
			timer = undefined;
		}
	};
}
