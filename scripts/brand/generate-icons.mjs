#!/usr/bin/env node
/**
 * Static brand icons, generated from the Iris tokens and the LK "Two Cuts" geometry.
 *
 *   node scripts/brand/generate-icons.mjs            write the assets
 *   node scripts/brand/generate-icons.mjs --check    exit 1 when any asset has drifted
 *   --out <dir>                                      write/check <dir>/static and <dir>/src/app.html (default: the repo)
 *
 * Writes static/favicon.svg, favicon.ico, favicon-{16x16,32x32}.png, android-chrome-{192x192,512x512}.png,
 * apple-touch-icon.png, maskable-512x512.png, mstile-{150x150,310x310}.png; the manifest's `theme_color` and
 * `background_color`; and `src/app.html`'s `theme-color` and `msapplication-TileColor`.
 *
 * Nothing here has a colour of its own. The colours are resolved from src/styles/theme/*.css (the contrast
 * gate's resolver, the iris palette, light mode): the brand pebble is `--app-home` lit from above exactly as
 * `material-pebble` does (`--pebble-top-mix`, `--pebble-light`, `--pebble-dark`), the L is `--app-glyph`, the K is
 * `--brand-2-200` (the tint the K takes on a pebble, BrandMark tone="pebble"), the theme colour is `--primary`.
 * The path data is src/lib/components/ui/brand-mark-geometry.json, the file BrandMark draws from.
 *
 * Rasterising uses the Chromium that Playwright already installs (no image dependency). `--check` is pure
 * Node: the SVG, the manifest and app.html are compared byte for byte or value for value; each PNG and the ICO
 * must exist with the right dimensions (raster bytes differ between machines, so they are not hashed).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampRgb, formatHex, interpolate } from 'culori';
import {
	parseRules,
	propertiesFor,
	resolveColor,
	themeFiles
} from '../arch/check-token-contrast.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));

/** The tokens this script reads, resolved for iris / light. */
export function readTokens(root = REPO) {
	let all = [];
	for (const file of themeFiles(root)) {
		const { rules } = parseRules(readFileSync(join(root, file), 'utf8'), file, {
			lenient: file.endsWith('/layouts.css')
		});
		all = all.concat(rules.map((r, i) => ({ ...r, order: all.length + i })));
	}
	const combo = { palette: 'iris', mode: 'light', sidebarColors: 'light', transparency: 'glass' };
	const props = propertiesFor(all, combo);
	const color = (name) => resolveColor(name, props, 'light');
	const hex = (c) => formatHex(clampRgb(c)).toUpperCase();
	const mix = Number.parseFloat(props.get('--pebble-top-mix')) / 100;
	const accent = color('app-home');
	const toward = (to, amount) => interpolate([accent, color(to)], 'rgb')(amount);
	return {
		themeColor: hex(color('primary')),
		backgroundColor: hex(color('background')),
		// material-pebble: top = accent 82% toward the light, the body = accent, the foot = accent 90% toward the dark
		pebbleTop: hex(toward('pebble-light', 1 - mix)),
		pebbleBody: hex(accent),
		pebbleFoot: hex(toward('pebble-dark', 0.1)),
		glyph: hex(color('app-glyph')),
		second: hex(color('brand-2-200'))
	};
}

export function readGeometry(root = REPO) {
	return JSON.parse(
		readFileSync(join(root, 'src/lib/components/ui/brand-mark-geometry.json'), 'utf8')
	);
}

/**
 * One icon as SVG on a 512 square.
 *   shape    'pebble' the squircle (--radius-pebble 28%) on a transparent ground; 'bleed' a full square
 *            (the platform masks it: iOS, Windows tiles, maskable)
 *   drawing  'full' | 'small' (the small drawing is for 32 px and under)
 *   mark     the mark's share of the edge (the pebble uses 62%; maskable keeps to the safe zone)
 */
