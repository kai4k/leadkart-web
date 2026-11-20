<script lang="ts">
	/**
	 * `Drawer` is a SHIM over `ui/sheet` (plan L17): the vaul-svelte drawer is gone, and the leads /
	 * orders / inventory surfaces that still import `ui/drawer` get a Sheet through the old names.
	 * It is deleted when its last user is rebuilt; `check-ui-imports` (Task 16) blocks new importers.
	 *
	 * Accepted and ignored (vaul-only): `shouldScaleBackground`, `activeSnapPoint`, `snapPoints`.
	 * `direction` picks the sheet's side. `dismissible={false}` refuses Escape and outside presses,
	 * like vaul did. `busy` is the Sheet's own veto (Escape, outside press, every Close).
	 */
	import * as Sheet from '../sheet/index.ts';
	import { setDrawerConfig } from './context.ts';
	import type { ComponentProps } from 'svelte';

	type VaulOnly = {
		shouldScaleBackground?: boolean;
		activeSnapPoint?: number | string | null;
		snapPoints?: Array<number | string>;
	};
	let {
		open = $bindable(false),
		direction = 'right',
		dismissible = true,
		shouldScaleBackground: _scale,
		activeSnapPoint: _active,
		snapPoints: _snaps,
		...rest
	}: ComponentProps<typeof Sheet.Root> &
		VaulOnly & {
			direction?: 'top' | 'right' | 'bottom' | 'left';
			dismissible?: boolean;
		} = $props();

	setDrawerConfig({
		get side() {
			return direction;
		},
		get dismissible() {
			return dismissible;
		}
	});
</script>

<Sheet.Root bind:open {...rest} />
