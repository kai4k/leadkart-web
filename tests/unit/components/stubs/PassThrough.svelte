<script lang="ts">
	// Test stand-in for a layout component that only wraps its children.
	let { children } = $props();
</script>

{@render children?.()}
