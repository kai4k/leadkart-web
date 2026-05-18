<script lang="ts">
	import { Alert } from '$ui';
</script>

<svelte:head><title>Activity · LeadKart</title></svelte:head>

<Alert variant="info" title="Activity log pending">
	Tenant audit log ships once the backend exposes GET /v1/tenants/{'{'}id{'}'}/activity (ADR 0038
	N2).
</Alert>
