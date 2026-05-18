<script lang="ts">
	import { Alert, Spinner } from '$ui';
	import SessionsList from '$features/auth/components/SessionsList.svelte';
	import { sessions } from '$features/auth/stores/sessions.svelte';
</script>

{#if sessions.status === 'loading'}
	<div class="cluster"><Spinner size={32} /> Loading sessions…</div>
{:else if sessions.status === 'error' && sessions.error}
	<Alert variant="danger">{sessions.error}</Alert>
{:else}
	<SessionsList />
{/if}
