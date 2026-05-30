/**
 * $ui — single import path for cross-feature primitives.
 * Phase B rebuild on bits-ui + Svelte Bits (per CLAUDE.md doctrine).
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
	type ButtonProps,
	type ButtonVariant,
	type ButtonSize,
	type ButtonVariants,
	buttonVariants
} from './button';
export {
	ButtonGroup,
	type ButtonGroupOrientation,
	buttonGroupVariants
} from './button-group';
export * as Card from './card';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export type { ConfirmDialogVariant } from './ConfirmDialog.svelte';
export { Kbd } from './kbd';
export { Label } from './label';
export { Pagination, type PaginationChange } from './pagination';
export {
	Skeleton,
	type SkeletonShape,
	type SkeletonVariants,
	skeletonVariants
} from './skeleton';
export { Spinner } from './spinner';
export { Separator } from './separator';
export { ScrollArea } from './scroll-area';
export { default as CopyButton } from './CopyButton.svelte';
export { default as AuthCard } from './AuthCard.svelte';
export * as Dialog from './dialog';
export * as Drawer from './drawer';
export * as Dropdown from './dropdown-menu';
export * as DropdownMenu from './dropdown-menu';
export { default as EmptyState } from './EmptyState.svelte';
export { default as InlineEdit } from './InlineEdit.svelte';
export * as Kanban from './kanban';
export type { KanbanColumnDescriptor, KanbanColumnAccent, KanbanMove } from './kanban';
export { default as Logo } from './Logo.svelte';
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
