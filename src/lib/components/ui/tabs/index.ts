/**
 * Tabs compound primitive — namespace barrel.
 *
 * Built on bits-ui Tabs (ARIA tablist/tab/tabpanel, arrow + Home/End
 * keyboard navigation, focus management).
 *
 * Two visual variants on <Tabs.List>:
 *   - 'underline' (default): Linear/Notion canon — bottom-border track
 *     with primary-coloured active underline. Horizontal-scroll on overflow.
 *   - 'pills': stage-style switcher with rounded background fill.
 *
 * Usage:
 *   import * as Tabs from '$ui/tabs';
 *   // or via ui barrel:
 *   import { Tabs } from '$ui';
 *
 *   <Tabs.Root bind:value>
 *     <Tabs.List variant="underline">
 *       <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
 *       <Tabs.Trigger value="members">Members</Tabs.Trigger>
 *     </Tabs.List>
 *     <Tabs.Content value="overview">...</Tabs.Content>
 *     <Tabs.Content value="members">...</Tabs.Content>
 *   </Tabs.Root>
 */
export { default as Root } from './Tabs.svelte';
export { default as List } from './TabsList.svelte';
export { default as Trigger } from './TabsTrigger.svelte';
export { default as Content } from './TabsContent.svelte';
export type { TabsListVariants } from './TabsList.svelte';
