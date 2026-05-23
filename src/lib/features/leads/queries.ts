/**
 * TanStack Query hooks for the CRM Leads module.
 *
 * Pattern notes:
 *   - leadsInfiniteQuery wraps `UseInfiniteList` so the page can drop a
 *     sentinel + render `list.items` directly.
 *   - Mutations (per ADR 0038) return the updated DTO; we `setQueryData`
 *     to seed the cache BEFORE invalidating the list, so the row updates
 *     in place without an extra round-trip.
 *   - changeStage / changeTemperature are optimistic via the shared
 *     `useOptimisticMutation` hook — snapshot detail cache, project the
 *     new value, roll back on error, toast on success with Undo.
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';
import { UseInfiniteList, useOptimisticMutation } from '$lib/hooks';
import type {
	CrmLeadDto,
	ListLeadsParams,
	UpdateLeadRequest,
	ReassignLeadRequest,
	LogCallRequest,
	BulkLeadActionRequest,
	LeadStage,
	LeadTemperature,
	ReminderAction
} from './schemas';
import type { CrossReminderParams } from './api';

export const leadsKeys = {
	all: ['crm-leads'] as const,
	lists: () => [...leadsKeys.all, 'list'] as const,
	list: (params: ListLeadsParams) => [...leadsKeys.lists(), params] as const,
	detail: (id: string) => [...leadsKeys.all, 'detail', id] as const,
	calls: (id: string) => [...leadsKeys.all, 'calls', id] as const,
	reminders: (id: string) => [...leadsKeys.all, 'reminders', id] as const,
	history: (id: string) => [...leadsKeys.all, 'history', id] as const,
	crossReminders: (params: CrossReminderParams) =>
		[...leadsKeys.all, 'cross-reminders', params] as const
};

// ── Queries ─────────────────────────────────────────────────────────

export function leadsInfiniteQuery(getParams: () => ListLeadsParams): UseInfiniteList<CrmLeadDto> {
	return new UseInfiniteList<CrmLeadDto>({
		queryKey: () => leadsKeys.list(getParams()),
		queryFn: ({ cursor }) =>
			api.listLeads({ ...getParams(), cursor }).then((r) => ({
				items: r.items,
				has_more: r.has_more,
				next_cursor: r.next_cursor ?? undefined
			}))
	});
}

export function leadDetailQuery(id: string) {
	return createQuery(() => ({
		queryKey: leadsKeys.detail(id),
		queryFn: () => api.getLead(id),
		enabled: !!id
	}));
}

export function leadCallsQuery(id: string) {
	return createQuery(() => ({
		queryKey: leadsKeys.calls(id),
		queryFn: () => api.listCallLogs(id),
		enabled: !!id
	}));
}

export function leadRemindersQuery(id: string) {
	return createQuery(() => ({
		queryKey: leadsKeys.reminders(id),
		queryFn: () => api.listLeadReminders(id),
		enabled: !!id
	}));
}

export function leadHistoryQuery(id: string) {
	return createQuery(() => ({
		queryKey: leadsKeys.history(id),
		queryFn: () => api.listAssignmentHistory(id),
		enabled: !!id
	}));
}

export function crossRemindersQuery(getParams: () => CrossReminderParams) {
	return createQuery(() => ({
		queryKey: leadsKeys.crossReminders(getParams()),
		queryFn: () => api.listReminders(getParams())
	}));
}

// ── Mutations ───────────────────────────────────────────────────────

export function updateLeadMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, req }: { id: string; req: UpdateLeadRequest }) => api.updateLead(id, req),
		onSuccess: (lead) => {
			qc.setQueryData(leadsKeys.detail(lead.id), lead);
			qc.invalidateQueries({ queryKey: leadsKeys.lists() });
			toast('success', 'Lead updated');
		}
	}));
}

/**
 * Optimistic stage change — used by the kanban drag handler AND the
 * table-row inline picker. Snapshots the detail cache, projects the
 * new stage, rolls back on error, and toasts with an Undo button that
 * fires the reverse PATCH.
 */
