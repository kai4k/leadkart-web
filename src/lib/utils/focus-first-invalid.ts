import { tick } from 'svelte';
import type { SubmitFunction } from '$app/forms';

/**
 * After a failed submit, move focus to the first invalid control so a screen reader reads THAT
 * field with its error (and a keyboard user is already there). This replaces announcing every
 * field error as its own assertive alert: six invalid fields were six interruptions.
 *
 * Invalid means `aria-invalid="true"`, which every field in `components/form` sets. A control that
 * is not itself focusable (a radio group) hands focus to its first focusable descendant. Returns
 * whether something was focused. Waits one tick so the errors have rendered.
 */
const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

export async function focusFirstInvalid(root: ParentNode | null | undefined): Promise<boolean> {
	if (!root) return false;
	await tick();
	for (const invalid of root.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
		const target = invalid.matches(FOCUSABLE)
			? invalid
			: invalid.querySelector<HTMLElement>(FOCUSABLE);
		if (!target || target.hasAttribute('disabled')) continue;
		target.focus();
		return true;
	}
	return false;
}

/**
 * `use:enhance` callback wrapper for a server-action form: after the page applies a FAILED result,
 * focus lands on the first invalid field. The wrapped callback is the form's own (its `loading`
 * flag, scope announcement, ...); it keeps working unchanged.
 */
type Input = Parameters<SubmitFunction>[0];
type Callback = Exclude<Awaited<ReturnType<SubmitFunction>>, void>;
type Outer = Parameters<Callback>[0];

export function withFocusOnFailure(submit: SubmitFunction = () => undefined): SubmitFunction {
	return (input: Input) => {
		const wrap =
			(own: Callback | void): Callback =>
			async (outer: Outer) => {
				if (own) await own(outer);
				else await outer.update();
				if (outer.result.type === 'failure') await focusFirstInvalid(input.formElement);
			};
		const returned = submit(input);
		// Stay synchronous when the form's own callback is, as the kit allows either.
		return returned instanceof Promise ? returned.then(wrap) : wrap(returned);
	};
}
