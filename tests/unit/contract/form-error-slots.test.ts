import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every named control of a form a server can answer with field errors must have a place to show one.
 * Walks every .svelte file under src that renders an ActionForm / FormSheet / FormDialog /
 * TenantSectionForm and checks each named field component carries `error=` (or the `{error}` shorthand).
 * A control with no error slot is a place a server message vanishes (or lands in a generic banner).
 */
const ROOT = join(process.cwd(), 'src');
const FIELDS = [
	'TextField',
	'PasswordField',
	'TextareaField',
	'NumberInput',
	'Select',
	'Combobox',
	'Switch',
	'DatePicker',
	'DateRangePicker',
	'TagInput',
	'RadioGroup',
	'FileDropZone'
];
const SURFACES = /<(ActionForm|FormSheet|FormDialog|TenantSectionForm)\b/;

/** Controls that carry a `name` but are not submitted fields a server error is keyed by, with the reason. */
const EXEMPT: Record<string, string> = {
	'routes/(dev)/styleguide/Overlays.svelte:DatePicker followup':
		'dev-only styleguide demo: the sheet posts nowhere, no server answers it'
};

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (p.endsWith('.svelte') && !p.endsWith('.stories.svelte')) out.push(p);
	}
	return out;
}

/** The opening tags of `<Name ... >`, braces and quotes respected. */
function openingTags(source: string, names: string[]): { name: string; tag: string }[] {
	const found: { name: string; tag: string }[] = [];
	const re = new RegExp(`<(${names.join('|')})(?=[\\s/>])`, 'g');
	for (let m = re.exec(source); m; m = re.exec(source)) {
		let i = m.index + m[0].length;
		let depth = 0;
		let quote = '';
		for (; i < source.length; i++) {
			const c = source[i];
			if (quote) {
				if (c === quote) quote = '';
			} else if (depth === 0 && (c === '"' || c === "'")) quote = c;
			else if (c === '{') depth++;
			else if (c === '}') depth--;
			else if (c === '>' && depth === 0) break;
		}
		found.push({ name: m[1], tag: source.slice(m.index, i + 1) });
	}
	return found;
}

const hasName = (tag: string) => /\sname=/.test(tag) || /\s\{name\}/.test(tag);
const hasErrorSlot = (tag: string) => /\serror=/.test(tag) || /\s\{error\}/.test(tag);

/** The expression of `error={...}` (balanced braces), or null for the `{error}` shorthand / no slot. */
function errorExpression(tag: string): string | null {
	const at = tag.search(/\serror=\{/);
	if (at < 0) return null;
	let depth = 0;
	for (let i = tag.indexOf('{', at); i < tag.length; i++) {
		if (tag[i] === '{') depth++;
		else if (tag[i] === '}' && --depth === 0) return tag.slice(tag.indexOf('{', at) + 1, i);
	}
	return null;
}
const controlName = (tag: string) => /\sname="([^"]+)"/.exec(tag)?.[1];
/**
 * Controls whose server action keys its failure by a SHORT name, not the control's `name` (the account forms'
 * `failForm` answers `current` / `new` / `confirm` / `email`). Listed exactly, so another mismatch still fails.
 */
const KEY_ALIASES: Record<string, string[]> = {
	new_email: ['email'],
	current_password: ['current'],
	new_password: ['new'],
	confirm_password: ['confirm']
};
/** A slot bound to ANOTHER control's key would show the right message on the wrong field. */
const boundToOwnKey = (tag: string) => {
	const name = controlName(tag);
	const expr = errorExpression(tag);
	if (!name || expr === null) return true; // a computed name, or the {error} shorthand: nothing to compare
	const own = name.split('.').pop()!;
	return expr.includes(own) || (KEY_ALIASES[name] ?? []).some((key) => expr.includes(`'${key}'`));
};

/** Slots that name no key of their own, with the reason (their error is not a server field error). */
const OWN_KEY_EXEMPT: Record<string, string> = {
	confirm_text: 'the type-to-confirm field shows a local mismatch, never a server field'
};

describe('the slot check itself rejects a wrong key', () => {
	it('a swapped binding is found, a right one is not', () => {
		const swapped = `<Switch name="require_uppercase" error={fieldError('password_policy.require_lowercase')} />`;
		const right = `<Switch name="require_uppercase" error={fieldError('password_policy.require_uppercase')} />`;
		const nested = `<TextField name="address.city" error={fieldError('address.street')} />`;
		expect(boundToOwnKey(swapped)).toBe(false);
		expect(boundToOwnKey(right)).toBe(true);
		expect(boundToOwnKey(nested)).toBe(false);
		expect(boundToOwnKey(nested.replace('street', 'city'))).toBe(true);
	});
});

describe('every named control of a form has an error slot', () => {
	const files = walk(ROOT).filter((f) => SURFACES.test(readFileSync(f, 'utf8')));

	it('finds the form callers', () => {
		expect(files.length).toBeGreaterThanOrEqual(14);
	});

	for (const file of files) {
		const rel = relative(ROOT, file).replaceAll('\\', '/');
		it(rel, () => {
			const source = readFileSync(file, 'utf8');
			const missing = openingTags(source, FIELDS)
				.filter(({ tag }) => hasName(tag) && !hasErrorSlot(tag))
				.map(({ name, tag }) => `${name} ${/name="?\{?([^"\s}]+)/.exec(tag)?.[1] ?? '?'}`)
				.filter((id) => !(`${rel}:${id}` in EXEMPT));
			expect(missing).toEqual([]);
			// and the slot reads THIS control's key (form.errors.<name>, fieldError('<name>'), ...)
			const wrong = openingTags(source, FIELDS)
				.filter(({ tag }) => hasName(tag) && hasErrorSlot(tag) && !boundToOwnKey(tag))
				.map(({ name, tag }) => `${name} ${controlName(tag)} -> ${errorExpression(tag)}`)
				.filter((id) => !Object.keys(OWN_KEY_EXEMPT).some((k) => id.includes(` ${k} `)));
			expect(wrong, 'an error slot bound to another control').toEqual([]);
		});
	}
});
