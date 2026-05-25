<script lang="ts">
	import { Drawer, Button, Alert, Card } from '$ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { Copy, Icon } from '$icons';
	import { registerTenantMutation } from '$features/operator/tenants/queries';
	import { registerTenantRequestSchema } from '$features/operator/tenants/schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import type { RegisterTenantResponse } from '$features/operator/tenants/types';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	let credentials = $state<{
		email: string;
		password: string;
		tenantId: string;
		slug: string;
		displayName: string;
	} | null>(null);

	// TanStack Query v6 (Svelte 5): result is Svelte 5 reactive state, accessed directly.
	const registerMutation = registerTenantMutation();
	const form = useForm(
		registerTenantRequestSchema,
		{
			slug: '',
			legal_name: '',
			display_name: '',
			admin_email: '',
			admin_password: '',
			admin_first_name: '',
			admin_last_name: ''
		},
		{ validateOn: 'blur' }
	);

	function reset() {
		form.reset();
		credentials = null;
	}

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				registerMutation.mutate(values, {
					onSuccess: (resp: RegisterTenantResponse) => {
						credentials = {
							email: values.admin_email,
							password: values.admin_password,
							tenantId: resp.tenant_id,
							slug: values.slug,
							displayName: values.display_name
						};
						resolve();
					},
					onError: (err: unknown) => reject(err)
				});
			});
		});
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			/* clipboard write may fail in older browsers; no-op */
		}
	}

	function handleClose(next: boolean) {
		if (!next) reset();
		onOpenChange(next);
	}
</script>

<Drawer.Root bind:open onOpenChange={handleClose}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Register tenant</h2>
				<p class="caption text-fg-muted">
					Creates the tenant + a CompanyOwner membership for the seed admin. The admin signs in with
					the credentials below.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			{#if credentials}
				{@const c = credentials}
				<Alert variant="success">
					<strong>{credentials.displayName}</strong> registered (<code>{credentials.slug}</code>).
					Share these credentials with the seed admin (one-time view — not retrievable):
				</Alert>
				<Card.Root class="mt-4">
					<Card.Content class="stack stack-tight">
						<div class="cluster cluster-spread">
							<span class="caption text-fg-muted">Tenant ID</span>
							<div class="cluster cluster-tight">
								<code class="caption text-fg-subtle">{credentials.tenantId}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy tenant ID"
									onclick={() => copy(c.tenantId)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
						<div class="cluster cluster-spread">
							<span class="caption text-fg-muted">Email</span>
							<div class="cluster cluster-tight">
								<code class="label">{credentials.email}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy email"
									onclick={() => copy(c.email)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
						<div class="cluster cluster-spread">
							<span class="caption text-fg-muted">Password</span>
							<div class="cluster cluster-tight">
								<code class="label">{credentials.password}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy password"
									onclick={() => copy(c.password)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
				<p class="caption text-warning-900 mt-4">
					This password forces a change on first sign-in. Share via a secure channel only.
				</p>
				<div class="cluster mt-4">
					<Button variant="ghost" onclick={reset}>Register another</Button>
					<a href="/operator/tenants/{credentials.slug}" class="label text-primary hover:underline"
						>View tenant →</a
					>
					<Button onclick={() => handleClose(false)}>Done</Button>
				</div>
			{:else}
				<form id="register-tenant-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
					<TextField
						label="Slug"
						name="slug"
						bind:value={form.values.slug}
						required
						maxlength={60}
						placeholder="acme-pharma"
						error={form.errors.slug}
						onblur={() => form.validateField('slug')}
					/>
					<TextField
						label="Legal name"
						name="legal_name"
						bind:value={form.values.legal_name}
						required
						maxlength={200}
						error={form.errors.legal_name}
						onblur={() => form.validateField('legal_name')}
					/>
					<TextField
						label="Display name"
						name="display_name"
						bind:value={form.values.display_name}
						required
						maxlength={200}
						error={form.errors.display_name}
						onblur={() => form.validateField('display_name')}
					/>
					<h3 class="mt-2 overline">Seed admin</h3>
					<TextField
						label="First name"
						name="admin_first_name"
						bind:value={form.values.admin_first_name}
						required
						maxlength={120}
						error={form.errors.admin_first_name}
						onblur={() => form.validateField('admin_first_name')}
					/>
					<TextField
						label="Last name"
						name="admin_last_name"
						bind:value={form.values.admin_last_name}
						required
						maxlength={120}
						error={form.errors.admin_last_name}
						onblur={() => form.validateField('admin_last_name')}
					/>
					<TextField
						label="Email"
						name="admin_email"
						type="email"
						bind:value={form.values.admin_email}
						required
						error={form.errors.admin_email}
						onblur={() => form.validateField('admin_email')}
					/>
					<PasswordField
						label="Initial password"
						name="admin_password"
						bind:value={form.values.admin_password}
						required
						minlength={8}
						error={form.errors.admin_password}
						onblur={() => form.validateField('admin_password')}
					/>
					{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
				</form>
			{/if}
		</Drawer.Body>
		{#if !credentials}
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				</Drawer.Close>
				<Button type="submit" form="register-tenant-form" loading={form.isSubmitting}
					>Register tenant</Button
				>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
