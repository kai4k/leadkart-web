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
