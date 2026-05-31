<script lang="ts">
	import { LogOut, User, Icon } from '$icons';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Dropdown } from '$ui';
	import { session } from '$features/auth/stores/session.svelte';
	import { myCapabilitiesQuery } from '$features/auth/queries';

	/**
	 * UserMenu — avatar trigger + menu popover. Composes the canonical
	 * `<Dropdown.Root>` primitive (bits-ui DropdownMenu) — focus
	 * management, outside-click, ESC, portal mounting and ARIA menu
	 * semantics come from the primitive; this file owns only content
	 * and the avatar visual treatment.
	 */

	async function handleSignOut() {
		try {
			await session.logout();
		} catch {
			/* ignore — BFF clears cookies regardless; navigate anyway */
			await goto(resolve('/signin'));
		}
	}

	const capsQuery = myCapabilitiesQuery();

	/**
	 * Initials from the email's local part — falls back to the first
	 * letter of the local part if the email lacks separators (e.g.
	 * "ravi@acme.test" → "R", "ravi.kumar@acme.test" → "RK"). Mirrors
	 * the .NET LeadKart UserAvatar logic + Stripe / Linear / Vercel
	 * canon for missing-display-name avatars.
	 */
	const initials = $derived.by(() => {
		const email = capsQuery.data?.email;
		if (!email) return '?';
		const local = email.split('@')[0] ?? '';
		const parts = local.split(/[._-]+/).filter(Boolean);
		if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return '?';
	});
</script>

<Dropdown.Root>
	<Dropdown.Trigger class="lk-avatar-btn" aria-label="User menu">
		<span class="caption font-semibold">{initials}</span>
	</Dropdown.Trigger>
	<Dropdown.Menu align="end" class="lk-user-popover w-56">
		<div class="lk-user-popover-header">
			<p class="caption">Signed in as</p>
			<p class="label truncate-1">{capsQuery.data?.email ?? '—'}</p>
		</div>
		<Dropdown.Item onSelect={() => goto(resolve('/settings/account/security'))}>
			<Icon icon={User} size="sm" />
			Account & Security
		</Dropdown.Item>
		<Dropdown.Item variant="danger" onSelect={handleSignOut}>
			<Icon icon={LogOut} size="sm" />
			Sign out
		</Dropdown.Item>
	</Dropdown.Menu>
</Dropdown.Root>

<style>
	/* ─── Avatar trigger — glass-tinted circle ────────────────────
	   Brand-tinted glass pill: brand-100 base fades to bg-bg-muted on
	   hover with a top-edge specular. Matches the Topbar icon button
	   visual language (rounded glass pill on hover + tap). */
	:global(.lk-avatar-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border-radius: 9999px;
		/* Brand gradient — diagonal from brand-100 to brand-200 (pale
		   logo purples) with a secondary (logo neon green) splash in
		   the bottom-right corner. Matches the LeadKart logo's purple-
		   violet + neon green identity in miniature on every avatar. */
		background:
			radial-gradient(at 70% 80%, var(--color-secondary-200), transparent 60%),
			linear-gradient(135deg, var(--color-brand-100), var(--color-brand-200));
		color: var(--color-primary);
		box-shadow: var(--glass-specular);
		transition:
			background 0.15s,
			box-shadow 0.15s,
			transform 0.15s;
	}
	:global(.lk-avatar-btn:active) {
		transform: scale(0.96);
	}
	@media (hover: hover) and (pointer: fine) {
		:global(.lk-avatar-btn:hover) {
			background: var(--color-brand-200);
		}
	}
	@media (pointer: coarse) {
		:global(.lk-avatar-btn) {
			inline-size: var(--lk-touch-target-min);
			block-size: var(--lk-touch-target-min);
		}
	}

	/* Popover header — sits inside Dropdown.Menu (portalled) so the
	   selector is global-scoped via :global() since svelte-scoped
	   classes don't reach portalled content. */
	:global(.lk-user-popover .lk-user-popover-header) {
		padding: 0.625rem 0.875rem;
		border-block-end: var(--glass-border-subtle);
		margin-block-end: 0.25rem;
	}
</style>
