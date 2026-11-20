<script lang="ts">
	/**
	 * LeadComplianceCard — drug licence, GSTIN, PAN compliance summary.
	 * Pure presentation; the parent's data query owns the loading state.
	 */
	import { Card, Badge } from '$ui';
	import { Icon, Check, X, ShieldCheck } from '$icons';
	import type { CrmLeadDto } from '../schemas';

	type Props = { lead: CrmLeadDto };
	let { lead }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<div class="cluster cluster-tight">
			<Icon icon={ShieldCheck} size="sm" />
			<h3 class="h5">Compliance</h3>
		</div>
	</Card.Header>
	<Card.Content>
		<dl class="stack stack-tight">
			<div class="cluster cluster-spread">
				<dt class="label text-muted-foreground">Drug licence</dt>
				<dd>
					{#if lead.has_drug_licence}
						<Badge variant="success" size="sm">
							<span class="cluster cluster-tight items-center"
								><Icon icon={Check} size="xs" /> Yes</span
							>
						</Badge>
					{:else}
						<Badge variant="neutral" size="sm">
							<span class="cluster cluster-tight items-center"><Icon icon={X} size="xs" /> No</span>
						</Badge>
					{/if}
				</dd>
			</div>

			<div class="cluster cluster-spread">
				<dt class="label text-muted-foreground">GST</dt>
				<dd class="cluster cluster-tight">
					{#if lead.has_gst}
						<code class="caption text-foreground">{lead.gst_number ?? '—'}</code>
						{#if lead.gst_verified}
							<Badge variant="success" size="sm">Verified</Badge>
						{:else}
							<Badge variant="warning" size="sm">Unverified</Badge>
						{/if}
					{:else}
						<Badge variant="neutral" size="sm">Not registered</Badge>
					{/if}
				</dd>
			</div>

			<div class="cluster cluster-spread">
				<dt class="label text-muted-foreground">PAN</dt>
				<dd>
					{#if lead.has_pan}
						<code class="caption text-foreground">{lead.pan_number ?? '—'}</code>
					{:else}
						<Badge variant="neutral" size="sm">Not provided</Badge>
					{/if}
				</dd>
			</div>
		</dl>
	</Card.Content>
</Card.Root>
