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
		expect(out).toContain('data-palette="iris"');
		expect(out).toContain('data-dock="bottom"');
		expect(out).not.toContain('%lk.html.attrs%');
	});
	it('a v1 cookie (a removed axis, an old colour) renders the defaults', async () => {
		const v1 = btoa(JSON.stringify({ v: 1, layout: 'horizontal', colors: 'teal', mode: 'dark' }))
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replace(/=+$/, '');
		const { event, html } = await run(v1);
		expect(event.locals.preferences).toEqual(DEFAULT_PREFERENCES);
		const out = (await html(TEMPLATE)) ?? '';
		expect(out).toContain('data-layout="vertical"');
		expect(out).toContain('data-palette="iris"');
		expect(out).not.toContain('data-colors');
	});
	it('writes data-transparency from the validated enum, and glass for anything else', async () => {
		for (const transparency of ['glass', 'reduced', 'off'] as const) {
			const { html } = await run(encodePreferences({ ...DEFAULT_PREFERENCES, transparency }));
			expect(await html(TEMPLATE)).toContain(`data-transparency="${transparency}"`);
		}
		const hostile = btoa(JSON.stringify({ v: 2, transparency: '"><script>alert(1)</script>' }))
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replace(/=+$/, '');
		const out = (await (await run(hostile)).html(TEMPLATE)) ?? '';
		expect(out).toContain('data-transparency="glass"');
		expect(out).not.toContain('<script');
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
	it('fills the placeholders only inside the opening <html> tag', async () => {
		const { html } = await run(undefined);
		const body = '<body>%lk.html.attrs% and %lk.html.lang%</body>';
		// The tag is filled; the same text later in the chunk (a title, a name) is page content.
		const out = (await html(`<!doctype html>\n${TEMPLATE}<head></head>${body}`)) ?? '';
		expect(out).toContain('<html lang="en" data-layout="vertical"');
		expect(out).toContain(body);
		// A chunk with no <html> tag, or one whose tag carries no placeholder, is left alone.
		expect(await html(body)).toBe(body);
		expect(await html(`<html lang="en">${body}`)).toBe(`<html lang="en">${body}`);
	});
	it('works with no cookie at all', async () => {
		const { event } = await run(undefined);
		expect(event.locals.preferences).toEqual(DEFAULT_PREFERENCES);
	});

	describe('locale', () => {
		it('serves English to a Hindi browser while only English is enabled (L46)', async () => {
			const { event, html } = await run(undefined, 'hi-IN,hi;q=0.9,en;q=0.8');
			expect(event.locals.locale).toBe('en');
			expect(await html(TEMPLATE)).toContain('<html lang="en" data-layout="vertical"');
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
		it('gives every concurrent request its own tag (all English while hi is disabled)', async () => {
			const runs = await Promise.all(
				Array.from({ length: 20 }, (_, i) => run(undefined, i % 2 ? 'hi' : 'en'))
			);
			for (const r of runs) {
				expect(r.event.locals.locale).toBe('en');
				expect(await r.html(TEMPLATE)).toContain('<html lang="en" ');
			}
		});
	});
});
