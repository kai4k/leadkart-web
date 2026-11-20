import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { encodePreferences } from '#lib/features/preferences/codec.ts';
import { DEFAULT_PREFERENCES } from '#lib/features/preferences/schema.ts';
import { htmlShellHandle } from '#lib/server/html-shell.ts';

type Transform = (input: {
	html: string;
	done: boolean;
}) => string | undefined | Promise<string | undefined>;

async function run(raw: string | undefined) {
	const event = {
		cookies: { get: (n: string) => (n === 'lk_ui' ? raw : undefined) },
		locals: {} as App.Locals,
		request: new Request('http://x/')
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

const TEMPLATE = '<html lang="en" %lk.html.attrs%>';

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
});
