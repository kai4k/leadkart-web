<script lang="ts">
	/** A layout's own PageHeader, then a page's PageHeader below NestedPageHeaders (the tenant-context pages). */
	import PageHeader from '$layouts/PageHeader.svelte';
	import NestedPageHeaders from '$layouts/NestedPageHeaders.svelte';
</script>

<PageHeader
	title="Acme"
	crumbs={[{ label: 'Tenants', href: '/operator/tenants' }, { label: 'Acme' }]}
/>
<NestedPageHeaders>
	<PageHeader title="Team" />
</NestedPageHeaders>
