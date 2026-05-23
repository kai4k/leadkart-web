<script lang="ts" module>
	import type { FilterBarField } from '$lib/components/data';
	import type { UrlFilterValue } from '$lib/hooks';
	import { DRUG_SCHEDULE_OPTIONS } from '$features/inventory/view-models';

	export type ProductFilters = {
		q?: string;
		product_category?: string[];
		product_type?: string[];
		drug_schedule?: string[];
		is_active?: string;
		low_stock?: string;
		expiring_within_days?: string;
		[key: string]: UrlFilterValue;
	};

	export function buildProductFilterConfig(
		categories: string[],
		types: string[]
	): FilterBarField[] {
		return [
			{
				key: 'q',
				label: 'Search',
				type: 'text',
				placeholder: 'Brand, generic, manufacturer…'
			},
			{
				key: 'product_category',
				label: 'Category',
				type: 'multi-select',
				options: categories.map((c) => ({ value: c, label: c }))
			},
			{
				key: 'product_type',
				label: 'Type',
				type: 'multi-select',
				options: types.map((t) => ({ value: t, label: t }))
			},
			{
				key: 'drug_schedule',
				label: 'Drug schedule',
				type: 'multi-select',
				options: DRUG_SCHEDULE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
			},
			{ key: 'low_stock', label: 'Low stock only', type: 'boolean' },
			{
				key: 'expiring_within_days',
				label: 'Expiring within (days)',
				type: 'text',
				placeholder: 'e.g. 90'
			},
			{
				key: 'is_active',
				label: 'Status',
				type: 'select',
				options: [
					{ value: 'true', label: 'Active' },
					{ value: 'false', label: 'Inactive' }
				]
			}
		];
	}
</script>
