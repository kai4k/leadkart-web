/**
 * `ui/drawer` — a shim over `ui/sheet` under the old vaul-era names (plan L17). New code uses
 * `ui/sheet` (or FormSheet); this goes when its last leads/orders/inventory user is rebuilt.
 */
import * as Sheet from '../sheet/index.ts';
import Root from './drawer.svelte';
import Content from './drawer-content.svelte';
import Header from './drawer-header.svelte';
import Body from './drawer-body.svelte';
import Footer from './drawer-footer.svelte';

const { Trigger, Title, Description, Close, Overlay } = Sheet;

export {
	Root,
	Trigger,
	Content,
	Header,
	Body,
	Footer,
	Title,
	Description,
	Close,
	Overlay,
	Root as Drawer,
	Trigger as DrawerTrigger,
	Content as DrawerContent,
	Header as DrawerHeader,
	Body as DrawerBody,
	Footer as DrawerFooter,
	Title as DrawerTitle,
	Description as DrawerDescription,
	Close as DrawerClose,
	Overlay as DrawerOverlay
};
