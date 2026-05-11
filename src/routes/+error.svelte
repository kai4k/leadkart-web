<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="max-w-md text-center">
		<h1 class="text-6xl font-bold text-slate-900">{page.status}</h1>
		<p class="mt-4 text-lg text-slate-600">
			{page.error?.message ?? 'Something went wrong.'}
		</p>
		<a
			href="/"
			class="bg-brand-600 hover:bg-brand-700 mt-6 inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
		>
			Back to home
		</a>
	</div>
</div>
