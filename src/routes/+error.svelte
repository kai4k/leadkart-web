<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="max-w-md text-center">
		<h1 class="text-6xl font-bold text-slate-900 dark:text-slate-100">{page.status}</h1>
		<p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
			{page.error?.message ?? 'Something went wrong.'}
		</p>
		<a
			href="/"
			class="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
		>
			Back to home
		</a>
	</div>
</div>
