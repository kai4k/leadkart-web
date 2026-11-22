/**
 * What the statutory and contact forms check and tidy BEFORE they post (`ActionForm` `tidy` / `validate`): the same
 * rules Go enforces (`utils/indian-formats.ts`), answered as the same field codes, so a person reads one sentence
 * whichever side refused. Go stays the authority: its 422 renders as ever.
 */
import {
	checkAddress,
	checkDrugLicence,
	checkGstin,
	checkGstinMatchesPan,
	checkPan,
	checkPhone,
	tidyDrugLicence,
	tidyIdentifier,
	tidyPhone,
	tidyPincode,
	tidyText,
	type AddressParts
} from '#lib/utils/indian-formats.ts';

type Values = Record<string, string>;
const keep = (errors: Values, field: string, code: string | null) => {
	if (code) errors[field] = code;
};

export const STATUTORY_TIDY: Record<string, (text: string) => string> = {
	gst_number: tidyIdentifier,
	pan_number: tidyIdentifier,
	drug_licence_number: tidyDrugLicence
};

export function validateStatutory(v: Values): Values {
	const errors: Values = {};
	const gst = tidyIdentifier(v.gst_number ?? '');
	const pan = tidyIdentifier(v.pan_number ?? '');
	keep(errors, 'gst_number', checkGstin(gst));
	keep(errors, 'pan_number', checkPan(pan));
	keep(
		errors,
		'drug_licence_number',
		checkDrugLicence(tidyDrugLicence(v.drug_licence_number ?? ''))
	);
	// Go answers a mismatch with a field-less `tenant_invalid`; the PAN is the field to fix or confirm
	if (!errors.pan_number) keep(errors, 'pan_number', checkGstinMatchesPan(gst, pan));
	return errors;
}

export const CONTACT_TIDY: Record<string, (text: string) => string> = {
	phone: tidyPhone,
	'address.street': tidyText,
	'address.city': tidyText,
	'address.district': tidyText,
	'address.state': tidyText,
	'address.state_code': tidyText,
	'address.pincode': tidyPincode
};

export function validateContact(v: Values): Values {
	const errors: Values = {};
	keep(errors, 'phone', checkPhone(tidyPhone(v.phone ?? '')));
	const parts = (name: keyof AddressParts) => v[`address.${name}`] ?? '';
	const address = checkAddress({
		street: parts('street'),
		city: parts('city'),
		district: parts('district'),
		state: parts('state'),
		state_code: parts('state_code'),
		pincode: tidyPincode(parts('pincode'))
	});
	for (const [part, code] of Object.entries(address)) errors[`address.${part}`] = code;
	return errors;
}
