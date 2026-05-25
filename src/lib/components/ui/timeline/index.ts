/**
 * Timeline compound primitive — namespace barrel.
 *
 * A vertical event stream with iconified milestones and a connecting
 * guide line. Composable: drop any number of TimelineItem children.
 *
 * Usage:
 *   import * as Timeline from '$ui/timeline';
 *
 *   <Timeline.Root>
 *     <Timeline.Item icon={Check} iconAccent="success" time="2h ago" title="Order placed">
 *       Order #1234 created for 250 units.
 *     </Timeline.Item>
 *     <Timeline.Item icon={Truck} iconAccent="info" time="1h ago" title="Shipped" />
 *   </Timeline.Root>
 */
export { default as Root } from './Timeline.svelte';
export { default as Item } from './TimelineItem.svelte';
export type { TimelineItemAccent } from './TimelineItem.svelte';
