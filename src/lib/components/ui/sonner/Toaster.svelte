<script lang="ts">
	/**
	 * Sonner-backed Toaster mount. ONE instance per app, mounted in
	 * (app)/+layout.svelte. Apple Liquid Glass material applied via the
	 * `.glass-toast` skin in src/styles/utilities.css targeting the
	 * `[data-sonner-toast]` selector emitted by svelte-sonner.
	 *
	 * Call API (from svelte-sonner) preserved verbatim:
	 *   toast.success(msg, opts?)
	 *   toast.error(msg, opts?)
	 *   toast.warning(msg, opts?)
	 *   toast.info(msg, opts?)
	 *   toast(msg, opts?)           — neutral
	 *   toast.promise(p, { loading, success, error })
	 *   toast.dismiss(id)
	 */
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
			description: 'group-[.toast]:text-muted-foreground',
			actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
			cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
		}
	}}
	{...rest}
/>
