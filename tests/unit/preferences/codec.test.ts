import { describe, expect, it } from 'vitest';
import {
	decodePreferences,
	encodePreferences,
	htmlAttributes,
	PREFERENCES_COOKIE_VERSION
} from '#lib/features/preferences/codec.ts';
import { DEFAULT_PREFERENCES } from '#lib/features/preferences/schema.ts';

const b64 = (s: string) => btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const v2 = (fields: Record<string, unknown>) => b64(JSON.stringify({ v: 2, ...fields }));

describe('preferences codec', () => {
	it('is at cookie version 2', () => {
		expect(PREFERENCES_COOKIE_VERSION).toBe(2);
	});
	it('round-trips every axis', () => {
		const p = {
			layout: 'semibox',
			navType: 'floating',
			contentWidth: 'fluid',
			sidebar: 'small',
			mode: 'dark',
			palette: 'emerald',
			sidebarColors: 'sky',
			dock: 'side',
			autoHideDock: 'on',
			density: 'compact',
			transparency: 'off'
		} as const;
		expect(decodePreferences(encodePreferences(p))).toEqual(p);
	});
	it('stays under 340 bytes for the longest values, well inside the 400-character decode cap', () => {
		const p = {
			layout: 'horizontal',
			navType: 'floating',
			contentWidth: 'default',
			sidebar: 'medium',
			mode: 'auto',
			palette: 'emerald',
			sidebarColors: 'purple',
			dock: 'bottom',
			autoHideDock: 'off',
			density: 'comfortable',
			transparency: 'reduced'
		} as const;
		// 11 axes (the five layout axes leave with the sidebar); the decoder rejects anything over 400
		expect(`lk_ui=${encodePreferences(p)}`.length).toBeLessThanOrEqual(340);
		expect(encodePreferences(p).length).toBeLessThan(400);
	});
	it('decodes a v1 cookie to defaults', () => {
		const v1 = b64(JSON.stringify({ v: 1, colors: 'teal', mode: 'dark' }));
		expect(decodePreferences(v1)).toEqual(DEFAULT_PREFERENCES);
	});
	it.each([undefined, 0, 3, '2', null])('decodes a payload with v=%s to defaults', (v) => {
		expect(decodePreferences(b64(JSON.stringify({ v, mode: 'dark' })))).toEqual(
			DEFAULT_PREFERENCES
		);
	});
	it('drops removed values per field', () => {
		const raw = v2({ palette: 'teal', mode: 'black-white', dock: 'side' });
		expect(decodePreferences(raw)).toEqual({ ...DEFAULT_PREFERENCES, dock: 'side' });
	});
	it.each([undefined, null, '', '%%%not-base64', b64('not json'), b64('[1,2]'), 'x'.repeat(401)])(
		'falls back to defaults for %s',
		(raw) => expect(decodePreferences(raw as string)).toEqual(DEFAULT_PREFERENCES)
	);
	it('returns a fresh object for every bad cookie, so one request cannot change the next', () => {
		const a = decodePreferences(b64('[1,2]'));
		const b = decodePreferences(b64('[1,2]'));
		expect(a).not.toBe(b);
		expect(a).not.toBe(DEFAULT_PREFERENCES);
		(a as { mode: string }).mode = 'dark';
		expect(decodePreferences(b64('[1,2]'))).toEqual(DEFAULT_PREFERENCES);
		expect(DEFAULT_PREFERENCES.mode).toBe('light');
	});
	it('falls back per field and ignores unknown keys', () => {
		const raw = v2({ mode: 'dark', palette: 'blue', layout: '"><script>', extra: 1 });
		expect(decodePreferences(raw)).toEqual({ ...DEFAULT_PREFERENCES, mode: 'dark' });
	});
	it('ignores wrong-typed values and a __proto__ key', () => {
		const raw = b64(
			'{"v":2,"__proto__":{"mode":"dark"},"mode":{"x":1},"layout":["vertical"],"palette":null}'
		);
		expect(decodePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
	});
	it('rejects an oversized (401+ character) but otherwise valid cookie', () => {
		const long = v2({ mode: 'dark', pad: 'y'.repeat(600) });
		expect(long.length).toBeGreaterThan(400);
		expect(decodePreferences(long)).toEqual(DEFAULT_PREFERENCES);
	});
	it('htmlAttributes writes data-palette, data-dock, data-dock-autohide, data-density and no data-colors/data-dark-palette', () => {
		const attrs = htmlAttributes(DEFAULT_PREFERENCES);
		expect(attrs).toBe(
			'data-layout="vertical" data-nav-type="default" data-content-width="default" data-sidebar="large" ' +
				'data-mode="light" data-palette="iris" data-sidebar-colors="light" data-dock="bottom" ' +
				'data-dock-autohide="off" data-density="comfortable" data-transparency="glass"'
		);
		expect(attrs).not.toContain('data-colors');
		expect(attrs).not.toContain('data-dark-palette');
	});
	it('transparency round-trips for each value, and the default is glass', () => {
		for (const transparency of ['glass', 'reduced', 'off'] as const)
			expect(
				decodePreferences(encodePreferences({ ...DEFAULT_PREFERENCES, transparency }))
			).toEqual({
				...DEFAULT_PREFERENCES,
				transparency
			});
		expect(DEFAULT_PREFERENCES.transparency).toBe('glass');
	});
	it('a v2 cookie written before a field existed decodes that field to its default', () => {
		const old = v2({
			layout: 'semibox',
			mode: 'dark',
			palette: 'coral'
		});
		expect(decodePreferences(old)).toEqual({
			...DEFAULT_PREFERENCES,
			layout: 'semibox',
			mode: 'dark',
			palette: 'coral'
		});
	});
	it.each([
		'<script>',
		'"><img src=x onerror=1>',
		'OFF',
		'solid',
		'tinted',
		' glass',
		'',
		null,
		1,
		['off'],
		{ a: 1 }
	])(
		'a hostile or unknown transparency %j falls back to glass and nothing else changes',
		(value) => {
			const decoded = decodePreferences(v2({ mode: 'dark', transparency: value }));
			expect(decoded).toEqual({ ...DEFAULT_PREFERENCES, mode: 'dark' });
			expect(htmlAttributes(decoded)).toContain('data-transparency="glass"');
		}
	);
	it('emits only enum members whatever hostile text every field carried', () => {
		const hostile = ['"><script>alert(1)</script>', 'a b', "x' onload='1", '\u0000', 'DARK '];
		for (const h of hostile) {
			const raw = v2({
				layout: h,
				navType: h,
				contentWidth: h,
				sidebar: h,
				mode: h,
				palette: h,
				sidebarColors: h,
				dock: h,
				autoHideDock: h,
				density: h,
				transparency: h
			});
			const decoded = decodePreferences(raw);
			expect(decoded).toEqual(DEFAULT_PREFERENCES);
			const attrs = htmlAttributes(decoded);
			expect(attrs).not.toMatch(/[<>']/);
			expect(attrs.match(/="/g)).toHaveLength(11);
		}
	});
});
