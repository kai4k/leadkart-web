<script lang="ts">
	import { Toaster as Sonner, type ToasterProps } from 'svelte-sonner';
	let { ...rest }: ToasterProps = $props();
</script>

<Sonner
	class="toaster group"
	position="bottom-right"
	richColors
	closeButton
	toastOptions={{
		classes: {
			toast: 'bg-bg-elevated border border-border rounded-md shadow-lg group toast',
			description: 'group-[.toast]:text-fg-muted',
			actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-fg',
			cancelButton: 'group-[.toast]:bg-bg-muted group-[.toast]:text-fg-muted'
		}
	}}
	{...rest}
/>
