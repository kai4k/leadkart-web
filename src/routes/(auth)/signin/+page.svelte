<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { SigninForm } from '#lib/features/auth/index.ts';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
</script>

<svelte:head>
	<title>{$_('auth.signin.title')} · LeadKart</title>
</svelte:head>

<SigninForm {form} notice={data.notice} />
