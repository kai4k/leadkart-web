/**
 * The vectors are copied from leadkart-go's own tests at commit 44ff2b16, so "never stricter than Go" is checked
 * against Go's accepted values, not against this file's reading of the rule:
 *   internal/common/gst/gst_test.go            TestNew_AcceptsValidGSTIN / TestNew_RejectsInvalid
 *   internal/common/pan/pan_test.go            valid by entity type / TestNew_RejectsInvalid
 *   internal/common/druglicence/druglicence_test.go
 *   internal/common/phone/phone_test.go
 *   internal/common/postaladdress/postaladdress_test.go   TestNew_AcceptsValid, the part / reason table
 *   internal/identity/domain/tenant/tenant_test.go        TestNewStatutory_RejectsGSTPANMismatch / AcceptsMatchedGSTPAN
 */
import { describe, expect, it } from 'vitest';
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
	tidyPincode
} from '#lib/utils/indian-formats.ts';

const EM_DASH = String.fromCharCode(0x2014);

const GST_OK = [
	'29ABCDE1234F1Z5',
	'07XYZAB5678C2Z9',
	'01PQRST9999D9Z0',
	'37ABCDE1234F1Z5',
	'97ABCDE1234F1Z5'
];
const GST_BAD = [
	'29ABCDE1234F1Z',
	'29ABCDE1234F1Z55',
	'29abcde1234f1z5',
	'29ABCDE1234F1A5',
	'00ABCDE1234F1Z5',
	'38ABCDE1234F1Z5',
	'96ABCDE1234F1Z5',
	'AAABCDE1234F1Z5'
];
const PAN_OK = ['ABCPE1234F', 'ABCFE1234G', 'ABCCE1234H', 'ABCHE1234I', 'ABCTE1234J', 'ABCGE1234K'];
const PAN_BAD = [
	'ABCPE1234',
	'ABCPE1234FX',
	'abcpe1234f',
	'ABC1E1234F',
	'ABCPEX234F',
	'ABCXE1234F',
	'ABCZE1234F'
];
const LICENCE_OK = [
	'KA-W-22B-12345',
	'MH-21B-12345',
	'20B/12345',
	'DL-22B-12345-2025',
	'AP/22B/00012',
	'AB123456'
];
const LICENCE_BAD = [
	'AB12',
	'A'.repeat(32),
	'ka-w-22b-12345',
	'ABCDEFGHIJ',
	'1234567890',
	'KA_W_12345',
	'KA.W.12345',
	`KA${EM_DASH}W${EM_DASH}12345`
];
const PHONE_OK = [
	'+919876543210',
	'+14155551234',
	'+447700900123',
	'+8612345678901',
	'+19999999999999'
];
const PHONE_BAD = [
	'919876543210',
	'+1234567',
	'+1234567890123456',
	'+91 9876543210',
	'+91-9876543210',
	'+91(987)6543210',
	'+09876543210',
	'+91987a543210'
];

describe('what Go accepts passes (never stricter) and what Go refuses fails', () => {
	it.each(GST_OK)('GSTIN %s', (v) => expect(checkGstin(v)).toBeNull());
	it.each(GST_BAD)('GSTIN %s', (v) => expect(checkGstin(v)).toBe('invalid_gstin'));
	it.each(PAN_OK)('PAN %s', (v) => expect(checkPan(v)).toBeNull());
	it.each(PAN_BAD)('PAN %s', (v) => expect(checkPan(v)).toBe('invalid_pan'));
	it.each(LICENCE_OK)('licence %s', (v) => expect(checkDrugLicence(v)).toBeNull());
	it.each(LICENCE_BAD)('licence %s', (v) =>
		expect(checkDrugLicence(v)).toBe('invalid_drug_licence')
	);
	it.each(PHONE_OK)('phone %s', (v) => expect(checkPhone(v)).toBeNull());
	it.each(PHONE_BAD)('phone %s', (v) => expect(checkPhone(v)).toBe('invalid_phone'));
	it('blank means "not declared" for all four', () => {
		for (const check of [checkGstin, checkPan, checkDrugLicence, checkPhone])
			expect(check('')).toBeNull();
	});
});

describe('GSTIN and PAN together (tenant_test.go)', () => {
	it('a mismatch is refused, a match passes', () => {
		expect(checkGstinMatchesPan('29ABCPE1234F1Z5', 'ZZZPZ9999G')).toBe('gstin_pan_mismatch');
		expect(checkGstinMatchesPan('29ABCPE1234F1Z5', 'ABCPE1234F')).toBeNull();
	});
	it('one side blank or invalid is not this check', () => {
		expect(checkGstinMatchesPan('', 'ABCPE1234F')).toBeNull();
		expect(checkGstinMatchesPan('29ABCPE1234F1Z5', '')).toBeNull();
		expect(checkGstinMatchesPan('nope', 'ABCPE1234F')).toBeNull();
	});
});

