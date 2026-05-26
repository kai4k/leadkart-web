<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Accordion from '$ui/accordion';

	const { Story } = defineMeta({
		title: 'UI/Accordion',
		component: Accordion.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Single (default)">
	<div style="width: 560px;">
		<Accordion.Root type="single" value="general">
			<Accordion.Item value="general">
				<Accordion.Trigger>General</Accordion.Trigger>
				<Accordion.Content>
					<p class="body-sm text-fg-muted">
						Set the tenant trade name, GSTIN, and primary contact. Visible to every member of this
						tenant.
					</p>
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="billing">
				<Accordion.Trigger>Billing</Accordion.Trigger>
				<Accordion.Content>
					<p class="body-sm text-fg-muted">
						Manage subscription tier, invoices, and payment methods. Only the owner can change the
						plan.
					</p>
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="api">
				<Accordion.Trigger>API & integrations</Accordion.Trigger>
				<Accordion.Content>
					<p class="body-sm text-fg-muted">
						Generate API keys for headless integrations, configure webhook URLs, and review request
						logs.
					</p>
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="danger">
				<Accordion.Trigger>Danger zone</Accordion.Trigger>
				<Accordion.Content>
					<p class="body-sm text-danger-700">
						Permanently archive this tenant or transfer ownership. These actions cannot be undone.
					</p>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	</div>
</Story>

<Story name="Multiple (independent items)">
	<div style="width: 560px;">
		<Accordion.Root type="multiple" value={['q1', 'q2']}>
			<Accordion.Item value="q1">
				<Accordion.Trigger>How is a lead credit consumed?</Accordion.Trigger>
				<Accordion.Content>
					<p class="body-sm text-fg-muted">
						One credit is deducted when you unlock a lead's contact information. Browsing the
						marketplace and viewing summaries is free.
					</p>
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="q2">
				<Accordion.Trigger>Can I refund an accidentally unlocked lead?</Accordion.Trigger>
				<Accordion.Content>
					<p class="body-sm text-fg-muted">
						Within 24 hours of unlock and only if the contact information is invalid. Submit a
						refund request from the lead detail page.
					</p>
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="q3">
				<Accordion.Trigger>Do unused credits expire?</Accordion.Trigger>
				<Accordion.Content>
					<p class="body-sm text-fg-muted">
						No. Credits never expire while your subscription is active.
					</p>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	</div>
</Story>
