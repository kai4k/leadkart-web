<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Button } from '$ui';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'Something went wrong loading this tenant.');
</script>

<div class="stack stack-relaxed">
	<Alert variant={status >= 500 ? 'danger' : 'warning'} title="Couldn't load tenant scope">
		<p>{message}</p>
		<div class="cluster cluster-tight mt-3">
			<Button variant="ghost" size="sm" onclick={() => location.reload()}>Retry</Button>
			<a class="lk-link-btn" href="/operator/tenants">Back to tenants</a>
		</div>
	</Alert>
</div>

<style>
	.lk-link-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
	}
	.lk-link-btn:hover {
		color: var(--color-fg);
		background: var(--color-bg-muted);
	}
</style>
