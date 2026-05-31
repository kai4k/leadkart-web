<script lang="ts" generics="T extends Record<string, unknown>, U extends FormPath<T>">
	import * as FormPrimitive from 'formsnap';
	import type { FormPath } from 'sveltekit-superforms';

	let { ...rest }: FormPrimitive.FieldProps<T, U> = $props();
</script>

<FormPrimitive.Field {...rest} />
