<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { LogOut, User, Icon } from '#lib/icons/index.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Dropdown } from '#lib/components/ui/index.ts';
	import { initials } from '#lib/utils/person-name.ts';
	import { session } from '#lib/features/auth/index.ts';
	import { confirmLeave } from '#lib/hooks/use-leave-guard.svelte.ts';

	/**
	 * UserMenu — avatar trigger + menu. Composes the `Dropdown` primitive (bits-ui DropdownMenu):
	 * focus management, outside-click, Escape, portal and ARIA menu semantics come from it; this file
	 * owns the content and the avatar look.
	 */

	async function handleSignOut() {
		// unsaved input is asked about ONCE, before the request; declining changes nothing. After a yes the sign-out
		// releases every guard itself (it is never blocked again), and a security reset never asks (confirmLeave is silent).
		if (!confirmLeave()) return;
		try {
			await session.logout();
		} catch {
			/* ignore — BFF clears cookies regardless; navigate anyway */
			await goto(resolve('signin'));
		}
	}

	/**
	 * Initials from the email's local part: "ravi@acme.test" -> "R", "ravi.kumar@acme.test" -> "RK".
	 */
	const monogram = $derived.by(() => {
		const local = session.principal?.email?.split('@')[0] ?? '';
		return initials(local.split(/[._-]+/).join(' '));
	});
</script>

<Dropdown.Root>
	<Dropdown.Trigger
		class="bg-primary-soft text-primary-text focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold outline-none focus-visible:ring-2 pointer-coarse:size-11"
		aria-label={$_('shell.userMenu.label')}
	>
		<span>{monogram}</span>
	</Dropdown.Trigger>
	<Dropdown.Menu align="end" class="w-56">
		<div class="border-border mb-1 border-b px-3 py-2.5">
			<p class="text-muted-foreground text-xs">{$_('shell.userMenu.signedInAs')}</p>
			<p class="truncate text-sm font-medium">{session.principal?.email ?? '—'}</p>
		</div>

		<!-- a real link: open-in-new-tab works, and the leave guard sees a `link` navigation -->
		<Dropdown.Item>
			{#snippet child({ props })}
				<a {...props} href={resolve('settings/account/security')}>
					<Icon icon={User} size="sm" />
					{$_('shell.userMenu.account')}
				</a>
			{/snippet}
		</Dropdown.Item>

		<Dropdown.Item variant="danger" onSelect={handleSignOut}>
			<Icon icon={LogOut} size="sm" />
			{$_('shell.userMenu.signOut')}
		</Dropdown.Item>
	</Dropdown.Menu>
</Dropdown.Root>
