/**
 * Drawer compound primitive — namespace barrel.
 *
 * Right-side slide-over built on bits-ui Dialog (focus trap, ESC,
 * ARIA dialog role, portal). Visual layer uses .glass-card material
 * and design tokens throughout.
 *
 * Usage:
 *   import * as Drawer from '$ui/drawer';
 *   // or via ui barrel:
 *   import { Drawer } from '$ui';
 *
 *   <Drawer.Root bind:open>
 *     <Drawer.Trigger>Open</Drawer.Trigger>
 *     <Drawer.Content>
 *       <Drawer.Header>...</Drawer.Header>
 *       <Drawer.Body>...</Drawer.Body>
 *       <Drawer.Footer>...</Drawer.Footer>
 *     </Drawer.Content>
 *   </Drawer.Root>
 */
export { default as Root } from './Drawer.svelte';
export { default as Trigger } from './DrawerTrigger.svelte';
export { default as Content } from './DrawerContent.svelte';
export { default as Header } from './DrawerHeader.svelte';
export { default as Body } from './DrawerBody.svelte';
export { default as Footer } from './DrawerFooter.svelte';
export { default as Close } from './DrawerClose.svelte';
