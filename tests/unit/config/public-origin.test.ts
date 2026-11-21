import { describe, expect, it } from 'vitest';
import { checkedPublicOrigin, isPublicOrigin } from '#lib/config/public-origin.ts';
import { variables } from '../../../src/env.ts';

/**
 * PUBLIC_SITE_URL is substituted UNESCAPED into src/app.html (kit write_server.js), so the rule lives where the rendered
 * value is produced (src/env.ts) and is shared with the production start-up check (src/lib/server/config.ts).
 */
const GOOD = [
	'https://app.example.com',
	'https://a.example',
	'http://localhost:4173',
	'https://app.example.com:8443',
	'https://xn--mnchen-3ya.example', // an IDN is written as punycode
	'https://a-b.c-d.example'
];
const HOSTILE: Array<[string, string]> = [
	['an attribute break-out', '"><script>alert(1)</script>'],
	['a quote after a valid origin', 'https://a.example/"onload=alert(1)'],
	['a quote right after the host', 'https://a.example"onload=x'],
	['a path', 'https://a.example/path'],
	['a trailing slash', 'https://app.example.com/'],
	['credentials', 'https://user:pw@a.example'],
	['a protocol-relative URL', '//a.example'],
	['a javascript: URL', ['java', 'script:alert(1)'].join('')],
	['a data: URL', 'data:text/html,<script>1</script>'],
	['an upper-case scheme', 'HTTPS://a.example'],
	['an upper-case host', 'https://A.example'],
	['an IDN written in Unicode', 'https://münchen.example'],
	['a query', 'https://a.example?x=1'],
	['a fragment', 'https://a.example#x'],
	['whitespace', ' https://a.example'],
	['an embedded newline', 'https://a.example\n'],
	['an ampersand', 'https://a.example&x=1'],
	['an angle bracket', 'https://a.example<'],
	['a backslash', 'https://a.example\\x'],
	['a non-numeric port', 'https://a.example:abc'],
	['an IPv6 literal', 'https://[::1]'],
	['a bare host', 'a.example'],
	['an empty string', ''],
	['a different scheme', 'ftp://a.example']
];

describe('isPublicOrigin', () => {
	it.each(GOOD)('accepts %s', (v) => expect(isPublicOrigin(v)).toBe(true));
	it.each(HOSTILE)('refuses %s', (_name, v) => expect(isPublicOrigin(v)).toBe(false));
	it('refuses a non-string', () => {
		for (const v of [undefined, null, 1, {}, ['https://a.example']])
			expect(isPublicOrigin(v)).toBe(false);
	});
});

const NOT_EMPTY = HOSTILE.filter(([, v]) => v !== '');

describe('checkedPublicOrigin: an origin or nothing, never a silent drop', () => {
	it.each(GOOD)('passes %s through', (v) => expect(checkedPublicOrigin(v)).toBe(v));
	it('unset and empty are allowed (config.ts requires a value in production)', () => {
		expect(checkedPublicOrigin(undefined)).toBe('');
		expect(checkedPublicOrigin('')).toBe('');
	});
	it.each(NOT_EMPTY)('throws for %s, naming the variable and the shape', (_name, v) => {
		expect(() => checkedPublicOrigin(v)).toThrow(
			'PUBLIC_SITE_URL must be a bare origin (e.g. https://app.example.com)'
		);
	});
	it('never echoes more than the first 60 characters of the bad value', () => {
		const long = `https://a.example/${'x'.repeat(500)}`;
		const msg = (() => {
			try {
				checkedPublicOrigin(long);
			} catch (e) {
				return (e as Error).message;
			}
			return '';
		})();
		expect(msg).toContain(long.slice(0, 60));
		expect(msg).not.toContain(long.slice(0, 61));
		expect(msg.length).toBeLessThan(400);
	});
});

describe('the src/env.ts schema, as the server runs it (defineEnvVars wraps it as a standard schema)', () => {
	const validate = (input: unknown) =>
		(
			variables.PUBLIC_SITE_URL.schema as unknown as {
				'~standard': {
					validate(v: unknown): { value?: string; issues?: ReadonlyArray<{ message: string }> };
				};
			}
		)['~standard'].validate(input);
	it.each(GOOD)('renders %s as is', (v) => expect(validate(v).value).toBe(v));
	it('renders an unset or empty variable as empty', () => {
		expect(validate(undefined).value).toBe('');
		expect(validate('').value).toBe('');
	});
	it.each(NOT_EMPTY)(
		'reports an issue (start-up fails) for %s, never a rendered value',
		(_name, v) => {
			const out = validate(v);
			expect(out.value).toBeUndefined();
			expect(out.issues?.[0]?.message).toContain('PUBLIC_SITE_URL must be a bare origin');
		}
	);
	it('the public variable is marked public (it is rendered into app.html)', () => {
		expect(variables.PUBLIC_SITE_URL.public).toBe(true);
	});
});
