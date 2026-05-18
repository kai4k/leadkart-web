/**
 * UI primitives barrel — single import path for cross-feature
 * components. Industry canon (shadcn-svelte, Material UI, Chakra):
 * `import { Button, Alert } from '$ui'` over deep path imports.
 *
 * Composite primitives (Card, future Tabs/Dialog/Dropdown) are
 * exported as namespaces under their own subfolder index.
 */
export { default as Alert } from './Alert.svelte';
export { default as AuthCard } from './AuthCard.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Button } from './Button.svelte';
export { default as Logo } from './Logo.svelte';
export { default as Spinner } from './Spinner.svelte';
export * as Card from './card';
