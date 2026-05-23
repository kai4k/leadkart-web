/**
 * Pure view-model helpers for the Leads CRM module.
 *
 * Layer rule (CLAUDE.md): view-models are pure, async-free, side-effect
 * free transforms from DTOs to render-ready shapes. No fetch, no DOM,
 * no stores — just data shaping.
 */
import type { LeadDto, LeadStage, LeadSource } from './schemas';

export interface StageBadgeMeta {
	label: string;
	variant: 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'brand';
}

const STAGE_BADGES: Record<LeadStage, StageBadgeMeta> = {
	new: { label: 'New', variant: 'info' },
	contacted: { label: 'Contacted', variant: 'brand' },
	qualified: { label: 'Qualified', variant: 'warning' },
	proposal: { label: 'Proposal', variant: 'warning' },
	won: { label: 'Won', variant: 'success' },
	lost: { label: 'Lost', variant: 'danger' }
};

export function stageBadge(stage: LeadStage): StageBadgeMeta {
	return STAGE_BADGES[stage] ?? { label: stage, variant: 'neutral' };
}

export const STAGE_OPTIONS: ReadonlyArray<{ value: LeadStage; label: string }> = [
	{ value: 'new', label: 'New' },
	{ value: 'contacted', label: 'Contacted' },
	{ value: 'qualified', label: 'Qualified' },
	{ value: 'proposal', label: 'Proposal' },
	{ value: 'won', label: 'Won' },
	{ value: 'lost', label: 'Lost' }
];

export const SOURCE_OPTIONS: ReadonlyArray<{ value: LeadSource; label: string }> = [
	{ value: 'website', label: 'Website' },
	{ value: 'referral', label: 'Referral' },
	{ value: 'ads', label: 'Ads' },
	{ value: 'marketplace', label: 'Marketplace' },
	{ value: 'manual', label: 'Manual' },
	{ value: 'import', label: 'Import' },
	{ value: 'other', label: 'Other' }
];

const SOURCE_LABELS: Record<LeadSource, string> = SOURCE_OPTIONS.reduce(
	(acc, o) => {
		acc[o.value] = o.label;
		return acc;
	},
	{} as Record<LeadSource, string>
);

export function sourceLabel(source: LeadSource): string {
	return SOURCE_LABELS[source] ?? source;
}

/**
 * Money formatter — locale aware, defers to the lead's currency.
 * Returns an em-dash placeholder when value is missing.
 */
export function formatValue(value: number | null | undefined, currency = 'USD'): string {
	if (value == null) return '—';
	try {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency,
			maximumFractionDigits: value % 1 === 0 ? 0 : 2
		}).format(value);
	} catch {
		return `${currency} ${value.toFixed(2)}`;
	}
}

/**
 * "Stale" = no contact in 7+ days AND lead is still in an open stage.
 * Used by the "Stale leads" saved view and by the row dot indicator.
 */
const STALE_DAYS = 7;
const OPEN_STAGES: ReadonlySet<LeadStage> = new Set<LeadStage>([
	'new',
	'contacted',
	'qualified',
	'proposal'
]);

export function isStale(lead: LeadDto, now: Date = new Date()): boolean {
	if (!OPEN_STAGES.has(lead.stage)) return false;
	const reference = lead.last_contacted_at ?? lead.created_at;
	const refDate = new Date(reference);
	if (Number.isNaN(refDate.getTime())) return false;
	const diffDays = (now.getTime() - refDate.getTime()) / 86_400_000;
	return diffDays >= STALE_DAYS;
}

/**
 * Relative-time formatter — "2 days ago" / "in 3 hours" / "just now".
 * Pure UI helper; falls back to a localised date for >30 days out.
 */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const diffMs = d.getTime() - now.getTime();
	const sign = diffMs >= 0 ? 1 : -1;
	const absSec = Math.abs(diffMs) / 1000;
	const minutes = absSec / 60;
	const hours = minutes / 60;
	const days = hours / 24;
	if (absSec < 45) return 'just now';
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
	if (minutes < 60) return rtf.format(sign * Math.round(minutes), 'minute');
	if (hours < 24) return rtf.format(sign * Math.round(hours), 'hour');
	if (days < 30) return rtf.format(sign * Math.round(days), 'day');
	return d.toLocaleDateString();
}

/**
 * Saved-view presets (v1) — frontend-only, no backend persistence yet.
 * Each preset is a partial filter-set that gets merged into the URL.
 */
export interface SavedView {
	id: string;
	label: string;
	stage?: LeadStage[];
	owner_membership_id?: string;
	sort?: string;
	/** Marker so the LeadsList can apply the stale-filter after fetch. */
	staleOnly?: boolean;
}

export function savedViews(callerMembershipId: string): SavedView[] {
	return [
		{ id: 'all', label: 'All leads' },
		{
			id: 'mine',
			label: 'My leads',
			owner_membership_id: callerMembershipId
		},
		{
			id: 'hot',
			label: 'Hot leads',
			stage: ['qualified', 'proposal']
		},
		{
			id: 'stale',
			label: 'Stale (7d+)',
			stage: ['new', 'contacted', 'qualified', 'proposal'],
			staleOnly: true
		}
	];
}
