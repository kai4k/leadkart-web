<script lang="ts">
	import { Badge, Button, Card, CopyButton, DescriptionList, type DescriptionItem } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { formatDateTime } from '#lib/utils/format.ts';
	import { ChevronLeft, CheckCircle2, XCircle, Icon } from '$icons';
	import {
		permissionRequestDetailQuery,
		approvePermissionRequestMutation,
		denyPermissionRequestMutation,
		cancelPermissionRequestMutation
	} from '$features/permission-requests/queries';
	import {
		permissionRequestState,
		canCancel,
		canDecide,
		daysOrIndefinite
	} from '$features/permission-requests/view-models';
	import { ACTION, session } from '$features/auth';
	import { resolve } from '$app/paths';
	import type { PermissionRequestDto } from '$features/permission-requests/schemas';

	type Props = { id: string };
	let { id }: Props = $props();

	// Go decides per request by the authority policy; the buttons need the approve permission.
	const mayDecide = $derived(session.canAny(...ACTION.requestDecide));
	const callerMembershipId = $derived(session.principal?.membershipId ?? '');

	const query = permissionRequestDetailQuery(() => id);

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
		class="cluster cluster-tight text-fg-muted hover:text-fg caption inline-flex"
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
			<header class="stack stack-tight">
				<div class="cluster cluster-tight">
					<h1 class="h1">Permission request</h1>
					<Badge variant={badge.variant} appearance="soft" size="sm">{badge.label}</Badge>
				</div>
				<div class="cluster cluster-tight">
					<code class="caption text-fg-subtle">{req.id}</code>
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

			{#if mayDecide && canDecide(req, callerMembershipId)}
				<Card.Root>
					<Card.Header>
						<Card.Title>Decision</Card.Title>
						<Card.Description
							>Approve grants the permission for {daysOrIndefinite(req.duration_days)}. Deny
							requires a reason.</Card.Description
						>
					</Card.Header>
					<Card.Content class="stack stack-relaxed">
						<label class="stack stack-tight">
							<span class="label">Approval note (optional)</span>
							<textarea
								bind:value={approveReason}
								maxlength={1024}
								rows={2}
								class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
							></textarea>
						</label>
						<div class="cluster">
							<Button onclick={approve} loading={approveMutation.isPending} disabled={isMutating}>
								<Icon icon={CheckCircle2} size="sm" /> Approve
							</Button>
						</div>
						<hr class="border-border-subtle" />
						<label class="stack stack-tight">
							<span class="label">Deny reason (required)</span>
							<textarea
								bind:value={denyReason}
								maxlength={1024}
								rows={2}
								class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
							></textarea>
							{#if denyError}
								<span class="caption text-danger-700">{denyError}</span>
							{/if}
						</label>
						<div class="cluster">
							<Button
								variant="danger"
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
