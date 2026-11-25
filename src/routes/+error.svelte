<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { _ } from 'svelte-i18n';
	import { Button } from '#lib/components/ui/index.ts';
	import RouteError, { routeErrorTitleKey } from '#lib/components/feedback/RouteError.svelte';
	import { session } from '#lib/features/auth/index.ts';

	// A 5xx here can come from the (app) layout (capabilities 502, refresh-unreachable 503) where the
	// "home" link leads straight back to the same error: the user must still be able to end the session.
	// The CSRF value exists exactly while a session does; the server renders it into the form, so the
	// button is there from the first byte (no JS needed, e.g. when the client bundle failed to load).
	const csrfToken = $derived(page.data.csrfToken ?? null);
	const showSignOut = $derived(page.status >= 500 && csrfToken !== null);

	// With JS the sign-out goes through the one logout call (header double-submit, client navigation).
	// Without it the native form POST carries the same value as the `csrf` field.
	function signOut(event: SubmitEvent) {
		event.preventDefault();
		void session.logout();
	}
</script>

<main
	id="main-content"
	tabindex="-1"
	class="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-6 p-6 outline-none"
>
	<h1 class="text-foreground text-2xl font-semibold">{$_(routeErrorTitleKey(page.status))}</h1>
	<RouteError
		status={page.status}
		message={page.error?.message}
		homeHref={resolve('/')}
		homeLabel={$_('errors.route.backToHome')}
	/>
	{#if showSignOut}
		<form method="POST" action="/auth/logout" onsubmit={signOut}>
			<input type="hidden" name="csrf" value={csrfToken} />
			<div class="form-footer">
				<Button type="submit" variant="secondary" size="sm">{$_('shell.userMenu.signOut')}</Button>
			</div>
		</form>
	{/if}
</main>
