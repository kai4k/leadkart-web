/**
 * Dropdown compound primitive — namespace barrel.
 *
 * Context menu / action menu built on bits-ui DropdownMenu
 * (focus management, keyboard navigation, ARIA menu role, portal).
 * Visual layer uses .glass-card material and design tokens throughout.
 *
 * Usage:
 *   import * as Dropdown from '$ui/dropdown';
 *   // or via ui barrel:
 *   import { Dropdown } from '$ui';
 *
 *   <Dropdown.Root>
 *     <Dropdown.Trigger>
 *       <Button>Actions</Button>
 *     </Dropdown.Trigger>
 *     <Dropdown.Menu>
 *       <Dropdown.Item onSelect={handleEdit}>Edit</Dropdown.Item>
 *       <Dropdown.Separator />
 *       <Dropdown.Item variant="danger" onSelect={handleDelete}>Delete</Dropdown.Item>
 *     </Dropdown.Menu>
 *   </Dropdown.Root>
 */
export { default as Root } from './Dropdown.svelte';
export { default as Trigger } from './DropdownTrigger.svelte';
export { default as Menu } from './DropdownMenu.svelte';
export { default as Item } from './DropdownItem.svelte';
export { default as Separator } from './DropdownSeparator.svelte';
