<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$ui';
	import { session } from '$features/auth';

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

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="max-w-3xl text-center">
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
					<input type="hidden" name="csrf" value={csrfToken} />
					<div class="form-footer">
						<Button type="submit" variant="outline" size="sm">Sign out</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>
