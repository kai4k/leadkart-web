/**
 * Viewport presets for visual snapshots.
 *
 * Three sizes mirror Tailwind's `sm` / `md` / `xl` breakpoint canon
 * + a real-device mid-range mobile target (iPhone 12 / Pixel 5 width).
 * Each visual test runs the SAME route at each viewport to catch
 * responsive-layout drift.
 *
 * Width/height are hard-pinned (no `deviceScaleFactor`) so the snapshot
 * pixel count is deterministic across runs.
 */

export const VIEWPORTS = [
	{ name: 'desktop', width: 1280, height: 800 },
	{ name: 'tablet', width: 768, height: 1024 },
	{ name: 'mobile', width: 375, height: 812 }
] as const;

export type Viewport = (typeof VIEWPORTS)[number];
