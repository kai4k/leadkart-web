/**
 * Popover compound primitive — namespace barrel.
 *
 * Built on bits-ui Popover (focus management, outside-click dismissal,
 * ESC dismissal, ARIA dialog semantics, Floating UI positioning,
 * portal).
 *
 * Visual: glass-card panel with rounded corners + token-driven padding.
 * Use for filter popovers, info bubbles, mini-forms anchored to a
 * trigger.
 *
 * Usage:
 *   import * as Popover from '$ui/popover';
 *   // or via ui barrel:
 *   import { Popover } from '$ui';
 *
 *   <Popover.Root>
 *     <Popover.Trigger>
 *       <Button>Filters</Button>
 *     </Popover.Trigger>
 *     <Popover.Content align="start">
 *       ...
 *     </Popover.Content>
 *   </Popover.Root>
 */
export { default as Root } from './Popover.svelte';
export { default as Trigger } from './PopoverTrigger.svelte';
export { default as Content } from './PopoverContent.svelte';
