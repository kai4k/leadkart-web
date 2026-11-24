<script lang="ts">
	import { Card } from '#lib/components/ui/index.ts';
	import { ProfileForm } from '#lib/features/auth/index.ts';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<Card.Root>
	<Card.Content>
		<ProfileForm profile={data.profile} form={form ?? undefined} />
	</Card.Content>
</Card.Root>
