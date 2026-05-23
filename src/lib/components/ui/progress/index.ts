/**
 * Progress primitive — namespace barrel.
 *
 * Determinate or indeterminate progress bar built on bits-ui Progress
 * (ARIA progressbar role + value attributes).
 *
 * Usage:
 *   import { Progress } from '$ui';
 *   <Progress value={42} max={100} variant="primary" label="Loading..." />
 *   <Progress value={null} variant="primary" label="Indeterminate..." />
 */
export { default as Progress } from './Progress.svelte';
export type { ProgressVariants } from './Progress.svelte';