export function iconSvg(tokens, geometry, { shape, drawing, mark }) {
	const g = geometry[drawing];
	const size = Math.round(512 * mark);
	const at = (512 - size) / 2;
	const radius = shape === 'pebble' ? ` rx="${Math.round(512 * 0.28)}"` : '';
	return [
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
		'<defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1">',
		`<stop offset="0" stop-color="${tokens.pebbleTop}"/>`,
		`<stop offset="0.58" stop-color="${tokens.pebbleBody}"/>`,
		`<stop offset="1" stop-color="${tokens.pebbleFoot}"/>`,
		'</linearGradient></defs>',
		`<rect width="512" height="512"${radius} fill="url(#p)"/>`,
		`<svg x="${at}" y="${at}" width="${size}" height="${size}" viewBox="${g.box}">`,
		`<path fill="${tokens.glyph}" d="${g.l}"/>`,
		`<path fill="${tokens.second}" d="${g.k}"/>`,
		'</svg>',
		'</svg>',
		''
	].join('\n');
}

const PEBBLE_MARK = 0.62;
/** Android's safe zone for a maskable icon is the inner 80% circle, so the mark stays well inside it. */
const MASKABLE_MARK = 0.48;

/** Every raster asset: file, edge in px and the icon recipe. */
export const RASTERS = [
	{
		file: 'favicon-16x16.png',
		px: 16,
		recipe: { shape: 'pebble', drawing: 'small', mark: PEBBLE_MARK }
	},
	{
		file: 'favicon-32x32.png',
		px: 32,
		recipe: { shape: 'pebble', drawing: 'small', mark: PEBBLE_MARK }
	},
	{
		file: 'android-chrome-192x192.png',
		px: 192,
		recipe: { shape: 'pebble', drawing: 'full', mark: PEBBLE_MARK }
	},
	{
		file: 'android-chrome-512x512.png',
		px: 512,
		recipe: { shape: 'pebble', drawing: 'full', mark: PEBBLE_MARK }
	},
	{
		file: 'apple-touch-icon.png',
		px: 180,
		recipe: { shape: 'bleed', drawing: 'full', mark: PEBBLE_MARK }
	},
	{
		file: 'maskable-512x512.png',
		px: 512,
		recipe: { shape: 'bleed', drawing: 'full', mark: MASKABLE_MARK }
	},
	{
		file: 'mstile-150x150.png',
		px: 150,
		recipe: { shape: 'bleed', drawing: 'full', mark: PEBBLE_MARK }
	},
	{
		file: 'mstile-310x310.png',
		px: 310,
		recipe: { shape: 'bleed', drawing: 'full', mark: PEBBLE_MARK }
	}
];
const FAVICON_SVG = { shape: 'pebble', drawing: 'small', mark: PEBBLE_MARK };
const ICO_SIZES = [16, 32];

/** The text of the manifest with the two colours of the tokens. */
export function manifestText(current, tokens) {
	return current
		.replace(/("theme_color":\s*")#[0-9A-Fa-f]{6}(")/, `$1${tokens.themeColor}$2`)
		.replace(/("background_color":\s*")#[0-9A-Fa-f]{6}(")/, `$1${tokens.backgroundColor}$2`);
}
/** The text of app.html with the theme colour of the tokens. */
export function appHtmlText(current, tokens) {
	return current
		.replace(/(name="theme-color"\s+content=")#[0-9A-Fa-f]{6}(")/, `$1${tokens.themeColor}$2`)
		.replace(
			/(name="msapplication-TileColor"\s+content=")#[0-9A-Fa-f]{6}(")/,
			`$1${tokens.themeColor}$2`
		);
}

/** An ICO whose images are PNGs (16 and 32 px). */
function icoFrom(pngs) {
	const head = Buffer.alloc(6 + 16 * pngs.length);
	head.writeUInt16LE(1, 2); // type: icon
	head.writeUInt16LE(pngs.length, 4);
	let offset = head.length;
	pngs.forEach(({ px, data }, i) => {
		const e = 6 + 16 * i;
		head.writeUInt8(px, e); // width
		head.writeUInt8(px, e + 1); // height
		head.writeUInt16LE(1, e + 4); // planes
		head.writeUInt16LE(32, e + 6); // bits per pixel
		head.writeUInt32LE(data.length, e + 8);
		head.writeUInt32LE(offset, e + 12);
		offset += data.length;
	});
	return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}

const pngSize = (buf) =>
	buf.length > 24 && buf.toString('latin1', 1, 4) === 'PNG'
		? [buf.readUInt32BE(16), buf.readUInt32BE(20)]
		: null;

