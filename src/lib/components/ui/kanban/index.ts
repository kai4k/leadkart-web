/**
 * Kanban compound primitive — namespace barrel.
 *
 * Native HTML5 drag-and-drop board (no library dependency). Shared
 * drag state lives in a context-provided class-store; cards set the
 * `application/x-kanban-card` payload + their origin column, and
 * columns dispatch the registered `onCardMove` on drop.
 *
 * Usage:
 *   import * as Kanban from '$ui/kanban';
 *
 *   <Kanban.Board onCardMove={handleMove}>
 *     {#each columns as col (col.id)}
 *       <Kanban.Column id={col.id} label={col.label} count={col.count} accent="primary">
 *         {#each col.cards as card (card.id)}
 *           <Kanban.Card id={card.id} aria-label={card.title}>...</Kanban.Card>
 *         {/each}
 *       </Kanban.Column>
 *     {/each}
 *   </Kanban.Board>
 */
export { default as Board } from './KanbanBoard.svelte';
export { default as Column } from './KanbanColumn.svelte';
export { default as Card } from './KanbanCard.svelte';
export type { KanbanColumnDescriptor, KanbanMove } from './KanbanBoard.svelte';
export type { KanbanColumnAccent } from './KanbanColumn.svelte';
