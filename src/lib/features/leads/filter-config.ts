/**
 * LeadFilters — static filter-field configuration consumed by the
 * canonical `<FilterBar>`. Kept as a const so the page composition
 * stays declarative; the actual UI lives in `FilterBar`.
 */
import type { FilterBarField } from '$lib/components/data';
import {
	BUSINESS_TYPE_LABEL,
	BUY_TIMELINE_LABEL,
	MEDICINE_SYSTEM_LABEL,
	ORDER_VALUE_BAND_LABEL,
	STAGE_META,
	TEMPERATURE_META
} from './view-models';
import type {
	BusinessType,
	BuyTimeline,
	LeadStage,
	LeadTemperature,
	MedicineSystem,
	OrderValueBand
} from './schemas';

export const LEAD_FILTER_FIELDS: FilterBarField[] = [
	{
		key: 'stage',
		label: 'Stage',
		type: 'multi-select',
		options: STAGE_META.map((s) => ({ value: s.value, label: s.label }))
	},
	{
		key: 'temperature',
		label: 'Temperature',
		type: 'multi-select',
		options: TEMPERATURE_META.map((t) => ({ value: t.value, label: t.label }))
	},
	{
		key: 'business_type',
		label: 'Business type',
		type: 'select',
		options: (Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((k) => ({
			value: k,
			label: BUSINESS_TYPE_LABEL[k]
		}))
	},
	{
		key: 'medicine_system',
		label: 'Medicine system',
		type: 'select',
		options: (Object.keys(MEDICINE_SYSTEM_LABEL) as MedicineSystem[]).map((k) => ({
			value: k,
			label: MEDICINE_SYSTEM_LABEL[k]
		}))
	},
	{
		key: 'order_value_band',
		label: 'Order value',
		type: 'select',
		options: (Object.keys(ORDER_VALUE_BAND_LABEL) as OrderValueBand[]).map((k) => ({
			value: k,
			label: ORDER_VALUE_BAND_LABEL[k]
		}))
	},
	{
		key: 'buy_timeline',
		label: 'Buy timeline',
		type: 'select',
		options: (Object.keys(BUY_TIMELINE_LABEL) as BuyTimeline[]).map((k) => ({
			value: k,
			label: BUY_TIMELINE_LABEL[k]
		}))
	},
	{ key: 'state', label: 'State', type: 'text', placeholder: 'e.g. Maharashtra' },
	{ key: 'pin_code', label: 'PIN code', type: 'text', placeholder: '110001' },
	{ key: 'has_drug_licence', label: 'Has drug licence', type: 'boolean' },
	{ key: 'has_gst', label: 'Has GST', type: 'boolean' }
];

/**
 * Shape of the URL filter map for the leads list page. Used both by
 * the `UseUrlFilters` schema and the param-builder.
 */
export type LeadUrlFilters = {
	q?: string;
	stage?: LeadStage[];
	temperature?: LeadTemperature[];
	owner_membership_id?: string;
	state?: string;
	pin_code?: string;
	business_type?: BusinessType;
	medicine_system?: MedicineSystem;
	order_value_band?: OrderValueBand;
	buy_timeline?: BuyTimeline;
	has_drug_licence?: string; // url booleans as 'true' / undefined
	has_gst?: string;
	view?: string;
	sort?: string;
};