async function rasterise(items) {
	const { chromium } = await import('@playwright/test');
	const browser = await chromium.launch();
	try {
		const out = new Map();
		const page = await browser.newPage({ deviceScaleFactor: 1 });
		for (const { key, px, svg } of items) {
			await page.setViewportSize({ width: px, height: px });
			await page.setContent(
				`<!doctype html><html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`
			);
			out.set(key, await page.screenshot({ type: 'png', omitBackground: true }));
		}
		return out;
	} finally {
		await browser.close();
	}
}

export async function generate(out = REPO) {
	const tokens = readTokens();
	const geometry = readGeometry();
	const dir = join(out, 'static');
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'favicon.svg'), iconSvg(tokens, geometry, FAVICON_SVG));

	const items = RASTERS.map((r) => ({
		key: r.file,
		px: r.px,
		svg: iconSvg(tokens, geometry, r.recipe)
	}));
	const png = await rasterise(items);
	for (const [file, data] of png) writeFileSync(join(dir, file), data);
	writeFileSync(
		join(dir, 'favicon.ico'),
		icoFrom(ICO_SIZES.map((px) => ({ px, data: png.get(`favicon-${px}x${px}.png`) })))
	);

	const manifest = join(dir, 'manifest.webmanifest');
	writeFileSync(manifest, manifestText(readFileSync(manifest, 'utf8'), tokens));
	const html = join(out, 'src', 'app.html');
	writeFileSync(html, appHtmlText(readFileSync(html, 'utf8'), tokens));
	return tokens;
}

/** The drift in the assets under `out`; empty when everything matches the tokens. */
export function drift(out = REPO) {
	const tokens = readTokens();
	const geometry = readGeometry();
	const dir = join(out, 'static');
	const problems = [];
	const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);

	const svg = read(join(dir, 'favicon.svg'));
	if (svg !== iconSvg(tokens, geometry, FAVICON_SVG))
		problems.push('static/favicon.svg differs from the tokens and the mark geometry');

	const manifest = read(join(dir, 'manifest.webmanifest'));
	if (manifest === null) problems.push('static/manifest.webmanifest is missing');
	else {
		const want = manifestText(manifest, tokens);
		const get = (t, k) => new RegExp(`"${k}":\\s*"([^"]*)"`).exec(t)?.[1];
		for (const k of ['theme_color', 'background_color'])
			if (get(manifest, k) !== get(want, k))
				problems.push(`manifest ${k} is ${get(manifest, k)}, the tokens say ${get(want, k)}`);
	}

	const html = read(join(out, 'src', 'app.html'));
	if (html === null) problems.push('src/app.html is missing');
	else {
		const want = appHtmlText(html, tokens);
		for (const name of ['theme-color', 'msapplication-TileColor']) {
			const get = (t) => new RegExp(`name="${name}"\\s+content="([^"]*)"`).exec(t)?.[1];
			if (get(html) !== get(want))
				problems.push(`app.html ${name} is ${get(html)}, the tokens say ${get(want)}`);
		}
	}

	for (const { file, px } of RASTERS) {
		const p = join(dir, file);
		const dims = existsSync(p) ? pngSize(readFileSync(p)) : null;
		if (!dims) problems.push(`static/${file} is missing or not a PNG`);
		else if (dims[0] !== px || dims[1] !== px)
			problems.push(`static/${file} is ${dims[0]}x${dims[1]}, expected ${px}x${px}`);
	}
	const ico = join(dir, 'favicon.ico');
	if (!existsSync(ico)) problems.push('static/favicon.ico is missing');
	else if (readFileSync(ico).readUInt16LE(4) !== ICO_SIZES.length)
		problems.push(`static/favicon.ico does not hold ${ICO_SIZES.length} images`);
	return problems;
}

async function main() {
	const args = process.argv.slice(2);
	const at = args.indexOf('--out');
	const out = at >= 0 ? args[at + 1] : REPO;
	if (args.includes('--check')) {
		const problems = drift(out);
		if (problems.length) {
			console.error(`✗ brand:icons: ${problems.length} asset(s) have drifted:`);
			for (const p of problems) console.error(`  ${p}`);
			console.error('Run `npm run brand:icons` and commit the result.');
			process.exit(1);
		}
		console.log('✓ brand:icons: the static icons and the theme colour match the Iris tokens.');
		return;
	}
	const tokens = await generate(out);
	console.log(`✓ brand:icons: wrote the icons; theme colour ${tokens.themeColor}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
