<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$ui';
	import { getCsrfToken } from '$api/csrf';
	import { session } from '$features/auth';

	// A 5xx here can come from the (app) layout (capabilities 502, refresh-unreachable 503) where the
	// "home" link leads straight back to the same error: the user must still be able to end the session.
	// The httpOnly cookies are invisible to the page; the non-httpOnly CSRF cookie exists exactly while
	// a session does, so it is the signal. Known only after hydration.
	let hasSession = $state(false);
	onMount(() => {
		hasSession = getCsrfToken() !== '';
	});
	const showSignOut = $derived(page.status >= 500 && hasSession);

	// The logout endpoint is POST + CSRF header (double-submit). A form cannot set a header, so the
	// submit goes through the one logout call that does; without JS the native POST is refused (403).
	function signOut(event: SubmitEvent) {
		event.preventDefault();
		void session.logout();
	}
</script>

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="max-w-md text-center">
		<h1 class="text-fg text-6xl font-bold">{page.status}</h1>
		<p class="text-fg-muted mt-4 text-lg">
			{page.error?.message ?? 'Something went wrong.'}
		</p>
		<div class="mt-6 flex items-center justify-center gap-4">
			<a
				href={resolve('/')}
				class="bg-primary text-primary-fg hover:bg-primary-hover focus-visible:ring-focus-ring inline-block rounded-md px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
			>
				Back to home
			</a>
			{#if showSignOut}
				<form method="POST" action="/auth/logout" onsubmit={signOut}>
					<div class="form-footer">
						<Button type="submit" variant="outline" size="sm">Sign out</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>
