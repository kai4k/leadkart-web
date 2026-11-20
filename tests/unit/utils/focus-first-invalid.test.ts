import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusFirstInvalid, withFocusOnFailure } from '#lib/utils/focus-first-invalid.ts';

afterEach(() => {
	document.body.innerHTML = '';
});

const html = (inner: string) => {
	const form = document.createElement('form');
	form.innerHTML = inner;
	document.body.append(form);
	return form;
};

describe('focusFirstInvalid', () => {
	it('focuses the first aria-invalid control and returns true', async () => {
		const form = html(
			'<input id="a" /><input id="b" aria-invalid="true" /><input id="c" aria-invalid="true" />'
		);
		expect(await focusFirstInvalid(form)).toBe(true);
		expect(document.activeElement?.id).toBe('b');
	});

	it('hands focus to the first focusable descendant of a group that is not focusable itself', async () => {
		const form = html(
			'<div role="radiogroup" aria-invalid="true"><input type="radio" id="r1" /><input type="radio" id="r2" /></div>'
		);
		expect(await focusFirstInvalid(form)).toBe(true);
		expect(document.activeElement?.id).toBe('r1');
	});

	it('skips a disabled control and returns false when nothing is invalid', async () => {
		const form = html(
			'<input id="a" aria-invalid="true" disabled /><input id="b" aria-invalid="true" />'
		);
		await focusFirstInvalid(form);
		expect(document.activeElement?.id).toBe('b');
		expect(await focusFirstInvalid(html('<input />'))).toBe(false);
		expect(await focusFirstInvalid(null)).toBe(false);
	});
});

describe('withFocusOnFailure (server-action forms)', () => {
	const run = async (resultType: string, inner?: () => unknown) => {
		const form = html('<input id="x" aria-invalid="true" />');
		const update = vi.fn().mockResolvedValue(undefined);
		const submit = withFocusOnFailure(inner as never);
		const callback = (await submit({ formElement: form } as never)) as (
			o: unknown
		) => Promise<void>;
		await callback({ result: { type: resultType }, update });
		return { update };
	};

	it('focuses the first invalid field after a FAILED result and still runs update', async () => {
		const { update } = await run('failure');
		expect(update).toHaveBeenCalled();
		expect(document.activeElement?.id).toBe('x');
	});

	it('moves no focus after a success or a redirect', async () => {
		await run('success');
		expect(document.activeElement?.id).not.toBe('x');
	});

	it("runs the form's own callback in place of the default update", async () => {
		const own = vi.fn().mockResolvedValue(undefined);
		const { update } = await run('failure', () => own);
		expect(own).toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
		expect(document.activeElement?.id).toBe('x');
	});
});

describe('a failure that is not a field (fix round B)', () => {
	it('focuses the form-level alert when nothing is invalid, and keeps its role', async () => {
		const form = html(
			'<div role="alert" id="banner">Too many attempts</div><button disabled>Save</button>'
		);
		expect(await focusFirstInvalid(form)).toBe(true);
		const banner = document.getElementById('banner')!;
		expect(document.activeElement).toBe(banner);
		expect(banner.getAttribute('role')).toBe('alert');
		expect(banner.getAttribute('tabindex')).toBe('-1');
	});

	it('prefers an invalid field over the alert', async () => {
		const form = html('<div role="alert"></div><input id="f" aria-invalid="true" />');
		await focusFirstInvalid(form);
		expect(document.activeElement?.id).toBe('f');
	});

	it('inside a dialog, finds the alert in the overlay when it sits outside the form', async () => {
		const dialog = document.createElement('div');
		dialog.setAttribute('role', 'dialog');
		dialog.innerHTML =
			'<div role="alert" id="ob">Session expired</div><form id="fm"><button disabled>Go</button></form>';
		document.body.append(dialog);
		document.body.insertAdjacentHTML('beforeend', '<div role="alert" id="elsewhere">page</div>');
		expect(await focusFirstInvalid(dialog.querySelector('form'))).toBe(true);
		expect(document.activeElement?.id).toBe('ob');
	});

	it('returns false and moves nothing when there is neither', async () => {
		expect(await focusFirstInvalid(html('<input />'))).toBe(false);
	});

	it('withFocusOnFailure falls back to the alert after a failed result with no field error', async () => {
		const form = html('<div role="alert" id="b2">Server said no</div>');
		const update = vi.fn().mockResolvedValue(undefined);
		const callback = (await withFocusOnFailure()({ formElement: form } as never)) as (
			o: unknown
		) => Promise<void>;
		await callback({ result: { type: 'failure' }, update });
		expect(document.activeElement?.id).toBe('b2');
	});
});

describe('the form error banner wins over a static warning (fix round C)', () => {
	it('focuses [data-form-error], not an earlier role=alert warning', async () => {
		const form = html(
			'<div role="alert" id="warn">This permanently writes off the batch</div>' +
				'<div role="alert" data-form-error id="err">Could not write off</div>'
		);
		expect(await focusFirstInvalid(form)).toBe(true);
		expect(document.activeElement?.id).toBe('err');
	});

	it('still falls back to a plain role=alert when no banner is marked', async () => {
		const form = html('<div role="alert" id="only">Session expired</div>');
		expect(await focusFirstInvalid(form)).toBe(true);
		expect(document.activeElement?.id).toBe('only');
	});
});
