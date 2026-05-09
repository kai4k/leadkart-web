<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Lock } from 'lucide-svelte';
	import { login } from '../api';
	import { loginRequestSchema } from '../schemas';
	import { session } from '../stores/session.svelte';
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$lib/components/ui';
	import { TextField, PasswordField } from '$lib/components/form';

	/**
	 * SigninForm — feature-owned auth form using the cross-feature
	 * primitives + Zod-validated request body + ?next= redirect honor.
	 *
	 * Industry canon for forms in 2026 SvelteKit:
	 *   • bind:value + onsubmit handler for the simple 2-field case
	 *   • Zod for client + server-shape parity
	 *   • aria-busy on submit, focus the error region on failure
	 *
	 * sveltekit-superforms is the heavier-weight option for complex
	 * multi-step forms; for the 2-field signin path the bind+Zod combo
	 * is leaner without losing type-safety or accessibility.
	 */

	// `?email=` prefill from /register success → /signin redirect.
	// Read once at mount; subsequent edits are user-driven.
	let email = $state(page.url.searchParams.get('email') ?? '');
	let password = $state('');
	let loading = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<{ email?: string; password?: string }>({});
	let errorRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		const parsed = loginRequestSchema.safeParse({ email, password });
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = {
				email: flat.email?.[0],
				password: flat.password?.[0]
			};
			return;
		}

		loading = true;
		try {
			const resp = await login(parsed.data);
			// Email captured from the form input — server doesn't echo it
			// in the LoginResponse body. UserMenu + audit-log surfaces
			// reference it.
			session.setFromLogin(resp, parsed.data.email);
			const next = page.url.searchParams.get('next');
			const target = next && next.startsWith('/') ? decodeURIComponent(next) : '/dashboard';
			await goto(target);
		} catch (err) {
			if (isApiError(err) && err.status === 401) {
				formError = $_('auth.errors.invalidCredentials');
			} else {
				formError = $_('auth.errors.unexpected');
			}
			// Move focus to the error region for screen-reader announcement.
			queueMicrotask(() => errorRegion?.focus());
		} finally {
			loading = false;
		}
	}
</script>

<!-- Glass card — frosted surface with top specular flare + entrance animation
     + slow border-glow pulse. Mirrors the Blazor `lk-login-card` shape per
     LeadKart.Web.Client/Components/Pages/Auth/Login.razor.css. -->
<div class="lk-auth-card stack stack-relaxed">
	<!-- Top flare — specular highlight clipped to top half of the card -->
	<div class="lk-auth-card-flare" aria-hidden="true"></div>

	<div class="stack stack-tight relative z-1 text-center">
		<h1 class="h1 text-[var(--color-brand-700)]">{$_('auth.signin.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('auth.signin.subtitle')}</p>
	</div>

	<form class="stack relative z-1" onsubmit={onSubmit} novalidate>
		<TextField
			label={$_('auth.signin.email')}
			type="email"
			autocomplete="email"
			required
			bind:value={email}
			error={fieldErrors.email}
		/>

		<PasswordField
			label={$_('auth.signin.password')}
			required
			bind:value={password}
			error={fieldErrors.password}
		/>

		{#if formError}
			<div bind:this={errorRegion} tabindex="-1">
				<Alert variant="danger">{formError}</Alert>
			</div>
		{/if}

		<Button type="submit" {loading} fullWidth size="lg">
			{loading ? $_('common.loading') : $_('auth.signin.submit')}
		</Button>

		<div class="stack stack-tight text-center">
			<a
				href="/forgot-password"
				class="body-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
			>
				{$_('auth.signin.forgot')}
			</a>
			<div>
				<span class="body-sm text-[var(--color-fg-muted)]">{$_('auth.signin.signupPrompt')}</span>
				<a
					href="/register"
					class="body-sm ml-1 text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
				>
					{$_('auth.signin.signupCta')}
				</a>
			</div>
		</div>
	</form>

	<!-- Security trust badge — "256-bit SSL encrypted" microcopy with shield -->
	<div
		class="relative z-1 flex items-center justify-center gap-2 border-t border-[var(--color-border)] pt-4 text-[var(--color-fg-subtle)]"
	>
		<Lock size={14} aria-hidden="true" />
		<span class="caption">256-bit SSL encrypted</span>
	</div>
</div>

<style>
	/* ── Glass auth card — frosted surface, entrance animation, border glow.
	     Ported from Blazor `.lk-login-card` per Login.razor.css. ── */
	.lk-auth-card {
		position: relative;
		overflow: hidden;
		border-radius: 1.5rem;
		padding: clamp(1.5rem, 4vw, 2.5rem);
		background: color-mix(in srgb, var(--color-bg-elevated) 78%, transparent);
		backdrop-filter: blur(40px) saturate(1.4);
		-webkit-backdrop-filter: blur(40px) saturate(1.4);
		border: 1px solid rgb(255 255 255 / 0.5);
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.3),
			0 8px 40px rgb(0 0 0 / 0.08),
			0 2px 8px rgb(0 0 0 / 0.04);
		animation:
			lk-auth-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards,
			lk-auth-card-border-glow 4s ease-in-out 1s infinite;
	}

	.lk-auth-card-flare {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(
			180deg,
			rgb(255 255 255 / 0.5) 0%,
			rgb(255 255 255 / 0.15) 30%,
			transparent 100%
		);
		border-radius: 1.5rem 1.5rem 0 0;
		pointer-events: none;
		z-index: 0;
		mask-image: linear-gradient(180deg, black 0%, transparent 70%);
		-webkit-mask-image: linear-gradient(180deg, black 0%, transparent 70%);
	}

	@keyframes lk-auth-card-enter {
		0% {
			opacity: 0;
			transform: translateY(1.875rem) scale(0.97);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes lk-auth-card-border-glow {
		0%,
		100% {
			border-color: rgb(255 255 255 / 0.3);
		}
		50% {
			border-color: color-mix(in srgb, var(--color-brand-500) 30%, rgb(255 255 255 / 0.6));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lk-auth-card {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-transparency) {
		.lk-auth-card {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: var(--color-bg-elevated);
		}
		.lk-auth-card-flare {
			display: none;
		}
	}
</style>
