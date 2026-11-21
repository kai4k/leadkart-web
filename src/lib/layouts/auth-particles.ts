/**
 * The auth backdrop's pharma shapes: a seeded field (so the server render and the client's hydration
 * are byte-identical), colours from the primary ramp only (a near-black mark reads as dirt on the light wash).
 */
const PALETTE = [
	'--primary-300',
	'--primary-400',
	'--primary-500',
	'--primary-600',
	'--primary-700'
];

export interface Particle {
	x: number;
	y: number;
	length: number;
	rotation: number;
	depth: string;
	kind: string;
	c1: string;
	c2: string;
}

function build(): Particle[] {
	let seed = 7919;
	const rand = () => {
		seed = (seed * 9301 + 49297) % 233280;
		return seed / 233280;
	};
	const pick = (): string =>
		PALETTE[Math.floor(rand() * PALETTE.length)] ?? PALETTE[0] ?? '--primary-500';
	return Array.from({ length: 48 }, () => {
		const d = rand();
		const k = rand();
		const kind = k < 0.15 ? 'cross' : k < 0.3 ? 'tablet' : k < 0.45 ? 'tracer' : 'pill';
		const c1 = pick();
		const c2 = kind === 'pill' || kind === 'tracer' ? pick() : c1;
		const x = rand() * 100;
		const y = rand() * 100;
		const length = 6 + rand() * 8;
		const rotation = rand() * 360;
		rand(); // the drift delay this used to draw is gone; the draw stays so every mark keeps its place
		return {
			x,
			y,
			length,
			rotation,
			depth: d < 0.4 ? 'far' : d < 0.7 ? 'mid' : 'near',
			kind,
			c1,
			c2
		};
	});
}

const all = build();
export const FAR = all.filter((p) => p.depth === 'far');
export const MID = all.filter((p) => p.depth === 'mid');
export const NEAR = all.filter((p) => p.depth === 'near');
