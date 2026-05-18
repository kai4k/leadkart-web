<script lang="ts">
	import { Avatar, Badge, Button, Dropdown } from '$ui';
	import { MoreVertical, UserMinus, UserPlus, Shield, Users, Lock, Unlock, Icon } from '$icons';
	import {
		userStatusBadge,
		userRoleBadges,
		managerLabel,
		canDeactivate
	} from '$features/users/view-models';
	import { displayName, initials } from '$features/auth/view-models';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';

	type Props = {
		user: UserDto;
		onAction: (
			action: 'deactivate' | 'reactivate' | 'roles' | 'manager' | 'permissions' | 'unlock',
			user: UserDto
		) => void;
	};

	let { user, onAction }: Props = $props();

	const status = $derived(userStatusBadge(user.status));
	const roles = $derived(userRoleBadges(user, users.roles));
	const manager = $derived(managerLabel(user, users.list));
</script>

<li
	class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3"
>
	<Avatar initials={initials(user)} size="md" />
	<div class="stack stack-tight min-w-0">
		<span class="body-base truncate font-medium text-[var(--color-fg)]">{displayName(user)}</span>
		<span class="caption truncate text-[var(--color-fg-muted)]">{user.email}</span>
	</div>
	<div class="stack stack-tight hidden md:flex">
		<span class="caption text-[var(--color-fg-muted)]">{user.designation || '—'}</span>
		<span class="caption text-[var(--color-fg-subtle)]">{user.department || '—'}</span>
	</div>
	<div class="cluster cluster-tight">
		{#each roles as r (r.id)}
			<Badge variant="brand" style="soft" size="sm">{r.name}</Badge>
		{/each}
		<Badge variant={status.variant} style="soft" size="sm">{status.label}</Badge>
	</div>
	<Dropdown.Root>
		<Dropdown.Trigger>
			<Button variant="ghost" size="sm" aria-label="Row actions">
				<Icon icon={MoreVertical} size="sm" />
			</Button>
		</Dropdown.Trigger>
		<Dropdown.Menu>
			<Dropdown.Item onclick={() => onAction('roles', user)}>
				<Icon icon={Shield} size="sm" /> Manage roles
			</Dropdown.Item>
			<Dropdown.Item onclick={() => onAction('manager', user)}>
				<Icon icon={Users} size="sm" /> Set manager
			</Dropdown.Item>
			<Dropdown.Item onclick={() => onAction('permissions', user)}>
				<Icon icon={Lock} size="sm" /> Permission overrides
			</Dropdown.Item>
			<Dropdown.Separator />
			<Dropdown.Item onclick={() => onAction('unlock', user)}>
				<Icon icon={Unlock} size="sm" /> Unlock
			</Dropdown.Item>
			{#if canDeactivate(user)}
				<Dropdown.Item variant="danger" onclick={() => onAction('deactivate', user)}>
					<Icon icon={UserMinus} size="sm" /> Deactivate
				</Dropdown.Item>
			{:else if user.status === 'inactive'}
				<Dropdown.Item onclick={() => onAction('reactivate', user)}>
					<Icon icon={UserPlus} size="sm" /> Reactivate
				</Dropdown.Item>
			{/if}
		</Dropdown.Menu>
	</Dropdown.Root>
</li>

{#if manager}
	<!-- Manager line consumed by aria label / reserved for future detail panel -->
{/if}
