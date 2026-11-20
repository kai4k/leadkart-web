import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { encodePreferences } from '#lib/features/preferences/codec.ts';
import { DEFAULT_PREFERENCES } from '#lib/features/preferences/schema.ts';
import { htmlShellHandle } from '#lib/server/html-shell.ts';

type Transform = (input: {
	html: string;
	done: boolean;
}) => string | undefined | Promise<string | undefined>;

async function run(raw: string | undefined, acceptLanguage?: string) {
	const event = {
		cookies: { get: (n: string) => (n === 'lk_ui' ? raw : undefined) },
		locals: {} as App.Locals,
		request: new Request(
			'http://x/',
			acceptLanguage ? { headers: { 'accept-language': acceptLanguage } } : {}
		)
	} as unknown as RequestEvent;
	let transform: Transform | undefined;
	await htmlShellHandle({
		event,
		resolve: (_e: RequestEvent, opts?: { transformPageChunk?: Transform }) => {
			transform = opts?.transformPageChunk;
			return Promise.resolve(new Response('ok'));
		}
	});
	return {
		event,
		html: (s: string) => Promise.resolve(transform?.({ html: s, done: true }))
	};
}

const TEMPLATE = '<html lang="%lk.html.lang%" %lk.html.attrs%>';

describe('htmlShellHandle', () => {
	it('decodes the cookie into locals and writes the attributes', async () => {
		const prefs = { ...DEFAULT_PREFERENCES, layout: 'semibox', mode: 'dark' } as const;
		const { event, html } = await run(encodePreferences(prefs));
		expect(event.locals.preferences).toEqual(prefs);
		const out = (await html(TEMPLATE)) ?? '';
		expect(out).toContain('<html lang="en" data-layout="semibox"');
		expect(out).toContain('data-mode="dark"');
		expect(out).not.toContain('%lk.html.attrs%');
	});
	it('renders defaults and no markup for a hostile cookie', async () => {
		const { event, html } = await run('"><script>alert(1)</script>');
		expect(event.locals.preferences).toEqual(DEFAULT_PREFERENCES);
		const out = (await html(TEMPLATE)) ?? '';
		expect(out).not.toContain('<script');
		expect(out).toContain('data-layout="vertical"');
	});
	it('does not interpret $ sequences in the page chunk', async () => {
		const { html } = await run(undefined);
		expect(await html('<html %lk.html.attrs%><body>$&</body>')).toContain('<body>$&</body>');
	});
	it('works with no cookie at all', async () => {
		const { event } = await run(undefined);
		expect(event.locals.preferences).toEqual(DEFAULT_PREFERENCES);
	});

	describe('locale', () => {
		it('negotiates Accept-Language into <html lang> and locals', async () => {
			const { event, html } = await run(undefined, 'hi-IN,hi;q=0.9,en;q=0.8');
			expect(event.locals.locale).toBe('hi');
			expect(await html(TEMPLATE)).toContain('<html lang="hi" data-layout="vertical"');
		});
		it('defaults to en with no header or an unsupported language', async () => {
			for (const header of [undefined, 'fr-FR,de;q=0.8']) {
				const { event, html } = await run(undefined, header);
				expect(event.locals.locale).toBe('en');
				expect(await html(TEMPLATE)).toContain('<html lang="en" ');
			}
		});
		it('writes only a supported tag into the page, whatever the header carried', async () => {
			const { html } = await run(undefined, '"><script>alert(1)</script>');
			const out = (await html(TEMPLATE)) ?? '';
			expect(out).toContain('lang="en"');
			expect(out).not.toContain('<script');
		});
		it('keeps the locale of each concurrent request separate', async () => {
			const runs = await Promise.all(
				Array.from({ length: 20 }, (_, i) => run(undefined, i % 2 ? 'hi' : 'en'))
			);
			for (const [i, r] of runs.entries()) {
				const expected = i % 2 ? 'hi' : 'en';
				expect(r.event.locals.locale).toBe(expected);
				expect(await r.html(TEMPLATE)).toContain(`<html lang="${expected}" `);
			}
		});
	});
});
