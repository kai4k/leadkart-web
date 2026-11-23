import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { formInRoot } from '../helpers/form-root.svelte.ts';
import { ValidationError } from '#lib/api/errors.ts';

/** A real <form> with the controls it "renders", as the submit event's currentTarget. */
function formWith(names: string[]) {
	const el = document.createElement('form');
	for (const name of names) {
		const input = document.createElement('input');
		input.name = name;
		el.append(input);
	}
	document.body.append(el);
	return { preventDefault: vi.fn(), currentTarget: el } as unknown as SubmitEvent;
}

const schema = z.object({
	name: z.string().min(2, 'form.tooShort'),
	hidden: z.string().min(1, 'form.required')
});
const GENERIC = 'The request was not accepted. Check the values and try again.';

describe('useForm never refuses silently', () => {
	it('a client failure on a field the form does not render says so in the banner', async () => {
		const { form } = formInRoot(schema, { name: 'Asha', hidden: '' });
		await form.submit(formWith(['name']), vi.fn());
		expect(form.bannerError).toBe(GENERIC);
	});

	it('a client failure on a rendered field adds no banner (the field says it)', async () => {
		const { form } = formInRoot(schema, { name: 'A', hidden: 'x' });
		await form.submit(formWith(['name', 'hidden']), vi.fn());
		expect(form.errors.name).toBeDefined();
		expect(form.bannerError).toBeNull();
	});

	it('a root-level error (an unknown key of a strict schema) reaches the banner', async () => {
		const strict = z.object({ name: z.string() }).strict();
		const { form } = formInRoot(strict, { name: 'Asha', extra: 1 } as never);
		await form.submit(formWith(['name']), vi.fn());
		expect(form.bannerError).toBe(GENERIC);
	});

	it('the server branch uses the same rule: a field not rendered reaches the banner', async () => {
		const { form } = formInRoot(schema, { name: 'Asha', hidden: 'x' });
		const refuse = vi.fn().mockRejectedValue(new ValidationError({ hidden: 'too_long' }, 422));
		await form.submit(formWith(['name']), refuse);
		expect(form.bannerError).toBe(GENERIC);
		expect(form.errors.hidden).toBeUndefined();
	});
});
