<!--
	OrderLifecycleStepper — renders the 10-state happy-path ladder
	using <Stepper.Root> from $ui. Driven by `lifecycleStepsFor(order)`
	which marks pre-current steps complete, the current step
	highlighted, and (when the order is cancelled) the step where
	cancellation happened with an `error` state.
-->
<script lang="ts">
	import { Stepper } from '$ui';
	import { lifecycleStepsFor } from '$features/orders/view-models';
	import type { OrderDto } from '$features/orders/schemas';

	type Props = { order: OrderDto };
	let { order }: Props = $props();

	const steps = $derived(lifecycleStepsFor(order));
</script>

<div data-testid="order-lifecycle-stepper" class="w-full overflow-x-auto">
	<Stepper.Root ariaLabel="Order lifecycle">
		{#each steps as step, idx (step.id)}
			<Stepper.Step
				index={idx + 1}
				label={step.label}
				state={step.state}
				last={idx === steps.length - 1}
			/>
		{/each}
	</Stepper.Root>
</div>
