/**
 * Accordion compound primitive — namespace barrel.
 *
 * Built on bits-ui Accordion (ARIA disclosure pattern, focus + arrow
 * navigation, Enter/Space activation, type=single|multiple state model).
 *
 * Visual: clean border-bottom dividers between items; chevron rotates
 * 180° when open. Single (default) collapses siblings; multiple lets
 * many items stay open at once.
 *
 * Usage:
 *   import * as Accordion from '$ui/accordion';
 *   // or via ui barrel:
 *   import { Accordion } from '$ui';
 *
 *   <Accordion.Root type="single" bind:value>
 *     <Accordion.Item value="general">
 *       <Accordion.Trigger>General</Accordion.Trigger>
 *       <Accordion.Content>...</Accordion.Content>
 *     </Accordion.Item>
 *   </Accordion.Root>
 */
export { default as Root } from './Accordion.svelte';
export { default as Item } from './AccordionItem.svelte';
export { default as Trigger } from './AccordionTrigger.svelte';
export { default as Content } from './AccordionContent.svelte';
