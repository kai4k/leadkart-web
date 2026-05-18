/**
 * Dialog compound primitive — namespace barrel.
 *
 * Centered modal built on bits-ui Dialog (focus trap, ESC,
 * ARIA dialog role, portal). Visual layer uses .glass-card material
 * and design tokens throughout. Animation: .animate-pop-in.
 *
 * Usage:
 *   import * as Dialog from '$ui/dialog';
 *   // or via ui barrel:
 *   import { Dialog } from '$ui';
 *
 *   <Dialog.Root bind:open>
 *     <Dialog.Trigger>Open</Dialog.Trigger>
 *     <Dialog.Content>
 *       <Dialog.Header>...</Dialog.Header>
 *       <Dialog.Body>...</Dialog.Body>
 *       <Dialog.Footer>...</Dialog.Footer>
 *     </Dialog.Content>
 *   </Dialog.Root>
 */
export { default as Root } from './Dialog.svelte';
export { default as Trigger } from './DialogTrigger.svelte';
export { default as Content } from './DialogContent.svelte';
export { default as Header } from './DialogHeader.svelte';
export { default as Body } from './DialogBody.svelte';
export { default as Footer } from './DialogFooter.svelte';
export { default as Close } from './DialogClose.svelte';
