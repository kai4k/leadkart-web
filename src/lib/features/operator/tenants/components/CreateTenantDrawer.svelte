<script lang="ts">
	import { Drawer, Button, Alert, Card } from '$ui';
	import { toast } from '$ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { Copy, Icon } from '$icons';
	import { registerTenantMutation } from '$features/operator/tenants/queries';
	import type {
		RegisterTenantRequest,
		RegisterTenantResponse
	} from '$features/operator/tenants/types';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	let slug = $state('');
	let legalName = $state('');
	let displayName = $state('');
	let adminEmail = $state('');
	let adminPassword = $state('');
	let adminFirstName = $state('');
	let adminLastName = $state('');
	let formError = $state<string | null>(null);
	let credentials = $state<{
		email: string;
		password: string;
		tenantId: string;
		slug: string;
		displayName: string;
	} | null>(null);

	// TanStack Query v6 (Svelte 5): result is Svelte 5 reactive state, accessed directly.
	const registerMutation = registerTenantMutation();

	function reset() {
		slug = '';
		legalName = '';
		displayName = '';
		adminEmail = '';
		adminPassword = '';
		adminFirstName = '';
		adminLastName = '';
		formError = null;
		credentials = null;
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		const req: RegisterTenantRequest = {
			slug: slug.trim().toLowerCase(),
			legal_name: legalName.trim(),
			display_name: displayName.trim(),
			admin_email: adminEmail.trim(),
			admin_password: adminPassword,
			admin_first_name: adminFirstName.trim(),
			admin_last_name: adminLastName.trim()
		};
		registerMutation.mutate(req, {
			onSuccess: (resp: RegisterTenantResponse) => {
				credentials = {
					email: req.admin_email,
					password: req.admin_password,
					tenantId: resp.tenant_id,
					slug: req.slug,
					displayName: req.display_name
				};
				toast('success', `Tenant ${req.display_name} registered`);
			},
			onError: (err: unknown) => {
				formError = err instanceof Error ? err.message : 'Failed to register tenant';
			}
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

	const isPending = $derived(registerMutation.isPending);
</script>

<Drawer.Root bind:open onOpenChange={handleClose}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Register tenant</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Creates the tenant + a CompanyOwner membership for the seed admin. The admin signs in with
					the credentials below.
				</p>
			</div>
			<Drawer.Close>
				<button
					type="button"
					class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
					aria-label="Close">×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			{#if credentials}
				<Alert variant="success">
					<strong>{credentials.displayName}</strong> registered (<code>{credentials.slug}</code>).
					Share these credentials with the seed admin (one-time view — not retrievable):
				</Alert>
				<Card.Root class="mt-4">
					<Card.Content class="stack stack-tight">
						<div class="cluster cluster-spread">
							<span class="caption text-[var(--color-fg-muted)]">Tenant ID</span>
							<div class="cluster cluster-tight">
								<code class="caption text-[var(--color-fg-subtle)]">{credentials.tenantId}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy tenant ID"
									onclick={() => copy(credentials!.tenantId)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
						<div class="cluster cluster-spread">
							<span class="caption text-[var(--color-fg-muted)]">Email</span>
							<div class="cluster cluster-tight">
								<code class="label">{credentials.email}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy email"
									onclick={() => copy(credentials!.email)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
						<div class="cluster cluster-spread">
							<span class="caption text-[var(--color-fg-muted)]">Password</span>
							<div class="cluster cluster-tight">
								<code class="label">{credentials.password}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy password"
									onclick={() => copy(credentials!.password)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
				<p class="caption mt-4 text-[var(--color-warning-900)]">
					This password forces a change on first sign-in. Share via a secure channel only.
				</p>
				<div class="cluster mt-4">
					<Button variant="ghost" onclick={reset}>Register another</Button>
					<a
						href="/operator/tenants/{credentials.tenantId}"
						class="label text-[var(--color-primary)] hover:underline">View tenant →</a
					>
					<Button onclick={() => handleClose(false)}>Done</Button>
				</div>
			{:else}
				<form id="register-tenant-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
					<TextField
						label="Slug"
						name="slug"
						bind:value={slug}
						required
						maxlength={60}
						placeholder="acme-pharma"
					/>
					<TextField
						label="Legal name"
						name="legal_name"
						bind:value={legalName}
						required
						maxlength={200}
					/>
					<TextField
						label="Display name"
						name="display_name"
						bind:value={displayName}
						required
						maxlength={200}
					/>
					<h3 class="mt-2 overline">Seed admin</h3>
					<TextField
						label="First name"
						name="admin_first_name"
						bind:value={adminFirstName}
						required
						maxlength={120}
					/>
					<TextField
						label="Last name"
						name="admin_last_name"
						bind:value={adminLastName}
						required
						maxlength={120}
					/>
					<TextField
						label="Email"
						name="admin_email"
						type="email"
						bind:value={adminEmail}
						required
					/>
					<PasswordField
						label="Initial password"
						name="admin_password"
						bind:value={adminPassword}
						required
						minlength={8}
					/>
					{#if formError}<Alert variant="danger">{formError}</Alert>{/if}
				</form>
			{/if}
		</Drawer.Body>
		{#if !credentials}
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost" disabled={isPending}>Cancel</Button>
				</Drawer.Close>
				<Button type="submit" form="register-tenant-form" loading={isPending}
					>Register tenant</Button
				>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
