/**
 * Every value a feature gateway writes into the PATH of an API URL goes through `seg()` (`utils/path-segment.ts`).
 * A bare `${id}` in a `/v1/...` template is a path the page URL can redirect (`..%2F`): this sweep fails on one.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const FEATURES = resolve(process.cwd(), 'src/lib/features');

function gateways(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) gateways(path, out);
		else if (name === 'api.ts') out.push(path);
	}
	return out;
}

/** A template literal that is an API path. */
const API_TEMPLATE = /`\/v1\/[^`]*`/g;
/** An interpolation in the path part. */
const INTERPOLATION = /\$\{([^}]*)\}/g;

describe('feature gateways', () => {
	const files = gateways(FEATURES);

	it('are found', () => {
		expect(files.length).toBeGreaterThan(8);
	});

	it('write every path parameter through seg()', () => {
		const bare: string[] = [];
		let wrapped = 0;
		for (const file of files) {
			const source = readFileSync(file, 'utf8');
			for (const template of source.match(API_TEMPLATE) ?? []) {
				const path = template.split('?')[0]!;
				for (const [, expression] of path.matchAll(INTERPOLATION)) {
					if (expression!.startsWith('seg(')) wrapped++;
					else bare.push(`${relative(FEATURES, file)}: ${template}`);
				}
			}
		}
		expect(bare).toEqual([]);
		expect(wrapped).toBeGreaterThan(60); // the sweep read the gateways
	});
});
