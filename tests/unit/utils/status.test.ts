import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineStatusMap, type StatusView } from '#lib/utils/status.ts';

type Light = 'red' | 'green';
const light = defineStatusMap<Light>({
	red: { label: 'Stop', variant: 'danger' },
	green: { label: 'Go', variant: 'success' }
});

describe('defineStatusMap', () => {
	it('returns the mapped label and variant', () => {
		expect(light('red')).toEqual({ label: 'Stop', variant: 'danger' });
		expect(light('green')).toEqual({ label: 'Go', variant: 'success' });
	});

	it('renders an unknown runtime value raw, in a neutral badge (never throws)', () => {
		expect(light('amber' as Light)).toEqual({ label: 'amber', variant: 'neutral' });
		expect(light('toString' as Light)).toEqual({ label: 'toString', variant: 'neutral' });
	});

	it('a null or empty value renders an em dash, neutral', () => {
		expect(light(null as never)).toEqual({ label: '—', variant: 'neutral' });
		expect(light('' as Light)).toEqual({ label: '—', variant: 'neutral' });
	});

	it('is typed against the enum: only known values compile, every key is required', () => {
		expectTypeOf(light).parameter(0).toEqualTypeOf<Light>();
		expectTypeOf(light).returns.toEqualTypeOf<StatusView>();
		// @ts-expect-error 'amber' is not a Light
		light('amber');
		// @ts-expect-error 'green' is missing
		defineStatusMap<Light>({ red: { label: 'Stop', variant: 'danger' } });
	});
});
