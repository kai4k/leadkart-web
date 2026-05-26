<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Timeline from '$ui/timeline';
	import { Check, Truck, MessageCircle, AlertTriangle, FileText } from '$icons';

	const { Story } = defineMeta({
		title: 'UI/Timeline',
		component: Timeline.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Order lifecycle">
	<div style="width: 480px;">
		<Timeline.Root>
			<Timeline.Item
				icon={Check}
				iconAccent="success"
				time="2 days ago"
				datetime="2026-05-23T09:14:00+05:30"
				title="Order placed"
				description="Order #LK-1042 created for 250 units of Cetirizine 10mg."
			/>
			<Timeline.Item
				icon={FileText}
				iconAccent="info"
				time="2 days ago"
				datetime="2026-05-23T10:02:00+05:30"
				title="Invoice generated"
				description="Invoice INV-2026-0418 emailed to billing@medicare.com."
			/>
			<Timeline.Item
				icon={Truck}
				iconAccent="primary"
				time="1 day ago"
				datetime="2026-05-24T18:30:00+05:30"
				title="Shipped"
				description="Picked up by Delhivery. Tracking BLR98765432IN."
			/>
			<Timeline.Item
				icon={Check}
				iconAccent="success"
				time="2h ago"
				datetime="2026-05-25T21:00:00+05:30"
				title="Delivered"
			/>
		</Timeline.Root>
	</div>
</Story>

<Story name="Activity stream (mixed accents)">
	<div style="width: 480px;">
		<Timeline.Root>
			<Timeline.Item
				icon={MessageCircle}
				iconAccent="neutral"
				time="10:14"
				title="Priya Sharma commented"
				description="Followed up via WhatsApp; awaiting purchase confirmation."
			/>
			<Timeline.Item
				icon={Check}
				iconAccent="success"
				time="10:42"
				title="Stage updated"
				description="Lead moved from Contacted → Qualified by Priya Sharma."
			/>
			<Timeline.Item
				icon={AlertTriangle}
				iconAccent="warning"
				time="11:08"
				title="Stale reminder"
				description="No activity in 7 days — auto-reminder created."
			/>
			<Timeline.Item icon={Check} iconAccent="success" time="11:30" title="Reminder dismissed" />
		</Timeline.Root>
	</div>
</Story>

<Story name="Sparse (icon-less dots)">
	<div style="width: 360px;">
		<Timeline.Root>
			<Timeline.Item iconAccent="success" time="May 12" title="Account created" />
			<Timeline.Item iconAccent="info" time="May 14" title="First login" />
			<Timeline.Item iconAccent="primary" time="May 18" title="Tenant onboarded" />
			<Timeline.Item iconAccent="neutral" time="Today" title="Subscription upgraded" />
		</Timeline.Root>
	</div>
</Story>
