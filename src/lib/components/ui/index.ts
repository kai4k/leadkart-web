/**
 * UI primitives barrel — single import path for cross-feature
 * components. Industry canon (shadcn-svelte, Material UI, Chakra):
 * `import { Button, Alert } from '$ui'` over deep path imports.
 *
 * Phase 2 (shadcn-migration): atoms live in shadcn-canon dirs
 * (`./button`, `./alert`, `./badge`, `./avatar`, `./skeleton`,
 * `./breadcrumb`, `./pagination`) — re-exported here for back-compat
 * with the `import { Button } from '$ui'` consumer pattern.
 *
 * Composite primitives (Card, Dialog, Drawer, etc.) are exported as
 * namespaces under their own subfolder index.
 */
export { Alert, type AlertVariant, type AlertVariants, alertVariants } from './alert';
export {
	Avatar,
	AvatarGroup,
	type AvatarSize,
	type AvatarVariants,
	type AvatarGroupSize,
	type AvatarGroupMember,
	avatarVariants,
	avatarGroupItemVariants
} from './avatar';
export {
	Badge,
	type BadgeVariant,
	type BadgeAppearance,
	type BadgeSize,
	type BadgeStyle,
	type BadgeVariants,
	badgeVariants
} from './badge';
export { Breadcrumb, Breadcrumbs, type BreadcrumbItem } from './breadcrumb';
export {
	Button,
	type ButtonVariant,
	type ButtonSize,
	type ButtonVariants,
	buttonVariants
} from './button';
export { Pagination, type PaginationChange } from './pagination';
export { Skeleton, type SkeletonShape, type SkeletonVariants, skeletonVariants } from './skeleton';
export { default as CopyButton } from './CopyButton.svelte';
export { default as AuthCard } from './AuthCard.svelte';
export * as Card from './card';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export type { ConfirmDialogVariant } from './ConfirmDialog.svelte';
export * as Dialog from './dialog';
export * as Drawer from './drawer';
export * as Dropdown from './dropdown';
export { default as EmptyState } from './EmptyState.svelte';
export { default as InlineEdit } from './InlineEdit.svelte';
export * as Kanban from './kanban';
export type { KanbanColumnDescriptor, KanbanColumnAccent, KanbanMove } from './kanban';
export { default as Logo } from './Logo.svelte';
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
export { Toaster, toast } from './sonner';
export * as Tree from './tree';
export * as DataTable from './data-table';
export type { DataTableColumn, DataTableProps } from './data-table';
export * as Tabs from './tabs';
export type { TabsListVariant } from './tabs';
export * as Accordion from './accordion';
export * as Popover from './popover';
export { Progress } from './progress';
export type { ProgressVariants } from './progress';
export { Slider } from './slider';
