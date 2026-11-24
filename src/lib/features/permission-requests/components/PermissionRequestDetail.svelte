<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import {
		Alert,
		Badge,
		Button,
		Card,
		DescriptionList,
		type DescriptionItem
	} from '#lib/components/ui/index.ts';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { BackLink, IdChip } from '#lib/components/data/index.ts';
	import { TextareaField } from '#lib/components/form/index.ts';
	import { ValidationError, describeError } from '#lib/api/errors.ts';
	import { codeCopy } from '#lib/api/code-copy.ts';
	import { fieldErrorCopy } from '#lib/utils/field-error-copy.ts';
	import { formatDateTime } from '#lib/utils/format.ts';
	import { CheckCircle2, XCircle, Icon } from '#lib/icons/index.ts';
	import {
		permissionRequestDetailQuery,
		permissionRequestQueueItemQuery,
		approvePermissionRequestMutation,
		denyPermissionRequestMutation,
		cancelPermissionRequestMutation
	} from '#lib/features/permission-requests/queries.ts';
	import {
		permissionRequestState,
		canCancel,
		canDecide,
		decisionControls,
		daysOrIndefinite
	} from '#lib/features/permission-requests/view-models.ts';
	import { session } from '#lib/features/auth/index.ts';
	import { resolve } from '$app/paths';
	import type { PermissionRequestDto } from '#lib/features/permission-requests/schemas.ts';

	type Props = { id: string };
	let { id }: Props = $props();

	const callerMembershipId = $derived(session.principal?.membershipId ?? '');

	const query = permissionRequestDetailQuery(() => id);
	// Go shows this detail only to the requester or to someone who may deny it, so a pending request
	// someone else submitted may be denied as soon as it loads. Approving is what needs the queue:
	// `can_approve` (whether approving it as asked would pass) is sent only there. The browser holds
	// no permission or rank rule for either.
	const queueItem = permissionRequestQueueItemQuery(
		() => id,
		() => query.data !== undefined && canDecide(query.data, callerMembershipId)
	);

	const approveMutation = approvePermissionRequestMutation();
	const denyMutation = denyPermissionRequestMutation();
	const cancelMutation = cancelPermissionRequestMutation();

	let approveReason = $state('');
	let denyReason = $state('');
	let denyError: string | null = $state(null);

	/**
	 * A refused decision: Go answers `permission_request_invalid` with `errors.decision_reason`. That goes on the textarea
	 * the user submitted; anything else is one banner line (never "Check the highlighted fields" with nothing highlighted).
	 */
	function decisionFailure(err: unknown): { field: string | null; banner: string | null } {
		if (!err) return { field: null, banner: null };
		if (err instanceof ValidationError) {
			if (err.fields.decision_reason)
				return { field: fieldErrorCopy(err.fields.decision_reason), banner: null };
			return { field: null, banner: codeCopy(err.code) ?? $_('auth.errors.validation') };
		}
		return {
			field: null,
			banner: describeError(err, {
				status: {
					403: "You don't have permission to decide this request.",
					404: "This request doesn't exist or you don't have access.",
					409: 'This request has already been decided or withdrawn.'
				}
			})
		};
	}
	const approveFailure = $derived(decisionFailure(approveMutation.error));
	const denyFailure = $derived(decisionFailure(denyMutation.error));

	function approve() {
		approveMutation.mutate({ id, decision_reason: approveReason || undefined });
	}
	function deny() {
		if (denyReason.trim().length === 0) {
			denyError = 'Reason is required';
			return;
		}
		denyError = null;
		denyMutation.mutate({ id, decision_reason: denyReason });
	}
	function cancel() {
		cancelMutation.mutate(id);
	}

	function detailItems(req: PermissionRequestDto): DescriptionItem[] {
		const items: DescriptionItem[] = [
			{ label: 'Permission', value: req.permission, mono: true },
			{ label: 'Duration', value: daysOrIndefinite(req.duration_days) },
			{ label: 'Reason', value: req.reason, span: 2, multiline: true },
			{ label: 'Submitted', value: formatDateTime(req.created_at) }
		];
		if (req.decided_at) items.push({ label: 'Decided', value: formatDateTime(req.decided_at) });
		if (req.decision_reason) {
			items.push({
				label: 'Decision reason',
				value: req.decision_reason,
				span: 2,
				multiline: true
			});
		}
		if (req.expires_at)
			items.push({ label: 'Grant expires', value: formatDateTime(req.expires_at) });
		return items;
	}

	const isMutating = $derived(
		approveMutation.isPending || denyMutation.isPending || cancelMutation.isPending
	);
