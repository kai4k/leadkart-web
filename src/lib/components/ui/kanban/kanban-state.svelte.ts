/**
 * Kanban shared drag state — class-based rune store so KanbanBoard,
 * KanbanColumn, and KanbanCard can coordinate the drag-and-drop
 * lifecycle without prop-drilling per CLAUDE.md class-store canon.
 *
 * One instance per board lives in Svelte context under KANBAN_CTX.
 */
export class KanbanDragState {
	draggingCardId = $state<string | null>(null);
	originColumnId = $state<string | null>(null);
	hoveredColumnId = $state<string | null>(null);

	start(cardId: string, originColumnId: string) {
		this.draggingCardId = cardId;
		this.originColumnId = originColumnId;
	}

	hover(columnId: string | null) {
		this.hoveredColumnId = columnId;
	}

	clear() {
		this.draggingCardId = null;
		this.originColumnId = null;
		this.hoveredColumnId = null;
	}
}

export const KANBAN_CTX = Symbol('kanban-drag-state');
