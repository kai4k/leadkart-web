/**
 * UI primitives barrel — single import path for cross-feature
 * components. Industry canon (shadcn-svelte, Material UI, Chakra):
 * `import { Button, Alert } from '$ui'` over deep path imports.
 *
 * Composite primitives (Card, future Tabs/Dialog/Dropdown) are
 * exported as namespaces under their own subfolder index.
 */
export { default as Alert } from './Alert.svelte';
export { default as Breadcrumbs } from './Breadcrumbs.svelte';
export type { BreadcrumbItem } from './Breadcrumbs.svelte';
export { default as CopyButton } from './CopyButton.svelte';
export { default as AuthCard } from './AuthCard.svelte';
export { default as Avatar } from './Avatar.svelte';
export { default as AvatarGroup } from './AvatarGroup.svelte';
export type { AvatarGroupMember, AvatarGroupSize } from './AvatarGroup.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Button } from './Button.svelte';
export * as Card from './card';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export * as Dialog from './dialog';
export * as Drawer from './drawer';
export * as Dropdown from './dropdown';
export { default as EmptyState } from './EmptyState.svelte';
export { default as InlineEdit } from './InlineEdit.svelte';
export * as Kanban from './kanban';
export type { KanbanColumnDescriptor, KanbanColumnAccent, KanbanMove } from './kanban';
export { default as Logo } from './Logo.svelte';
export { default as Pagination } from './Pagination.svelte';
export { default as Skeleton } from './Skeleton.svelte';
export type { SkeletonVariants } from './Skeleton.svelte';
export { default as Spinner } from './Spinner.svelte';
export { default as StatCard } from './StatCard.svelte';
export type { StatCardAccent } from './StatCard.svelte';
export { default as StatusPill, inferStatusVariant } from './StatusPill.svelte';
export type { StatusPillOption } from './StatusPill.svelte';
export * as Stepper from './stepper';
export type { StepperState } from './stepper';
export * as Timeline from './timeline';
export type { TimelineItemAccent } from './timeline';
export * as Tooltip from './tooltip';
export { toast, dismiss } from './Toaster.svelte';
export type { ToastAction } from './Toaster.svelte';
export * as Tree from './tree';
export * as DataTable from './data-table';
export type { DataTableColumn, DataTableProps } from './data-table';
export * as Tabs from './tabs';
export type { TabsListVariants } from './tabs';
export * as Accordion from './accordion';
export * as Popover from './popover';
export { Progress } from './progress';
export type { ProgressVariants } from './progress';
export { Slider } from './slider';
