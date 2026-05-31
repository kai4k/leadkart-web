<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="max-w-md text-center">
		<h1 class="text-fg text-6xl font-bold">{page.status}</h1>
		<p class="text-fg-muted mt-4 text-lg">
			{page.error?.message ?? 'Something went wrong.'}
		</p>
		<a
			href={resolve('/')}
			class="bg-primary text-primary-fg hover:bg-primary-hover mt-6 inline-block rounded-md px-4 py-2 text-sm font-medium"
		>
			Back to home
		</a>
	</div>
</div>
