<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { login } from '$features/auth/api';
	import { setSessionFromLogin } from '$features/auth/stores/session.svelte';
	import { ApiError } from '$api/errors';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = null;
		loading = true;
		try {
			const resp = await login({ email, password });
			setSessionFromLogin(resp);
			await goto('/dashboard');
		} catch (err) {
			if (err instanceof ApiError && err.isUnauthorized()) {
				errorMessage = $_('auth.errors.invalidCredentials');
			} else {
				errorMessage = $_('auth.errors.unexpected');
			}
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('auth.signin.title')} · LeadKart</title>
</svelte:head>

<div class="space-y-6">
	<div class="space-y-2">
		<h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
			{$_('auth.signin.title')}
		</h1>
		<p class="text-sm text-slate-600 dark:text-slate-400">{$_('auth.signin.subtitle')}</p>
	</div>

	<form class="space-y-4" onsubmit={onSubmit}>
		<div class="space-y-1">
			<label for="email" class="text-sm font-medium text-slate-700 dark:text-slate-300">
				{$_('auth.signin.email')}
			</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				bind:value={email}
				class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
			/>
		</div>

		<div class="space-y-1">
			<label for="password" class="text-sm font-medium text-slate-700 dark:text-slate-300">
				{$_('auth.signin.password')}
			</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				bind:value={password}
				class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
			/>
		</div>

		{#if errorMessage}
			<div
				class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
				role="alert"
			>
				{errorMessage}
			</div>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{loading ? $_('common.loading') : $_('auth.signin.submit')}
		</button>

		<div class="text-center text-sm text-slate-600 dark:text-slate-400">
			<a href="/forgot-password" class="text-brand-600 hover:text-brand-700 dark:text-brand-100">
				{$_('auth.signin.forgot')}
			</a>
		</div>
	</form>
</div>
