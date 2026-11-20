<script lang="ts">
	import { Alert, Badge, Button, Card, CopyButton, Skeleton } from '$ui';
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
	import { formatDateTime } from '#lib/utils/format.ts';

	type Props = { id: string };
	let { id }: Props = $props();

	// Go decides per request by the authority policy; the buttons need the approve permission.
	const mayDecide = $derived(session.canAny(...ACTION.requestDecide));
	const callerMembershipId = $derived(session.principal?.membershipId ?? '');

	const query = permissionRequestDetailQuery(() => id);
	const req = $derived(query.data ?? null);

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

	{#if query.isPending}
		<div class="stack stack-relaxed" aria-busy="true">
			<Skeleton class="h-7 w-1/2" />
			<Skeleton class="h-32 w-full rounded-md" />
		</div>
	{:else if query.isError || !req}
		<Alert variant="warning" title="Request not found">
			This request doesn't exist or you don't have access.
		</Alert>
	{:else}
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
				<dl class="grid grid-cols-2 gap-x-6 gap-y-3">
					<div>
						<dt class="caption text-fg-muted">Permission</dt>
						<dd><code class="body-base">{req.permission}</code></dd>
					</div>
					<div>
						<dt class="caption text-fg-muted">Duration</dt>
						<dd class="body-base">{daysOrIndefinite(req.duration_days)}</dd>
					</div>
					<div class="col-span-2">
						<dt class="caption text-fg-muted">Reason</dt>
						<dd class="body-base whitespace-pre-wrap">{req.reason}</dd>
					</div>
					<div>
						<dt class="caption text-fg-muted">Submitted</dt>
						<dd class="body-base">{formatDateTime(req.created_at)}</dd>
					</div>
					{#if req.decided_at}
						<div>
							<dt class="caption text-fg-muted">Decided</dt>
							<dd class="body-base">{formatDateTime(req.decided_at)}</dd>
						</div>
					{/if}
					{#if req.decision_reason}
						<div class="col-span-2">
							<dt class="caption text-fg-muted">Decision reason</dt>
							<dd class="body-base whitespace-pre-wrap">{req.decision_reason}</dd>
						</div>
					{/if}
					{#if req.expires_at}
						<div>
							<dt class="caption text-fg-muted">Grant expires</dt>
							<dd class="body-base">{formatDateTime(req.expires_at)}</dd>
						</div>
					{/if}
				</dl>
			</Card.Content>
		</Card.Root>

		{#if mayDecide && canDecide(req, callerMembershipId)}
			<Card.Root>
				<Card.Header>
					<Card.Title>Decision</Card.Title>
					<Card.Description
						>Approve grants the permission for {daysOrIndefinite(req.duration_days)}. Deny requires
						a reason.</Card.Description
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
	{/if}
</div>
