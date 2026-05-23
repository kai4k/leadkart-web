/**
 * TanStack Query hooks for the Leads CRM module.
 *
 * Patterns:
 *   - listInfiniteQuery for cursor pagination + infinite scroll
 *   - detailQuery for /leads/:id
 *   - mutations return the updated DTO and use `setQueryData` to seed
 *     the cache before the next list refetch (per ADR 0038: the
 *     response IS the refetch).
 *   - delete + bulk mutations expose `onMutate` snapshots so the
 *     caller can wire toast-undo with the previous state.
 *
 * Query keys: scoped under `['leads', ...]` so a single
 * `invalidateQueries({ queryKey: leadsKeys.all })` nukes everything.
 */
import {
	createQuery,
	createInfiniteQuery,
	createMutation,
	useQueryClient
} from '@tanstack/svelte-query';
import { toast } from '$ui';
import * as api from './api';
import type {
	LeadDto,
	ListLeadsParams,
	CreateLeadRequest,
	UpdateLeadRequest,
	BulkLeadActionRequest
} from './schemas';

export const leadsKeys = {
	all: ['leads'] as const,
	lists: () => [...leadsKeys.all, 'list'] as const,
	list: (params: ListLeadsParams) => [...leadsKeys.lists(), params] as const,
	detail: (id: string) => [...leadsKeys.all, 'detail', id] as const
};

// ── Queries ─────────────────────────────────────────────────────────

export function leadsInfiniteQuery(getParams: () => ListLeadsParams) {
	return createInfiniteQuery(() => ({
		queryKey: leadsKeys.list(getParams()),
		queryFn: ({ pageParam }) =>
			api.listLeads({ ...getParams(), cursor: pageParam as string | undefined }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => last.next_cursor ?? undefined
	}));
}

export function leadDetailQuery(id: string) {
	return createQuery(() => ({
		queryKey: leadsKeys.detail(id),
		queryFn: () => api.getLead(id),
		enabled: !!id
	}));
}

// ── Mutations ───────────────────────────────────────────────────────

export function createLeadMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CreateLeadRequest) => api.createLead(req),
		onSuccess: (lead) => {
			qc.setQueryData(leadsKeys.detail(lead.id), lead);
			qc.invalidateQueries({ queryKey: leadsKeys.lists() });
			toast('success', 'Lead created');
		}
	}));
}

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
 * Inline stage change — optimistic update + toast-undo (Gmail pattern).
 * The caller passes the previous stage so undo can flip it back.
 */
export function changeStageMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({
			id,
			stage
		}: {
			id: string;
			stage: LeadDto['stage'];
			previous: LeadDto['stage'];
		}) => api.updateLead(id, { stage }),
		onMutate: async ({ id, stage }) => {
			await qc.cancelQueries({ queryKey: leadsKeys.detail(id) });
			const prevDetail = qc.getQueryData<LeadDto>(leadsKeys.detail(id));
			if (prevDetail) {
				qc.setQueryData<LeadDto>(leadsKeys.detail(id), { ...prevDetail, stage });
			}
			return { prevDetail };
		},
		onError: (_err, vars, ctx) => {
			if (ctx?.prevDetail) qc.setQueryData(leadsKeys.detail(vars.id), ctx.prevDetail);
			toast('danger', "Couldn't update stage");
		},
		onSuccess: (lead, vars) => {
			qc.setQueryData(leadsKeys.detail(lead.id), lead);
			qc.invalidateQueries({ queryKey: leadsKeys.lists() });
			toast('success', `Stage changed to ${lead.stage}`, {
				action: {
					label: 'Undo',
					onClick: async () => {
						await api.updateLead(lead.id, { stage: vars.previous });
						qc.invalidateQueries({ queryKey: leadsKeys.all });
					}
				},
				duration: 8000
			});
		}
	}));
}

export function deleteLeadMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.deleteLead(id),
		onSuccess: (_lead, id) => {
			qc.removeQueries({ queryKey: leadsKeys.detail(id) });
			qc.invalidateQueries({ queryKey: leadsKeys.lists() });
			toast('success', 'Lead deleted');
		}
	}));
}

export function bulkLeadActionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: BulkLeadActionRequest) => api.bulkLeadAction(req),
		onSuccess: (result, vars) => {
			qc.invalidateQueries({ queryKey: leadsKeys.all });
			const noun = vars.ids.length === 1 ? 'lead' : 'leads';
			const verb =
				vars.action === 'delete'
					? 'deleted'
					: vars.action === 'change_stage'
						? 'updated'
						: vars.action === 'assign_owner'
							? 'reassigned'
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
		mutationFn: ({ file, upsertBy }: { file: File; upsertBy: 'email' | 'phone' | 'none' }) =>
			api.bulkUploadCommit(file, upsertBy),
		onSuccess: (result) => {
			qc.invalidateQueries({ queryKey: leadsKeys.all });
			toast('success', `${result.inserted + result.updated} leads imported`);
		}
	}));
}
