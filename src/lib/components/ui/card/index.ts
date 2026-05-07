/**
 * Card composition — namespace export per shadcn-svelte canon.
 *
 * Consume:
 *   import * as Card from '$ui/card';
 *
 *   <Card.Root>
 *     <Card.Header>
 *       <Card.Title>Title</Card.Title>
 *       <Card.Description>Optional context</Card.Description>
 *     </Card.Header>
 *     <Card.Content>...</Card.Content>
 *     <Card.Footer>...</Card.Footer>
 *   </Card.Root>
 */
export { default as Root } from './Card.svelte';
export { default as Header } from './CardHeader.svelte';
export { default as Title } from './CardTitle.svelte';
export { default as Description } from './CardDescription.svelte';
export { default as Content } from './CardContent.svelte';
export { default as Footer } from './CardFooter.svelte';

export { cardVariants, type CardVariants } from './Card.svelte';
