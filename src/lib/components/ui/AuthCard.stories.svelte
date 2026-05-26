<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AuthCard from './AuthCard.svelte';
	import Button from './Button.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import PasswordField from '$lib/components/form/PasswordField.svelte';
	import Logo from './Logo.svelte';

	const { Story } = defineMeta({
		title: 'Layout/AuthCard',
		component: AuthCard,
		tags: ['autodocs']
	});
</script>

<Story name="Sign in">
	<div
		style="width: 440px; padding: 32px; background: linear-gradient(135deg, var(--color-brand-300) 0%, var(--color-brand-600) 100%);"
	>
		<AuthCard>
			<div class="stack stack-tight items-center">
				<Logo size="lg" />
				<h1 class="h3 text-center">Welcome back</h1>
				<p class="body-sm text-fg-muted text-center">Sign in to your LeadKart account.</p>
			</div>
			<form class="stack">
				<TextField label="Email" type="email" required />
				<PasswordField label="Password" required />
				<div class="form-footer">
					<Button type="submit" fullWidth>Sign in</Button>
				</div>
			</form>
			<p class="body-sm text-fg-muted text-center">
				Don't have an account? <a href="/" class="text-primary hover:underline">Sign up</a>
			</p>
		</AuthCard>
	</div>
</Story>

<Story name="Forgot password">
	<div
		style="width: 440px; padding: 32px; background: linear-gradient(135deg, var(--color-brand-300) 0%, var(--color-brand-600) 100%);"
	>
		<AuthCard>
			<div class="stack stack-tight items-center">
				<Logo size="md" />
				<h1 class="h4 text-center">Reset your password</h1>
				<p class="body-sm text-fg-muted text-center">
					Enter your email and we'll send you a reset link.
				</p>
			</div>
			<form class="stack">
				<TextField label="Email" type="email" required />
				<div class="form-footer">
					<Button type="submit" fullWidth>Send reset link</Button>
				</div>
			</form>
		</AuthCard>
	</div>
</Story>

<Story name="Tight layout (verify code)">
	<div
		style="width: 440px; padding: 32px; background: linear-gradient(135deg, var(--color-brand-300) 0%, var(--color-brand-600) 100%);"
	>
		<AuthCard layoutClass="stack">
			<div class="stack stack-tight items-center">
				<Logo size="md" />
				<h1 class="h4 text-center">Check your email</h1>
				<p class="body-sm text-fg-muted text-center">
					We sent a 6-digit code to priya@acme.com. Enter it below.
				</p>
			</div>
			<form class="stack">
				<TextField label="Verification code" placeholder="123456" />
				<div class="form-footer">
					<Button type="submit" fullWidth>Verify</Button>
				</div>
			</form>
		</AuthCard>
	</div>
</Story>
