/**
 * Tree compound primitive — namespace barrel.
 *
 * Recursive disclosure list with chevron-toggled expansion. Each
 * TreeNode accepts a `children` snippet for nested subtrees — there's
 * no "items" prop because raw composition keeps the API trivial and
 * keeps callers free to mix icons, badges, actions per row.
 *
 * Usage:
 *   import * as Tree from '$ui/tree';
 *
 *   <Tree.Root aria-label="Roles">
 *     <Tree.Node label="Admin" icon={Shield} bind:expanded onClick={...}>
 *       <Tree.Node label="Manager" level={1} />
 *       <Tree.Node label="Agent" level={1} />
 *     </Tree.Node>
 *   </Tree.Root>
 */
export { default as Root } from './Tree.svelte';
export { default as Node } from './TreeNode.svelte';
