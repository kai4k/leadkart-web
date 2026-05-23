/**
 * Stepper compound primitive — namespace barrel.
 *
 * Horizontal multi-step progress indicator. Each step carries its own
 * label + state (pending / current / complete / error). Connectors
 * between steps colour-fill on completion.
 *
 * Usage:
 *   import * as Stepper from '$ui/stepper';
 *
 *   <Stepper.Root aria-label="Bulk upload">
 *     <Stepper.Step index={1} label="Upload" state="complete" />
 *     <Stepper.Step index={2} label="Preview" state="current" />
 *     <Stepper.Step index={3} label="Commit" state="pending" last />
 *   </Stepper.Root>
 */
export { default as Root } from './Stepper.svelte';
export { default as Step } from './StepperStep.svelte';
export type { StepperState } from './StepperStep.svelte';
