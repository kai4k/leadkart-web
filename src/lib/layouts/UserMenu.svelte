<script lang="ts">
	import { LogOut, User, Icon } from '$icons';
	import { goto } from '$app/navigation';
	import { session } from '$features/auth/stores/session.svelte';
	import { logout } from '$features/auth/api';

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let menuEl: HTMLDivElement | undefined = $state();

	function close() {
		open = false;
		triggerEl?.focus();
	}

	function onDocumentClick(e: MouseEvent) {
		if (!open) return;
		const target = e.target as Node;
		if (menuEl?.contains(target) || triggerEl?.contains(target)) return;
		open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) close();
	}

	$effect(() => {
		document.addEventListener('click', onDocumentClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocumentClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	async function handleSignOut() {
		const refreshToken = session.refreshToken;
		if (refreshToken) {
			try {
				await logout(refreshToken);
			} catch {
				/* ignore — user signed out locally regardless */
			}
		}
		session.clear();
		open = false;
		await goto('/signin');
	}

	/**
	 * Initials from the email's local part — falls back to the first
	 * letter of the local part if the email lacks separators (e.g.
	 * "ravi@acme.test" → "R", "ravi.kumar@acme.test" → "RK"). Mirrors
	 * the .NET LeadKart UserAvatar logic + Stripe / Linear / Vercel
	 * canon for missing-display-name avatars.
	 */
	const initials = $derived.by(() => {
		const email = session.principal?.email;
		if (!email) return '?';
		const local = email.split('@')[0] ?? '';
		const parts = local.split(/[._-]+/).filter(Boolean);
		if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return '?';
	});
</script>

<div class="relative">
	<button
		bind:this={triggerEl}
		class="lk-avatar-btn"
		aria-label="User menu"
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span class="caption font-semibold">{initials}</span>
	</button>

	{#if open}
		<div
			bind:this={menuEl}
			role="menu"
			class="lk-user-popover glass-popover"
			style="z-index: var(--z-popover);"
		>
			<div class="lk-user-popover-header">
				<p class="caption">Signed in as</p>
				<p class="label truncate-1">{session.principal?.email ?? '—'}</p>
			</div>
			<button
				role="menuitem"
				class="lk-user-popover-item"
				onclick={() => {
					open = false;
					goto('/settings/account/security');
				}}
			>
				<Icon icon={User} size="sm" />
				Account & Security
			</button>
			<button
				role="menuitem"
				class="lk-user-popover-item lk-user-popover-item--danger"
				onclick={handleSignOut}
			>
				<Icon icon={LogOut} size="sm" />
				Sign out
			</button>
		</div>
	{/if}
</div>

<style>
	/* ─── Avatar trigger — glass-tinted circle ────────────────────
	   Brand-tinted glass pill: brand-100 base fades to glass-pill on
	   hover with a top-edge specular. Matches the Topbar icon button
	   visual language (rounded glass pill on hover + tap). */
	.lk-avatar-btn {
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
	.lk-avatar-btn:active {
		transform: scale(0.96);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-avatar-btn:hover {
			background: var(--color-brand-200);
		}
	}
	@media (pointer: coarse) {
		.lk-avatar-btn {
			inline-size: var(--lk-touch-target-min);
			block-size: var(--lk-touch-target-min);
		}
	}

	/* Popover layout only — visual treatment composes from
	   .glass-popover utility (utilities.css). */
	.lk-user-popover {
		position: absolute;
		inset-block-start: 100%;
		inset-inline-end: 0;
		margin-block-start: 0.5rem;
		inline-size: 14rem;
		padding-block: 0.25rem;
		overflow: hidden;
	}

	.lk-user-popover-header {
		padding: 0.625rem 0.875rem;
		border-block-end: var(--glass-border-subtle);
	}

	.lk-user-popover-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		inline-size: 100%;
		padding: 0.5rem 0.875rem;
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-body);
		color: var(--color-fg);
		text-align: start;
		transition:
			background 0.12s,
			color 0.12s;
	}
	/* Inset focus ring — popover items sit edge-to-edge inside the
	   popover; outside-offset would clip on the popover's rounded
	   corners. Inset offset is a legitimate override of the global. */
	.lk-user-popover-item:focus-visible {
		outline: var(--border-medium) solid var(--color-focus-ring);
		outline-offset: calc(var(--border-medium) * -1);
	}
	.lk-user-popover-item:active {
		background: var(--glass-pill-bg);
	}
	.lk-user-popover-item--danger {
		color: var(--color-danger-700);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-user-popover-item:hover {
			background: var(--glass-pill-bg);
		}
		.lk-user-popover-item--danger:hover {
			background: var(--color-danger-50);
		}
	}
	@media (pointer: coarse) {
		.lk-user-popover-item {
			min-block-size: var(--lk-touch-target-min);
			padding-block: 0.75rem;
		}
	}
</style>
