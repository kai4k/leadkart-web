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
			toast: 'glass-toast group toast',
			description: 'group-[.toast]:text-fg-muted',
			actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-fg',
			cancelButton: 'group-[.toast]:bg-bg-muted group-[.toast]:text-fg-muted'
		}
	}}
	{...rest}
/>