const address = (over: Record<string, string> = {}) => ({
	street: '123 MG Road, Block A',
	city: 'Bangalore',
	district: 'Bangalore Urban',
	state: 'Karnataka',
	state_code: 'KA',
	pincode: '560001',
	...over
});
describe('the postal address (postaladdress_test.go)', () => {
	it('the accepted address passes', () => expect(checkAddress(address())).toEqual({}));
	it.each([
		['street blank', { street: '' }, { street: 'required' }],
		['street long', { street: 'X'.repeat(201) }, { street: 'too_long' }],
		['city blank', { city: '' }, { city: 'required' }],
		['city long', { city: 'X'.repeat(81) }, { city: 'too_long' }],
		['district long', { district: 'X'.repeat(81) }, { district: 'too_long' }],
		['state blank', { state: '' }, { state: 'required' }],
		['state long', { state: 'X'.repeat(81) }, { state: 'too_long' }],
		['state code long', { state_code: 'KARNT' }, { state_code: 'too_long' }],
		['pincode blank', { pincode: '' }, { pincode: 'required' }],
		['pincode bad', { pincode: '012345' }, { pincode: 'invalid_pincode' }],
		['pincode 5 digits', { pincode: '12345' }, { pincode: 'invalid_pincode' }],
		['pincode 7 digits', { pincode: '1234567' }, { pincode: 'invalid_pincode' }],
		['pincode alpha', { pincode: '12345A' }, { pincode: 'invalid_pincode' }]
	])('%s', (_name, over, expected) => {
		expect(checkAddress(address(over))).toEqual(expected);
	});
	it('the limits are the boundary: 200 / 80 / 4 pass', () => {
		expect(
			checkAddress(
				address({
					street: 'X'.repeat(200),
					city: 'X'.repeat(80),
					district: 'X'.repeat(80),
					state: 'X'.repeat(80),
					state_code: 'KARN'
				})
			)
		).toEqual({});
	});
	it('lengths count UTF-8 bytes, as Go does', () => {
		const e = String.fromCharCode(0xe9); // two bytes
		expect(checkAddress(address({ city: e.repeat(41) }))).toEqual({ city: 'too_long' }); // 82 bytes
		expect(checkAddress(address({ city: e.repeat(40) }))).toEqual({}); // 80 bytes
	});
	it('a wholly blank address (street, city, pincode) is "not declared": Go skips it', () => {
		expect(checkAddress(address({ street: '', city: '', pincode: '' }))).toEqual({});
	});
	it('surrounding whitespace is trimmed first, as Go does', () => {
		expect(checkAddress(address({ street: '  x  ', pincode: ' 560001 ' }))).toEqual({});
	});
});

describe('tidy: what is written back into the input', () => {
	it.each([
		[' 29abcde1234f1z5 ', '29ABCDE1234F1Z5'],
		['29 abcde 1234 f1z5', '29ABCDE1234F1Z5'],
		['\tabcpe1234f\n', 'ABCPE1234F'],
		['', '']
	])('GSTIN / PAN %j -> %j', (typed, sent) => expect(tidyIdentifier(typed)).toBe(sent));

	it.each([
		['  ka-w-22b-12345 ', 'KA-W-22B-12345'],
		['20b/12345', '20B/12345'],
		['KA W 22B 12345', 'KA W 22B 12345'] // inner spaces are part of some formats
	])('licence %j -> %j', (typed, sent) => expect(tidyDrugLicence(typed)).toBe(sent));

	it('an em-dash stays an em-dash: it is refused, never swapped for a hyphen', () => {
		expect(tidyDrugLicence(`ka${EM_DASH}w`)).toBe(`KA${EM_DASH}W`);
	});

	it('ASCII letters only: a sharp s is not rewritten into SS', () => {
		const sharp = String.fromCharCode(0xdf);
		expect(tidyIdentifier(`stra${sharp}e`)).toBe(`STRA${sharp}E`);
	});

	it.each([
		['9876543210', '+919876543210'],
		['98765 43210', '+919876543210'],
		['98765-43210', '+919876543210'],
		['(98765) 43210', '+919876543210'],
		['09876543210', '+919876543210'],
		['919876543210', '+919876543210'],
		['+91 98765 43210', '+919876543210'],
		['+91-98765-43210', '+919876543210'],
		['+14155551234', '+14155551234'],
		['+1 (415) 555-1234', '+14155551234'],
		['', '']
	])('phone %j -> %j', (typed, sent) => expect(tidyPhone(typed)).toBe(sent));

	it.each([
		'12345',
		'+91987a543210',
		'98765x43210',
		'+0123456789',
		'+12',
		'0098765432101',
		'call me'
	])('phone %j cannot be tidied: left exactly as typed', (typed) => {
		expect(tidyPhone(typed)).toBe(typed);
		expect(checkPhone(tidyPhone(typed))).toBe('invalid_phone');
	});

	it('a pincode loses its inner space', () => expect(tidyPincode(' 400 001 ')).toBe('400001'));
});