</script>

<div class="stack stack-relaxed">
	<!-- outside the query branch: the loading and error states have their h1 too -->
	<PageHeader title={$_('pages.permissionRequest.title')}>
		{#snippet leading()}
			<BackLink href={resolve('permission-requests')} label="Back to requests" />
		{/snippet}
		{#snippet meta()}
			{#if query.data}
				{@const badge = permissionRequestState(query.data.state)}
				<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
			{/if}
		{/snippet}
	</PageHeader>

	<QueryState
		{query}
		noun="permission request"
		notFound="This request doesn't exist or you don't have access."
	>
		{#snippet children(req)}
			<header class="stack stack-tight">
				<IdChip value={req.id} label="request ID" />
			</header>

			<Card.Root>
				<Card.Header>
					<Card.Title>Details</Card.Title>
				</Card.Header>
				<Card.Content>
					<DescriptionList items={detailItems(req)} />
				</Card.Content>
			</Card.Root>

			{@const decision = decisionControls(req, callerMembershipId, queueItem.data)}
			{#if decision.canDeny}
				<Card.Root>
					<Card.Header>
						<Card.Title>Decision</Card.Title>
						<Card.Description
							>{#if decision.canApprove}Approve grants the permission for {daysOrIndefinite(
									req.duration_days
								)}.
							{/if}Deny requires a reason.</Card.Description
						>
					</Card.Header>
					<Card.Content class="stack stack-relaxed">
						{#if decision.canApprove}
							<TextareaField
								label="Approval note (optional)"
								name="approval_note"
								singleLine
								bind:value={approveReason}
								maxlength={1024}
								rows={2}
								error={approveFailure.field}
							/>
							{#if approveFailure.banner}<Alert variant="destructive">{approveFailure.banner}</Alert
								>{/if}
							<div class="cluster">
								<Button onclick={approve} loading={approveMutation.isPending} disabled={isMutating}>
									<Icon icon={CheckCircle2} size="sm" /> Approve
								</Button>
							</div>
							<hr class="border-border-subtle" />
						{/if}
						<TextareaField
							label="Deny reason (required)"
							name="deny_reason"
							singleLine
							bind:value={denyReason}
							maxlength={1024}
							rows={2}
							required
							error={denyError ?? denyFailure.field}
						/>
						{#if denyFailure.banner}<Alert variant="destructive">{denyFailure.banner}</Alert>{/if}
						<div class="cluster">
							<Button
								variant="destructive"
								onclick={deny}
								loading={denyMutation.isPending}
								disabled={isMutating}
							>
								<Icon icon={XCircle} size="sm" /> Deny
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if canCancel(req, callerMembershipId)}
				<Card.Root>
					<Card.Header>
						<Card.Title>Cancel</Card.Title>
						<Card.Description>You can cancel your own pending request anytime.</Card.Description>
					</Card.Header>
					<Card.Content>
						<Button
							variant="ghost"
							onclick={cancel}
							loading={cancelMutation.isPending}
							disabled={isMutating}
						>
							Cancel request
						</Button>
					</Card.Content>
				</Card.Root>
			{/if}
		{/snippet}
	</QueryState>
</div>
