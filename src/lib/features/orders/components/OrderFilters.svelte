<!-- src/lib/features/orders/components/OrderFilters.svelte -->
<script lang="ts" module>
	import type { FilterBarField } from '$lib/components/data';
	import { statusBadge } from '$features/orders/view-models';
	import { orderStatusSchema } from '$features/orders/schemas';

	/**
	 * Field configuration consumed by the foundation FilterBar. Each
	 * `OrderListFilters` key maps to a URL query parameter; the URL is
	 * the single source of truth (`UseUrlFilters`).
	 */
	export type OrderListFilters = {
		q?: string;
		status?: string[];
		customer_lead_id?: string;
		placed_from?: string;
		placed_to?: string;
		total_min?: string;
		total_max?: string;
		sort?: string;
	} & Record<string, string | string[] | undefined>;

	export const orderFilterFields: FilterBarField[] = [
		{
			key: 'status',
			label: 'Status',
			type: 'multi-select',
			options: orderStatusSchema.options.map((s) => ({
				value: s,
				label: statusBadge(s).label
			}))
		},
		{
			key: 'q',
			label: 'Search',
			type: 'text',
			placeholder: 'Order #, customer name…'
		},
		{ key: 'placed', label: 'Placed', type: 'date-range' },
		{
			key: 'total_min',
			label: 'Min total (₹)',
			type: 'text',
			placeholder: '0'
		},
		{
			key: 'total_max',
			label: 'Max total (₹)',
			type: 'text',
			placeholder: '100000'
		}
	];
</script>
