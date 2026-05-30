<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button, Card } from '$ui';
	import { NumberInput, Switch } from '$form';
	import type { Tenant } from '../types';

	/**
	 * TenantSecurityForm — password policy editor via SvelteKit form
	 * action. Submits the whole policy as one PATCH per the gateway
	 * contract (atomic replace).
	 */
	type FormResult = {
		values?: { password_policy: Tenant['password_policy'] };
		errors?: Record<string, string | string[] | undefined>;
		bannerError?: string;
		success?: boolean;
	};
	type Props = { tenant: Tenant; form?: FormResult };
	let { tenant, form }: Props = $props();

	let loading = $state(false);

	const initial = $derived(form?.values?.password_policy ?? tenant.password_policy);

	// Local controlled state for the policy bound to the form inputs.
	// Re-seeded from `initial` on every form-prop refresh via $effect.pre.
	let minLength = $state(tenant.password_policy.min_length);
	let requireUppercase = $state(tenant.password_policy.require_uppercase);
	let requireLowercase = $state(tenant.password_policy.require_lowercase);
	let requireDigit = $state(tenant.password_policy.require_digit);
	let requireSymbol = $state(tenant.password_policy.require_symbol);
	let maxFailedAttempts = $state(tenant.password_policy.max_failed_attempts);
	let lockoutMinutes = $state(tenant.password_policy.lockout_minutes);

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

<form
	class="stack stack-relaxed"
	method="POST"
	novalidate
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	}}
>
	<Card.Root padding="md" elevation="sm">
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
					min={6}
					max={64}
				/>

				<div class="stack stack-tight">
					<p class="label text-fg">Required character classes</p>
					<Switch
						label="Require uppercase letter (A–Z)"
						name="require_uppercase"
						checked={requireUppercase}
						onCheckedChange={(c) => (requireUppercase = c)}
					/>
					<Switch
						label="Require lowercase letter (a–z)"
						name="require_lowercase"
						checked={requireLowercase}
						onCheckedChange={(c) => (requireLowercase = c)}
					/>
					<Switch
						label="Require digit (0–9)"
						name="require_digit"
						checked={requireDigit}
						onCheckedChange={(c) => (requireDigit = c)}
					/>
					<Switch
						label="Require symbol (! @ # …)"
						name="require_symbol"
						checked={requireSymbol}
						onCheckedChange={(c) => (requireSymbol = c)}
					/>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root padding="md" elevation="sm">
		<Card.Header>
			<Card.Title>Account lockout</Card.Title>
			<Card.Description>
				Throttle brute-force attacks. After the maximum failed attempts, the account is temporarily
				locked.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<NumberInput
					label="Max failed attempts"
					name="max_failed_attempts"
					hint="Auth0 default is 10. Set to 0 to disable lockout entirely."
					bind:value={maxFailedAttempts}
					min={0}
					max={50}
				/>
				<NumberInput
					label="Lockout duration (minutes)"
					name="lockout_minutes"
					hint="How long the account stays locked once the threshold is hit."
					bind:value={lockoutMinutes}
					min={0}
					max={1440}
				/>
			</div>
		</Card.Content>
	</Card.Root>

	{#if form?.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{:else if form?.success}
		<Alert variant="success">Security settings saved.</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>Save changes</Button>
	</div>
</form>
