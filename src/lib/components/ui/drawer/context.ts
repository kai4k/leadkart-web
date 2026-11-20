import { getContext, setContext } from 'svelte';

/** What `Drawer.Root` tells `Drawer.Content`: the vaul props the Sheet has no Root-level twin for. */
export interface DrawerConfig {
	readonly side: 'top' | 'right' | 'bottom' | 'left';
	readonly dismissible: boolean;
}

const KEY = Symbol('drawer');
export const setDrawerConfig = (config: DrawerConfig) => setContext(KEY, config);
export const getDrawerConfig = () => getContext<DrawerConfig | undefined>(KEY);
