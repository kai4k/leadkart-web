<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$ui';
	import { TextField, PasswordField } from '$form';
	import { registerTenant } from '../api';
	import { registerTenantSchema } from '../schemas';

	/**
	 * TenantRegisterForm — anonymous tenant onboarding. Creates the
	 * tenant + first admin Person + first Membership in one server-side
	 * transaction (RegisterTenantCommand). On success, redirects to
	 * /signin with the admin email pre-filled so the new admin can
	 * sign in immediately.
	 *
	 * Pattern matches ForgotPasswordForm: bind:value + onsubmit, Zod
	 * parse pre-submit, focused error region for screen readers, no
	 * glass card (utility surface, not the marquee signin experience).
	 *
	 * Server error mapping:
	 *   400 invalid_slug                  → field-level slug error
	 *   400 invalid_email                 → field-level email error
	 *   409 email_has_active_membership   → field-level email error
	 *   anything else                     → form-level generic
	 */

	let slug = $state('');
	let legalName = $state('');
	let displayName = $state('');
	let adminFirstName = $state('');
	let adminLastName = $state('');
	let adminEmail = $state('');
	let adminPassword = $state('');

	let saving = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<{
		slug?: string;
		legal_name?: string;
		display_name?: string;
		admin_first_name?: string;
		admin_last_name?: string;
		admin_email?: string;
		admin_password?: string;
	}>({});
	let errorRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		const parsed = registerTenantSchema.safeParse({
			slug,
			legal_name: legalName,
			display_name: displayName,
			admin_first_name: adminFirstName,
			admin_last_name: adminLastName,
			admin_email: adminEmail,
			admin_password: adminPassword
		});
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = {
				slug: flat.slug?.[0],
				legal_name: flat.legal_name?.[0],
				display_name: flat.display_name?.[0],
				admin_first_name: flat.admin_first_name?.[0],
				admin_last_name: flat.admin_last_name?.[0],
				admin_email: flat.admin_email?.[0],
				admin_password: flat.admin_password?.[0]
			};
			queueMicrotask(() => errorRegion?.focus());
			return;
		}

		saving = true;
		try {
			await registerTenant(parsed.data);
			// Redirect to signin with email pre-filled. The signin form
			// reads ?email= as the initial value when present.
			await goto(`/signin?email=${encodeURIComponent(parsed.data.admin_email)}`);
		} catch (err) {
			if (isApiError(err)) {
				switch (err.code) {
					case 'invalid_slug':
						fieldErrors = { ...fieldErrors, slug: $_('auth.register.errors.slugInvalid') };
						break;
					case 'invalid_email':
						fieldErrors = { ...fieldErrors, admin_email: $_('auth.register.errors.emailInvalid') };
						break;
					case 'email_has_active_membership':
						fieldErrors = {
							...fieldErrors,
							admin_email: $_('auth.register.errors.emailHasActiveMembership')
						};
						break;
					default:
						formError = $_('auth.register.errors.unexpected');
				}
			} else {
				formError = $_('auth.register.errors.unexpected');
			}
			queueMicrotask(() => errorRegion?.focus());
		} finally {
			saving = false;
		}
	}
</script>

<div class="stack stack-relaxed">
	<div class="stack stack-tight">
		<h1 class="h1">{$_('auth.register.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('auth.register.subtitle')}</p>
	</div>

	<form class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
		<fieldset class="stack" disabled={saving}>
			<legend class="h3">{$_('auth.register.sectionCompany')}</legend>

			<TextField
				label={$_('auth.register.slug')}
				hint={$_('auth.register.slugHint')}
				autocomplete="organization"
				required
				bind:value={slug}
				error={fieldErrors.slug}
			/>

			<TextField
				label={$_('auth.register.legalName')}
				hint={$_('auth.register.legalNameHint')}
				autocomplete="organization"
				required
				bind:value={legalName}
				error={fieldErrors.legal_name}
			/>

			<TextField
				label={$_('auth.register.displayName')}
				hint={$_('auth.register.displayNameHint')}
				required
				bind:value={displayName}
				error={fieldErrors.display_name}
			/>
		</fieldset>

		<fieldset class="stack" disabled={saving}>
			<legend class="h3">{$_('auth.register.sectionAdmin')}</legend>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<TextField
					label={$_('auth.register.adminFirstName')}
					autocomplete="given-name"
					required
					bind:value={adminFirstName}
					error={fieldErrors.admin_first_name}
				/>

				<TextField
					label={$_('auth.register.adminLastName')}
					autocomplete="family-name"
					required
					bind:value={adminLastName}
					error={fieldErrors.admin_last_name}
				/>
			</div>

			<TextField
				label={$_('auth.register.adminEmail')}
				hint={$_('auth.register.adminEmailHint')}
				type="email"
				autocomplete="email"
				required
				bind:value={adminEmail}
				error={fieldErrors.admin_email}
			/>

			<PasswordField
				label={$_('auth.register.adminPassword')}
				hint={$_('auth.register.adminPasswordHint')}
				autocomplete="new-password"
				required
				bind:value={adminPassword}
				error={fieldErrors.admin_password}
			/>
		</fieldset>

		{#if formError}
			<div bind:this={errorRegion} tabindex="-1">
				<Alert variant="danger">{formError}</Alert>
			</div>
		{/if}

		<Button type="submit" loading={saving} fullWidth size="lg">
			{saving ? $_('auth.register.submitting') : $_('auth.register.submit')}
		</Button>

		<div class="text-center">
			<span class="body-sm text-[var(--color-fg-muted)]">{$_('auth.register.haveAccount')}</span>
			<a
				href="/signin"
				class="body-sm ml-1 text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
			>
				{$_('auth.register.signin')}
			</a>
		</div>
	</form>
</div>
