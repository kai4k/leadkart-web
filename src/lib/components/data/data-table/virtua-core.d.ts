/**
 * The types of the slice of `virtua/unstable_core` that `row-window.svelte.ts` uses. The package's own
 * typings for its core are empty (`export {}`), and the API is marked unstable, so this is pinned to
 * the exact version in package.json and nothing outside `row-window.svelte.ts` imports it.
 */
declare module 'virtua/unstable_core' {
	/** An opaque store state version; changes whenever the range or sizes change. */
	export type StateVersion = number & { readonly __brand: 'virtua-state-version' };

	export interface Layout {
		$getItemSize(index: number): number;
	}

	export interface VirtualStore {
		$getStateVersion(): StateVersion;
		$subscribe(listener: (flag: number) => void): () => void;
		$update(action: number, ...args: unknown[]): void;
		/** [first, last] item indexes to render, both inclusive; last < first before the viewport is known. */
		$getRange(bufferSize?: number): [number, number];
		$getItemOffset(index: number): number;
		$getTotalSize(): number;
	}

	export interface Driver {
		$observe(container: HTMLElement | null, scrollElement: HTMLElement): void;
		$dispose(): void;
		$effect(): void;
		$observeItem(element: HTMLElement, index: number): () => void;
	}

	export const ACTION_ITEMS_LENGTH_CHANGE: number;
	export const ACTION_START_OFFSET_CHANGE: number;
	export const UPDATE_VIRTUAL_STATE: number;
	export function createListLayout(length: number, itemSize?: number): Layout;
	export function createVirtualStore(layout: Layout): VirtualStore;
	export function createContainerDriver(
		store: VirtualStore,
		layout: Layout,
		horizontal: boolean
	): Driver;
}
