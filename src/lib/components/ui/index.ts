/**
 * UI primitives barrel — single import path for cross-feature
 * components. Industry canon (shadcn-svelte, Material UI, Chakra):
 * `import { Button, Card } from '$ui'` over deep path imports.
 */
export { default as Alert } from './Alert.svelte';
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as Spinner } from './Spinner.svelte';
