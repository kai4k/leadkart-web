<script lang="ts">
	import { Alert } from '$ui';
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<Alert variant="info" title="Roles tab pending">
	Cross-tenant role viewing ships once the backend exposes role read endpoints scoped by
	X-Tenant-Id. Today the tenant's own admins manage roles via /settings/roles.
</Alert>