export function changeStageMutation() {
	const qc = useQueryClient();
	return useOptimisticMutation<
		{ id: string; stage: LeadStage; previous: LeadStage },
		CrmLeadDto,
		{ prevDetail?: CrmLeadDto }
	>({
		mutationFn: ({ id, stage }) => api.updateLead(id, { stage }),
		onMutate: async ({ id }) => {
			await qc.cancelQueries({ queryKey: leadsKeys.detail(id) });
			return { prevDetail: qc.getQueryData<CrmLeadDto>(leadsKeys.detail(id)) };
		},
		applyOptimistic: ({ id, stage }, ctx) => {
			if (ctx.prevDetail) {
				qc.setQueryData<CrmLeadDto>(leadsKeys.detail(id), { ...ctx.prevDetail, stage });
			}
		},
		rollback: ({ id }, ctx) => {
			if (ctx.prevDetail) qc.setQueryData(leadsKeys.detail(id), ctx.prevDetail);
		},
		invalidateKeys: () => [leadsKeys.lists() as unknown as unknown[]],
		successToast: (lead) => `Stage changed · ${lead.stage}`,
		undo: async (lead, vars) => {
			await api.updateLead(lead.id, { stage: vars.previous });
			void qc.invalidateQueries({ queryKey: leadsKeys.all });
		}
	});
}

export function changeTemperatureMutation() {
	const qc = useQueryClient();
	return useOptimisticMutation<
		{ id: string; temperature: LeadTemperature; previous: LeadTemperature },
		CrmLeadDto,
		{ prevDetail?: CrmLeadDto }
	>({
		mutationFn: ({ id, temperature }) => api.updateLead(id, { temperature }),
		onMutate: async ({ id }) => {
			await qc.cancelQueries({ queryKey: leadsKeys.detail(id) });
			return { prevDetail: qc.getQueryData<CrmLeadDto>(leadsKeys.detail(id)) };
		},
		applyOptimistic: ({ id, temperature }, ctx) => {
			if (ctx.prevDetail) {
				qc.setQueryData<CrmLeadDto>(leadsKeys.detail(id), { ...ctx.prevDetail, temperature });
			}
		},
		rollback: ({ id }, ctx) => {
			if (ctx.prevDetail) qc.setQueryData(leadsKeys.detail(id), ctx.prevDetail);
		},
		invalidateKeys: () => [leadsKeys.lists() as unknown as unknown[]],
		successToast: (lead) => `Temperature changed · ${lead.temperature}`,
		undo: async (lead, vars) => {
			await api.updateLead(lead.id, { temperature: vars.previous });
			void qc.invalidateQueries({ queryKey: leadsKeys.all });
		}
	});
}

export function reassignLeadMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, req }: { id: string; req: ReassignLeadRequest }) =>
			api.reassignLead(id, req),
		onSuccess: (lead) => {
			qc.setQueryData(leadsKeys.detail(lead.id), lead);
			void qc.invalidateQueries({ queryKey: leadsKeys.history(lead.id) });
			void qc.invalidateQueries({ queryKey: leadsKeys.lists() });
			toast('success', 'Lead reassigned');
		}
	}));
}

export function logCallMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, req }: { id: string; req: LogCallRequest }) => api.logCall(id, req),
		onSuccess: (_call, vars) => {
			void qc.invalidateQueries({ queryKey: leadsKeys.calls(vars.id) });
			void qc.invalidateQueries({ queryKey: leadsKeys.reminders(vars.id) });
			void qc.invalidateQueries({ queryKey: leadsKeys.detail(vars.id) });
			toast('success', 'Call logged');
		}
	}));
}

export function updateReminderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({
			id,
			action,
			snooze_until
		}: {
			id: string;
			leadId: string;
			action: ReminderAction;
			snooze_until?: string;
		}) => api.updateReminder(id, action, snooze_until ? { snooze_until } : {}),
		onSuccess: (_r, vars) => {
			void qc.invalidateQueries({ queryKey: leadsKeys.reminders(vars.leadId) });
			toast('success', `Reminder ${vars.action}d`);
		}
	}));
}

export function bulkLeadActionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: BulkLeadActionRequest) => api.bulkLeadAction(req),
		onSuccess: (result, vars) => {
			void qc.invalidateQueries({ queryKey: leadsKeys.all });
			const noun = vars.ids.length === 1 ? 'lead' : 'leads';
			const verb =
				vars.action === 'reassign'
					? 'reassigned'
					: vars.action === 'change_stage'
						? 'updated'
						: vars.action === 'change_temperature'
							? 'updated'
							: 'updated';
			toast('success', `${result.affected} ${noun} ${verb}`);
		},
		onError: () => {
			toast('danger', 'Bulk action failed');
		}
	}));
}

export function bulkUploadPreviewMutation() {
	return createMutation(() => ({
		mutationFn: (file: File) => api.bulkUploadPreview(file)
	}));
}

export function bulkUploadCommitMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ file, upsertBy }: { file: File; upsertBy: 'mobile_number' | 'none' }) =>
			api.bulkUploadCommit(file, upsertBy),
		onSuccess: (result) => {
			void qc.invalidateQueries({ queryKey: leadsKeys.all });
			toast('success', `${result.inserted + result.updated} leads imported`);
		}
	}));
}
