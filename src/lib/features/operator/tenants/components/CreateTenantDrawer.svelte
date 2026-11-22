<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Alert, Button, Card, CopyButton } from '$ui';
	import { FormSheet, TextField, PasswordField } from '#lib/components/form/index.ts';
	import { registerTenantMutation } from '../queries';
	import { registerTenantRequestSchema } from '../schemas';
	import { resolve } from '$app/paths';
	import type { z } from 'zod';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	/** The one-time view of what was registered: the seed admin's credentials are not retrievable afterwards. */
	let credentials = $state<{
		email: string;
		password: string;
		tenantId: string;
		slug: string;
		displayName: string;
	} | null>(null);

	const registerMutation = registerTenantMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, registerMutation);
	// the one-time credentials never outlive the sheet
	$effect(() => {
		if (!open) credentials = null;
	});

	async function onSubmit(values: z.output<typeof registerTenantRequestSchema>) {
		const resp = await registerMutation.mutateAsync(values);
		credentials = {
			email: values.admin_email,
			password: values.admin_password,
			tenantId: resp.tenant_id,
			slug: values.slug,
			displayName: values.display_name
		};
	}
</script>

<FormSheet
	bind:open
	{onOpenChange}
	title="Register tenant"
	description="Creates the tenant + a CompanyOwner membership for the seed admin. The admin signs in with the credentials below."
	submitLabel="Register tenant"
	schema={registerTenantRequestSchema}
	initial={() => ({
		slug: '',
		legal_name: '',
		display_name: '',
		admin_email: '',
		admin_password: '',
		admin_first_name: '',
		admin_last_name: ''
	})}
	{onSubmit}
	closeOnSuccess={false}
	done={credentials ? done : undefined}
	formId="register-tenant-form"
>
	{#snippet fields(form)}
		<TextField
			label="Slug"
			name="slug"
			bind:value={form.values.slug}
			required
			maxlength={60}
			placeholder="acme-pharma"
			error={form.errors.slug}
		/>
		<TextField
			label="Legal name"
			name="legal_name"
			bind:value={form.values.legal_name}
			required
			maxlength={200}
			error={form.errors.legal_name}
		/>
		<TextField
			label="Display name"
			name="display_name"
			bind:value={form.values.display_name}
			required
			maxlength={200}
			error={form.errors.display_name}
		/>
		<h3 class="mt-2 overline">Seed admin</h3>
		<TextField
			label="First name"
			name="admin_first_name"
			bind:value={form.values.admin_first_name}
			required
			maxlength={120}
			error={form.errors.admin_first_name}
		/>
		<TextField
			label="Last name"
			name="admin_last_name"
			bind:value={form.values.admin_last_name}
			required
			maxlength={120}
			error={form.errors.admin_last_name}
		/>
		<TextField
			label="Email"
			name="admin_email"
			type="email"
			bind:value={form.values.admin_email}
			required
			error={form.errors.admin_email}
		/>
		<PasswordField
			label="Initial password"
			name="admin_password"
			autocomplete="new-password"
			bind:value={form.values.admin_password}
			required
			minlength={8}
			error={form.errors.admin_password}
		/>
	{/snippet}
</FormSheet>

{#snippet done()}
	{#if credentials}
		<Alert variant="success">
			<strong>{credentials.displayName}</strong> registered (<code>{credentials.slug}</code>). Share
			these credentials with the seed admin (one-time view — not retrievable):
		</Alert>
		<Card.Root class="mt-4">
			<Card.Content class="stack stack-tight">
				<div class="cluster cluster-spread">
					<span class="caption text-muted-foreground">Tenant ID</span>
					<div class="cluster cluster-tight">
						<code class="caption text-subtle-foreground">{credentials.tenantId}</code>
						<CopyButton value={credentials.tenantId} label="Copy tenant ID" />
					</div>
				</div>
				<div class="cluster cluster-spread">
					<span class="caption text-muted-foreground">Email</span>
					<div class="cluster cluster-tight">
						<code class="label">{credentials.email}</code>
						<CopyButton value={credentials.email} label="Copy email" />
					</div>
				</div>
				<div class="cluster cluster-spread">
					<span class="caption text-muted-foreground">Password</span>
					<div class="cluster cluster-tight">
						<code class="label">{credentials.password}</code>
						<CopyButton value={credentials.password} label="Copy password" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		<p class="caption text-warning mt-4">
			This password forces a change on first sign-in. Share via a secure channel only.
		</p>
		<div class="cluster mt-4">
			<Button variant="ghost" onclick={() => (credentials = null)}>Register another</Button>
			<a href={resolve('operator/tenants')} class="label text-primary-text hover:underline"
				>View tenant →</a
			>
			<Button onclick={() => onOpenChange(false)}>Done</Button>
		</div>
	{/if}
{/snippet}
