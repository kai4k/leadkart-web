import { getContext, setContext } from 'svelte';
import { createIsMobile } from '#lib/hooks/is-mobile.svelte.ts';
import { SIDEBAR_KEYBOARD_SHORTCUT } from './constants.ts';

type Getter<T> = () => T;

export type SidebarStateProps = {
	/**
	 * A getter that returns the current open state of the sidebar (a getter so the provider can be
	 * controlled by a parent value, here the `sidebar` preference).
	 */
	open: Getter<boolean>;

	/** Sets the open state: the one source of truth for changing it. */
	setOpen: (open: boolean) => void;
};

export interface SidebarState {
	/** Desktop: is the sidebar expanded (not icon-only)? */
	readonly open: boolean;
	/** Below `lg`: is the sheet open? */
	readonly openMobile: boolean;
	readonly state: 'expanded' | 'collapsed';
	/** Below `lg` (the navigation is a sheet). */
	readonly isMobile: boolean;
	setOpen: SidebarStateProps['setOpen'];
	setOpenMobile: (value: boolean) => void;
	toggle: () => void;
	/** Event handler to apply to `<svelte:window onkeydown>`. */
	handleShortcutKeydown: (e: KeyboardEvent) => void;
}

/**
 * The sidebar's state as a factory (runes are closures; `check-no-class-stores` bans classes in
 * `*.svelte.ts`). Reactive accessors are getters over local `$state` / `$derived`.
 */
function createSidebarState(props: SidebarStateProps): SidebarState {
	let openMobile = $state(false);
	const isMobile = createIsMobile();
	const open = $derived(props.open());
	const state = $derived(open ? 'expanded' : 'collapsed');

	// The sheet's panel only exists below `lg`: crossing the breakpoint with it open would leave the
	// state `true` and reopen the sheet on the way back (the old AppShell closed it the same way).
	$effect(() => {
		if (!isMobile.current) openMobile = false;
	});

	const toggle = (): void => {
		if (isMobile.current) openMobile = !openMobile;
		else props.setOpen(!open);
	};

	return {
		get open() {
			return open;
		},
		get openMobile() {
			return openMobile;
		},
		get state() {
			return state;
		},
		get isMobile() {
			return isMobile.current;
		},
		setOpen: props.setOpen,
		setOpenMobile(value) {
			openMobile = value;
		},
		toggle,
		handleShortcutKeydown(e) {
			if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				toggle();
			}
		}
	};
}

const SYMBOL_KEY = 'scn-sidebar';

/** Creates the sidebar state and puts it in context (the provider calls this). */
export function setSidebar(props: SidebarStateProps): SidebarState {
	return setContext(Symbol.for(SYMBOL_KEY), createSidebarState(props));
}

/** The sidebar state of the nearest provider. Do not destructure it: its fields are getters. */
export function useSidebar(): SidebarState {
	return getContext(Symbol.for(SYMBOL_KEY));
}
