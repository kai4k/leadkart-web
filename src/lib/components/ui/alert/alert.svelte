<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { AlertCircle, CheckCircle2, Icon, Info, XCircle } from '#lib/icons/index.ts';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';

	/**
	 * shadcn-svelte `alert` with LeadKart edits (ui/CUSTOMIZATIONS.md): soft token fills (no alpha),
	 * the status variants, a `title`, an icon per variant, `dismissible`, and a role that follows
	 * the severity: `alert` (assertive) for destructive and warning, `status` (polite) otherwise.
	 *
	 * `variant="tray"` is the spec's StatusTray: a recessed tray tinted by `tone` for a state that needs
	 * attention (quarantine, overdue, offline). The tone is also said in a word ("Needs attention",
	 * "At risk", "Note", "Status") next to its icon, so colour is never the only signal.
	 */
	export const alertVariants = cva('body-sm relative w-full p-4', {
		variants: {
			variant: {
				default: 'rounded-md border border-border bg-card text-card-foreground',
				info: 'rounded-md border border-border bg-info-soft text-info',
				success: 'rounded-md border border-border bg-success-soft text-success',
				warning: 'rounded-md border border-border bg-warning-soft text-warning',
				destructive: 'rounded-md border border-border bg-destructive-soft text-destructive',
				tray: 'rounded-card material-tray text-foreground'
			},
			tone: {
				warning: '',
				danger: '',
				info: '',
				neutral: ''
			}
		},
		// The tray's own fill is the `--tray` token; a tone re-points it at that status's soft fill
		// (the same pair the contrast gate already holds the foreground to).
		compoundVariants: [
			{ variant: 'tray', tone: 'warning', class: '[--tray:var(--warning-soft)]' },
			{ variant: 'tray', tone: 'danger', class: '[--tray:var(--destructive-soft)]' },
			{ variant: 'tray', tone: 'info', class: '[--tray:var(--info-soft)]' }
		],
		defaultVariants: { variant: 'info', tone: 'neutral' }
	});
	export type AlertVariants = VariantProps<typeof alertVariants>;
	export type AlertVariant = NonNullable<AlertVariants['variant']>;
	export type AlertTone = NonNullable<AlertVariants['tone']>;

	const TONE_ICON_CLASS: Record<AlertTone, string> = {
		warning: 'text-warning',
		danger: 'text-destructive',
		info: 'text-info',
		neutral: 'text-muted-foreground'
	};

	const TONE_WORD_KEY: Record<AlertTone, string> = {
		warning: 'alert.tone.warning',
		danger: 'alert.tone.danger',
		info: 'alert.tone.info',
		neutral: 'alert.tone.neutral'
	};

	export type AlertProps = WithElementRef<HTMLAttributes<HTMLDivElement>> &
		AlertVariants & {
			title?: string;
			dismissible?: boolean;
			onDismiss?: () => void;
			/** `note` for a static warning that is not a change the user must be told about */
			role?: HTMLAttributes<HTMLDivElement>['role'];
			children?: Snippet;
		};
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	let {
		ref = $bindable(null),
		variant = 'info',
		tone = 'neutral',
		title,
		dismissible = false,
		onDismiss,
		role: roleProp,
		class: className,
		children,
		...rest
	}: AlertProps = $props();

	const tray = $derived(variant === 'tray');
	// A tray reads as its tone; every other variant reads as itself.
	const severity = $derived(tray ? (tone === 'danger' ? 'destructive' : tone) : variant);
	const role = $derived(
		roleProp ?? (severity === 'destructive' || severity === 'warning' ? 'alert' : 'status')
	);
	const variantIcon = $derived(
		severity === 'success'
			? CheckCircle2
			: severity === 'warning'
				? AlertCircle
				: severity === 'destructive'
					? XCircle
					: Info
	);
</script>

<!-- a role=alert banner is focused by code after a failed submit (focusFirstInvalid): tabindex -1 only -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={ref}
	data-slot="alert"
	{role}
	data-form-error={variant === 'destructive' ? '' : undefined}
	data-tone={tray ? tone : undefined}
	tabindex={role === 'alert' ? -1 : undefined}
	class={cn(
		alertVariants({ variant, tone }),
		'focus-visible:ring-ring outline-none focus-visible:ring-2',
		className
	)}
	{...rest}
>
	<div class="flex items-start gap-3">
		<Icon
			icon={variantIcon}
			size="md"
			class={cn('mt-0.5 flex-shrink-0', tray && TONE_ICON_CLASS[tone ?? 'neutral'])}
		/>
		<div class="flex-1">
			{#if tray}
				<p data-slot="alert-tone" class="text-foreground font-semibold">
					{$_(TONE_WORD_KEY[tone ?? 'neutral'])}
				</p>
			{/if}
			{#if title}<p class="mb-1 font-semibold">{title}</p>{/if}
			{#if children}<div>{@render children()}</div>{/if}
		</div>
		{#if dismissible}
			<button
				type="button"
				class="hover:bg-muted focus-visible:ring-ring rounded-sm p-0.5 focus-visible:ring-2 focus-visible:outline-none"
				aria-label={$_('common.dismiss')}
				onclick={() => onDismiss?.()}
			>
				<Icon icon={XCircle} size="sm" />
			</button>
		{/if}
	</div>
</div>
