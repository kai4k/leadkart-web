// Prints what this browser reports for the three media features the materials fall back on (plan section 4).
// "unsupported" means the browser does not know the feature: Safari and Firefox do not report
// prefers-reduced-transparency, so a person there picks "Solid" in the customizer.
const FEATURES = [
	['prefers-reduced-transparency', 'reduce'],
	['prefers-contrast', 'more'],
	['forced-colors', 'active']
];
const body = document.querySelector('#probe tbody');
for (const [name, value] of FEATURES) {
	const known = window.matchMedia(`(${name})`).media !== 'not all';
	const matches = known && window.matchMedia(`(${name}: ${value})`).matches;
	const row = document.createElement('tr');
	for (const text of [name, known ? (matches ? `${value}: yes` : `${value}: no`) : 'unsupported']) {
		const cell = document.createElement('td');
		cell.textContent = text;
		row.appendChild(cell);
	}
	body.appendChild(row);
}
