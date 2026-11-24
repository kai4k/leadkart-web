import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import type { z } from 'zod';
import { codeCopy } from '#lib/api/code-copy.ts';
import { fieldErrorCopy, fieldErrorsCopy } from '#lib/utils/field-error-copy.ts';

/**
 * A refusal a form cannot show on a field must still be SAID: an error (client or server) on a name the form does not
 * render, or a root-level one (an unknown key of a strict schema), reads as the banner. One rule for both branches of
 * `useForm.submit`, so a submit never refuses in silence.
 */
type Problems = { errors: Record<string, string>; banner: string | null };

const renderedNames = (formEl: HTMLElement | null): string[] | null =>
	formEl
		? [...formEl.querySelectorAll<HTMLElement>('[name]')].map((e) => e.getAttribute('name') ?? '')
		: null;

// not describeError: a ValidationError with fields reads "Check the highlighted fields.", true only for the rendered ones
const line = (code?: string): string => codeCopy(code) ?? get(_)('auth.errors.validation');

/** The schema refused the values: field messages, plus the banner when one has no control or is root-level. */
export function clientProblems(error: z.ZodError, formEl: HTMLElement | null): Problems {
	const flat = error.flatten();
	const errors: Record<string, string> = {};
	for (const [field, messages] of Object.entries(flat.fieldErrors as Record<string, string[]>)) {
		if (messages[0]) errors[field] = fieldErrorCopy(messages[0]);
	}
	const rendered = renderedNames(formEl);
	const orphan = rendered !== null && Object.keys(errors).some((f) => !rendered.includes(f));
	return { errors, banner: flat.formErrors.length > 0 || orphan ? line() : null };
}

/** The API refused fields: those the form renders keep their message; any other is said in the banner instead. */
export function serverProblems(
	fields: Record<string, string>,
	code: string | undefined,
	formEl: HTMLElement | null
): Problems {
	const all = fieldErrorsCopy(fields) as Record<string, string>;
	const rendered = renderedNames(formEl);
	if (rendered === null || Object.keys(fields).every((f) => rendered.includes(f))) {
		return { errors: all, banner: null };
	}
	const shown = Object.entries(all).filter(([f]) => rendered.includes(f));
	return { errors: Object.fromEntries(shown), banner: line(code) };
}
