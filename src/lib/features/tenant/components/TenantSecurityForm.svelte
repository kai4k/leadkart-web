<script lang="ts">
	import { Alert, Button, Card } from '$ui';
	import { NumberInput, Switch } from '$form';
	import { updateTenantSettingsSchema } from '../schemas';
	import { updateTenantSettingsMutation } from '../queries';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantSecurityForm — password policy editor.
	 *
	 * Drives the seven settings stored on `tenant.password_policy`:
	 * minimum length, four character-class requirements, max failed
	 * attempts before lockout, and lockout duration. Submits the whole
	 * policy as one PATCH per the gateway contract (atomic replace —
	 * matches how the Go side rebuilds the policy in one transaction).
	 *
	 * Defaults mirror Auth0 / Microsoft Entra baseline (length 8, all
	 * four classes off, 5 attempts, 15-minute lockout) so a fresh
	 * tenant starts with a workable policy.
	 */

	interface Props {
		tenant: Tenant;
		tenantId: string;
	}

	let { tenant, tenantId }: Props = $props();

	const mutation = $derived(updateTenantSettingsMutation(tenantId));

	const form = useForm(updateTenantSettingsSchema, {
		password_policy: {
			min_length: 8,
			require_uppercase: false,
			require_lowercase: false,
			require_digit: false,
			require_symbol: false,
			max_failed_attempts: 5,
			lockout_minutes: 15
		}
	});

	$effect.pre(() => {
		form.values.password_policy = { ...tenant.password_policy };
	});

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(values, {
					onSuccess: () => resolve(),
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<form class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
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
					hint="NIST SP 800-63B recommends 8 or more. Stripe and GitHub use 8."
					bind:value={form.values.password_policy.min_length}
					min={6}
					max={64}
				/>

				<div class="stack stack-tight">
					<p class="label text-fg">Required character classes</p>
					<Switch
						label="Require uppercase letter (A–Z)"
						checked={form.values.password_policy.require_uppercase}
						onCheckedChange={(c) => (form.values.password_policy.require_uppercase = c)}
					/>
					<Switch
						label="Require lowercase letter (a–z)"
						checked={form.values.password_policy.require_lowercase}
						onCheckedChange={(c) => (form.values.password_policy.require_lowercase = c)}
					/>
					<Switch
						label="Require digit (0–9)"
						checked={form.values.password_policy.require_digit}
						onCheckedChange={(c) => (form.values.password_policy.require_digit = c)}
					/>
					<Switch
						label="Require symbol (! @ # …)"
						checked={form.values.password_policy.require_symbol}
						onCheckedChange={(c) => (form.values.password_policy.require_symbol = c)}
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
					hint="Auth0 default is 10. Set to 0 to disable lockout entirely."
					bind:value={form.values.password_policy.max_failed_attempts}
					min={0}
					max={50}
				/>
				<NumberInput
					label="Lockout duration (minutes)"
					hint="How long the account stays locked once the threshold is hit."
					bind:value={form.values.password_policy.lockout_minutes}
					min={0}
					max={1440}
				/>
			</div>
		</Card.Content>
	</Card.Root>

	{#if form.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" loading={form.isSubmitting}>Save changes</Button>
	</div>
</form>
