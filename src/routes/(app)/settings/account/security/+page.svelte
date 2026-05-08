<script lang="ts">
	import { _ } from 'svelte-i18n';

	/**
	 * /settings/account/security — Account & Security page. Header +
	 * page intro for now; ChangePasswordForm + ChangeEmailForm Cards
	 * land in the next two commits (A6 + A7).
	 */
</script>

<svelte:head>
	<title>{$_('account.security.title')} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">{$_('account.security.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('account.security.subtitle')}</p>
	</header>
</div>
