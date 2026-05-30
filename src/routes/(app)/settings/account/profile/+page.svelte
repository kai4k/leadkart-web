<script lang="ts">
	import { Card } from '$ui';
	import ProfileForm from '$features/auth/components/ProfileForm.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<Card.Root>
	<Card.Content>
		<ProfileForm profile={data.profile} form={form ?? undefined} />
	</Card.Content>
</Card.Root>
