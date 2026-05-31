/**
 * Kanban shared drag state — runes-backed reactive store so KanbanBoard,
 * KanbanColumn, and KanbanCard can coordinate the drag-and-drop
 * lifecycle without prop-drilling.
 *
 * One instance per board lives in Svelte context under KANBAN_CTX.
 *
 * Svelte canon: a factory closing over `$state` returning an object
 * with reactive getters + plain action functions. No classes.
 */

export interface KanbanDragState {
	readonly draggingCardId: string | null;
	readonly originColumnId: string | null;
	readonly hoveredColumnId: string | null;
	start(cardId: string, originColumnId: string): void;
	hover(columnId: string | null): void;
	clear(): void;
}

export function createKanbanDragState(): KanbanDragState {
	let draggingCardId = $state<string | null>(null);
	let originColumnId = $state<string | null>(null);
	let hoveredColumnId = $state<string | null>(null);

	return {
		get draggingCardId() {
			return draggingCardId;
		},
		get originColumnId() {
			return originColumnId;
		},
		get hoveredColumnId() {
			return hoveredColumnId;
		},
		start(cardId, origin) {
			draggingCardId = cardId;
			originColumnId = origin;
		},
		hover(columnId) {
			hoveredColumnId = columnId;
		},
		clear() {
			draggingCardId = null;
			originColumnId = null;
			hoveredColumnId = null;
		}
	};
}

export const KANBAN_CTX = Symbol('kanban-drag-state');
