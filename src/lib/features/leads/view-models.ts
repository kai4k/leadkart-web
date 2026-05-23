/**
 * Pure view-model helpers for the CRM Leads module.
 *
 * Layer rule (CLAUDE.md): view-models are pure, async-free, side-effect
 * free transforms from DTOs to render-ready shapes. No fetch, no DOM,
 * no stores — just data shaping.
 */
import type {
	BusinessType,
	BuyTimeline,
	CallOutcome,
	CrmLeadDto,
	LeadStage,
	LeadTemperature,
	MedicineSystem,
	OrderValueBand,
	ReminderKind,
	ReminderStatus
} from './schemas';
import type { StatusPillOption } from '$ui';
import type { KanbanColumnAccent, TimelineItemAccent } from '$ui';

// ── Stage ───────────────────────────────────────────────────────────

export interface StageMeta {
	value: LeadStage;
	label: string;
	variant: StatusPillOption['variant'];
	accent: KanbanColumnAccent;
}

export const STAGE_META: ReadonlyArray<StageMeta> = [
	{ value: 'new', label: 'New', variant: 'info', accent: 'info' },
	{ value: 'contacted', label: 'Contacted', variant: 'brand', accent: 'primary' },
	{ value: 'interested', label: 'Interested', variant: 'warning', accent: 'warning' },
	{ value: 'negotiation', label: 'Negotiation', variant: 'warning', accent: 'warning' },
	{ value: 'converted', label: 'Converted', variant: 'success', accent: 'success' },
	{ value: 'lost', label: 'Lost', variant: 'danger', accent: 'danger' }
];

const STAGE_INDEX: Record<LeadStage, StageMeta> = STAGE_META.reduce(
	(acc, m) => {
		acc[m.value] = m;
		return acc;
	},
	{} as Record<LeadStage, StageMeta>
);

export function stageMeta(stage: LeadStage): StageMeta {
	return STAGE_INDEX[stage];
}

export const STAGE_OPTIONS: ReadonlyArray<StatusPillOption> = STAGE_META.map((m) => ({
	value: m.value,
	label: m.label,
	variant: m.variant
}));

// ── Temperature ─────────────────────────────────────────────────────

export interface TemperatureMeta {
	value: LeadTemperature;
	label: string;
	variant: StatusPillOption['variant'];
}

export const TEMPERATURE_META: ReadonlyArray<TemperatureMeta> = [
	{ value: 'hot', label: 'Hot', variant: 'danger' },
	{ value: 'warm', label: 'Warm', variant: 'warning' },
	{ value: 'cold', label: 'Cold', variant: 'info' },
	{ value: 'dead', label: 'Dead', variant: 'neutral' }
];

const TEMP_INDEX: Record<LeadTemperature, TemperatureMeta> = TEMPERATURE_META.reduce(
	(acc, m) => {
		acc[m.value] = m;
		return acc;
	},
	{} as Record<LeadTemperature, TemperatureMeta>
);

export function temperatureMeta(t: LeadTemperature): TemperatureMeta {
	return TEMP_INDEX[t];
}

export const TEMPERATURE_OPTIONS: ReadonlyArray<StatusPillOption> = TEMPERATURE_META.map((m) => ({
	value: m.value,
	label: m.label,
	variant: m.variant
}));

// ── Static enum labels ──────────────────────────────────────────────

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
	pcd: 'PCD',
	third_party: 'Third-party'
};

export const MEDICINE_SYSTEM_LABEL: Record<MedicineSystem, string> = {
	allopathic: 'Allopathic',
	ayurvedic: 'Ayurvedic'
};

export const ORDER_VALUE_BAND_LABEL: Record<OrderValueBand, string> = {
	below_5000: 'Below ₹5,000',
	upto_25000: 'Up to ₹25,000',
	upto_50000: 'Up to ₹50,000',
	above_50000: 'Above ₹50,000'
};

export const BUY_TIMELINE_LABEL: Record<BuyTimeline, string> = {
	within_week: 'Within a week',
	within_15_days: 'Within 15 days',
	within_month: 'Within a month'
};

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
	connected: 'Connected',
	busy: 'Busy',
	no_answer: 'No answer',
	switched_off: 'Switched off',
	wrong_number: 'Wrong number',
	do_not_call: 'Do not call'
};

export const CALL_OUTCOME_ACCENT: Record<CallOutcome, TimelineItemAccent> = {
	connected: 'success',
	busy: 'warning',
	no_answer: 'warning',
	switched_off: 'neutral',
	wrong_number: 'danger',
	do_not_call: 'danger'
};

export const REMINDER_KIND_LABEL: Record<ReminderKind, string> = {
	callback: 'Callback',
	three_month_mature: '3-month mature',
	manual: 'Manual'
};

export const REMINDER_STATUS_LABEL: Record<ReminderStatus, string> = {
	pending: 'Pending',
	snoozed: 'Snoozed',
	completed: 'Completed',
	dismissed: 'Dismissed'
};

// ── Display helpers ─────────────────────────────────────────────────

/**
 * Composite location label — "City, State" with PIN trailing when both
 * city + state are present. Falls back to PIN-only when address is partial.
 */
export function locationLabel(lead: CrmLeadDto): string {
	const a = lead.address;
	const parts = [a.city, a.state].filter((s) => !!s && s.length > 0);
	if (parts.length === 0) return a.pin_code;
	return `${parts.join(', ')} · ${a.pin_code}`;
}

/**
 * "Stale" = no contact in 7+ days AND lead is still in an open stage.
 * Used by the "Stale leads" saved view and by the table-row dot indicator.
 */
const STALE_DAYS = 7;
const OPEN_STAGES: ReadonlySet<LeadStage> = new Set<LeadStage>([
	'new',
	'contacted',
	'interested',
	'negotiation'
]);

export function isStale(lead: CrmLeadDto, now: Date = new Date()): boolean {
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

// ── Kanban column shape (stage groups) ──────────────────────────────

export interface KanbanColumn {
	id: LeadStage;
	label: string;
	accent: KanbanColumnAccent;
	cards: CrmLeadDto[];
	count: number;
}

export function groupByStage(leads: CrmLeadDto[]): KanbanColumn[] {
	const buckets: Record<LeadStage, CrmLeadDto[]> = {
		new: [],
		contacted: [],
		interested: [],
		negotiation: [],
		converted: [],
		lost: []
	};
	for (const l of leads) buckets[l.stage].push(l);
	return STAGE_META.map((m) => ({
		id: m.value,
		label: m.label,
		accent: m.accent,
		cards: buckets[m.value],
		count: buckets[m.value].length
	}));
}
