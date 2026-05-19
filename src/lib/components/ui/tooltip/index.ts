/**
 * Tooltip compound primitive — namespace barrel.
 *
 * Built on bits-ui Tooltip (focus, hover, delay, dismiss, portal, ARIA).
 * Visual layer uses .glass-card material and design tokens throughout.
 *
 * Usage:
 *   import { Tooltip } from '$ui';
 *
 *   <Tooltip.Root>
 *     <Tooltip.Trigger>Hover me</Tooltip.Trigger>
 *     <Tooltip.Content>Helpful description</Tooltip.Content>
 *   </Tooltip.Root>
 */
export { default as Root } from './Tooltip.svelte';
export { default as Trigger } from './TooltipTrigger.svelte';
export { default as Content } from './TooltipContent.svelte';
