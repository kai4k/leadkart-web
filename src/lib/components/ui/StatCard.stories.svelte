<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Users, Building2, ShoppingCart, TrendingUp } from '$lib/icons';
	import StatCard from './StatCard.svelte';

	/**
	 * StatCard — KPI tile for dashboards.
	 *
	 * Props: label, value, delta (period comparison), icon, accent.
	 * Industry refs: Stripe Dashboard payment KPIs, Linear cycle health
	 * tiles, Vercel analytics overview.
	 */
	const { Story } = defineMeta({
		title: 'UI/StatCard',
		component: StatCard,
		tags: ['autodocs']
	});
</script>

<Story name="Basic value">
	<div style="width: 280px;">
		<StatCard label="Tenants" value={12} />
	</div>
</Story>

<Story name="With icon + delta (up)">
	<div style="width: 280px;">
		<StatCard
			label="Active tenants"
			value={9}
			delta={{ value: 12.5, period: 'vs last month' }}
			icon={Building2}
		/>
	</div>
</Story>

<Story name="With delta (down)">
	<div style="width: 280px;">
		<StatCard
			label="Suspended"
			value={3}
			delta={{ value: -8.2, period: 'vs last month' }}
			icon={Users}
		/>
	</div>
</Story>

<Story name="Loading">
	<div style="width: 280px;">
		<StatCard label="Memberships" value="—" loading />
	</div>
</Story>

<Story name="KPI grid (4-up)">
	<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; width: 960px;">
		<StatCard
			label="Tenants"
			value={12}
			icon={Building2}
			delta={{ value: 2, period: 'this week' }}
		/>
		<StatCard label="Persons" value={156} icon={Users} delta={{ value: 14, period: 'this week' }} />
		<StatCard
			label="Active memberships"
			value={132}
			icon={Users}
			delta={{ value: 3.2, period: 'this week' }}
		/>
		<StatCard
			label="Orders this week"
			value={47}
			icon={ShoppingCart}
			delta={{ value: -5.1, period: 'vs last week' }}
		/>
	</div>
</Story>
