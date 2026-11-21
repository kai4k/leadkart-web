/**
 * `createDialogState` — the open flag and the record a dialog, sheet or drawer acts on, in one place.
 *
 * Replaces the `let open = $state(false); let target = $state(null);` pair and its hand-written
 * `onOpenChange={(o) => { open = o; if (!o) target = null; }}` handler:
 *
 *   const confirm = createDialogState<UserDto>();
 *   <Button onclick={() => confirm.show(user)}>…
 *   <DeactivateUserDialog bind:open={confirm.open} user={confirm.target} onOpenChange={confirm.onOpenChange} />
 *
 * Closing clears the target, so a dialog never renders the previous record when it opens for a new one.
 */
export interface DialogState<T> {
	open: boolean;
	readonly target: T | null;
	/** Open the dialog, on `target` when the dialog acts on a record. */
	show(target?: T): void;
	close(): void;
	/** For `onOpenChange`: opening keeps the target, closing clears it. */
	onOpenChange(open: boolean): void;
}

export function createDialogState<T = never>(): DialogState<T> {
	let open = $state(false);
	let target = $state<T | null>(null);

	function close() {
		open = false;
		target = null;
	}

	return {
		get open() {
			return open;
		},
		set open(next: boolean) {
			if (next) open = true;
			else close();
		},
		get target() {
			return target;
		},
		show(next?: T) {
			target = next ?? null;
			open = true;
		},
		close,
		onOpenChange(next: boolean) {
			if (next) open = true;
			else close();
		}
	};
}
