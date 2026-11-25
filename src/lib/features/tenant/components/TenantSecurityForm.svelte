<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Card } from '#lib/components/ui/index.ts';
	import { NumberInput, Switch, type ActionFormResult } from '#lib/components/form/index.ts';
	import TenantSectionForm from './TenantSectionForm.svelte';
	import type { Tenant } from '../types';
	import { PASSWORD_MIN_LENGTH_CEILING, PASSWORD_MIN_LENGTH_FLOOR } from '../schemas.ts';

	/**
	 * TenantSecurityForm — password policy editor via the security form
	 * action. Submits the whole policy as one PATCH per the gateway
	 * contract (atomic replace).
	 */
	type Props = {
		tenant: Tenant;
		/** The action's result; a refused submit also carries the typed policy in `values.password_policy`. */
		form?: ActionFormResult;
	};
	let { tenant, form }: Props = $props();

	const initial = $derived(
		(form?.values?.password_policy as Tenant['password_policy'] | undefined) ??
			tenant.password_policy
	);

	let minLength = $state(untrack(() => tenant.password_policy.min_length));
	let requireUppercase = $state(untrack(() => tenant.password_policy.require_uppercase));
	let requireLowercase = $state(untrack(() => tenant.password_policy.require_lowercase));
	let requireDigit = $state(untrack(() => tenant.password_policy.require_digit));
	let requireSymbol = $state(untrack(() => tenant.password_policy.require_symbol));
	let maxFailedAttempts = $state(untrack(() => tenant.password_policy.max_failed_attempts));
	let lockoutMinutes = $state(untrack(() => tenant.password_policy.lockout_minutes));

	$effect.pre(() => {
		minLength = initial.min_length;
		requireUppercase = initial.require_uppercase;
		requireLowercase = initial.require_lowercase;
		requireDigit = initial.require_digit;
		requireSymbol = initial.require_symbol;
		maxFailedAttempts = initial.max_failed_attempts;
		lockoutMinutes = initial.lockout_minutes;
	});
</script>

<TenantSectionForm
	section="settings"
	result={form}
	relaxed
	successMessage={$_('pages.tenant.form.saved.security')}
>
	{#snippet children({ fieldError })}
		<Card.Root padding="md">
			<Card.Header>
				<Card.Title>Password complexity</Card.Title>
				<Card.Description>
					Minimum length and required character classes for every member's password.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="stack">
					<NumberInput
						label="Minimum length"
						name="min_length"
						hint="NIST SP 800-63B recommends 8 or more. Stripe and GitHub use 8."
						bind:value={minLength}
						min={PASSWORD_MIN_LENGTH_FLOOR}
						max={PASSWORD_MIN_LENGTH_CEILING}
						required
						error={fieldError('password_policy.min_length')}
					/>

					<div class="stack stack-tight">
						<p class="label text-foreground">Required character classes</p>
						<Switch
							label="Require uppercase letter (A–Z)"
							name="require_uppercase"
							checked={requireUppercase}
							onCheckedChange={(c) => (requireUppercase = c)}
							error={fieldError('password_policy.require_uppercase')}
						/>
						<Switch
							label="Require lowercase letter (a–z)"
							name="require_lowercase"
							checked={requireLowercase}
							onCheckedChange={(c) => (requireLowercase = c)}
							error={fieldError('password_policy.require_lowercase')}
						/>
						<Switch
							label="Require digit (0–9)"
							name="require_digit"
							checked={requireDigit}
							onCheckedChange={(c) => (requireDigit = c)}
							error={fieldError('password_policy.require_digit')}
						/>
						<Switch
							label="Require symbol (! @ # …)"
							name="require_symbol"
							checked={requireSymbol}
							onCheckedChange={(c) => (requireSymbol = c)}
							error={fieldError('password_policy.require_symbol')}
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Go accepts and returns these two but does NOT enforce them (the platform lockout is fixed: 10 failures in 15
	     minutes; BFF_API_CHANGES row 49), so they are not controls: the values read back are sent back unchanged. -->
		<input type="hidden" name="max_failed_attempts" value={maxFailedAttempts} />
		<input type="hidden" name="lockout_minutes" value={lockoutMinutes} />
	{/snippet}
</TenantSectionForm>
