<script lang="ts">
	import { LogOut, User } from 'lucide-svelte';
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

	const initials = $derived(session.principal?.personId.slice(0, 2).toUpperCase() ?? '?');
</script>

<div class="relative">
	<button
		bind:this={triggerEl}
		class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-200)]"
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
			class="absolute top-full right-0 mt-2 w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-1 shadow-md"
			style="z-index: var(--z-popover);"
		>
			<div class="border-b border-[var(--color-border)] px-3 py-2">
				<p class="caption">Signed in as</p>
				<p class="body-sm truncate-1 font-medium">{session.principal?.personId}</p>
			</div>
			<button
				role="menuitem"
				class="body-sm flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg-muted)]"
				onclick={() => {
					open = false;
					goto('/profile');
				}}
			>
				<User size={16} />
				Profile
			</button>
			<button
				role="menuitem"
				class="body-sm flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--color-danger-700)] hover:bg-[var(--color-danger-50)]"
				onclick={handleSignOut}
			>
				<LogOut size={16} />
				Sign out
			</button>
		</div>
	{/if}
</div>
