<script lang="ts">
	import * as FormPrimitive from 'formsnap';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		errorClasses = '',
		children,
		...rest
	}: FormPrimitive.FieldErrorsProps & { errorClasses?: string } = $props();
</script>

<FormPrimitive.FieldErrors
	bind:ref
	data-slot="form-field-errors"
	class={cn('text-sm font-medium text-danger-700', className)}
	{...rest}
>
	{#snippet children({ errors, errorProps })}
		{#each errors as err (err)}
			<div {...errorProps} class={cn(errorClasses)}>{err}</div>
		{/each}
	{/snippet}
</FormPrimitive.FieldErrors>
