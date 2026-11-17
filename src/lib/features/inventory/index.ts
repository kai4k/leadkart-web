/**
 * Inventory feature barrel — pharma product master, batches, stock
 * movements, FEFO ordering. See BRD `Inventory` module + ADR 0038.
 */
export * from './api';
export * from './schemas';
export * from './view-models';
export { default as ProductsList } from './components/ProductsList.svelte';
export { default as ProductDetail } from './components/ProductDetail.svelte';
