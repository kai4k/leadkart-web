<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '$layouts/PageHeader.svelte';
	import { Badge, Button, Card, CopyButton, DescriptionList, type DescriptionItem } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { TextareaField } from '$form';
	import { formatDateTime } from '#lib/utils/format.ts';
	import { ChevronLeft, CheckCircle2, XCircle, Icon } from '$icons';
	import {
		permissionRequestDetailQuery,
		permissionRequestQueueItemQuery,
		approvePermissionRequestMutation,
		denyPermissionRequestMutation,
		cancelPermissionRequestMutation
	} from '$features/permission-requests/queries';
	import {
		permissionRequestState,
		canCancel,
		canDecide,
		decisionControls,
		daysOrIndefinite
	} from '$features/permission-requests/view-models';
	import { session } from '$features/auth';
	import { resolve } from '$app/paths';
	import type { PermissionRequestDto } from '$features/permission-requests/schemas';

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
	<a
		href={resolve('permission-requests')}
		class="cluster cluster-tight text-muted-foreground hover:text-foreground caption inline-flex"
	>
		<Icon icon={ChevronLeft} size="xs" /> Back to requests
	</a>

	<QueryState
		{query}
		noun="permission request"
		notFound="This request doesn't exist or you don't have access."
	>
		{#snippet children(req)}
			{@const badge = permissionRequestState(req.state)}
			<PageHeader title={$_('pages.permissionRequest.title')}>
				{#snippet meta()}
					<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
				{/snippet}
			</PageHeader>
			<header class="stack stack-tight">
				<div class="cluster cluster-tight">
					<code class="caption text-muted-foreground">{req.id}</code>
					<CopyButton value={req.id} label="Copy request ID" />
				</div>
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
								bind:value={approveReason}
								maxlength={1024}
								rows={2}
							/>
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
							bind:value={denyReason}
							maxlength={1024}
							rows={2}
							required
							error={denyError}
						/>
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
