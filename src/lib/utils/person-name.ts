/**
 * Pure person display-name leaf shared by every feature view-model.
 * Structural input type keeps this free of feature imports (utils-leaf rule).
 */
export interface NamedPerson {
	first_name: string;
	last_name: string;
	email: string;
}

export interface DisplayNameOptions {
	/** Blank-name fallback: email local-part (default) or the full email. */
	emailFallback?: 'local-part' | 'full';
}

export function displayName(person: NamedPerson, opts: DisplayNameOptions = {}): string {
	const first = person.first_name.trim();
	const last = person.last_name.trim();
	if (first && last) return `${first} ${last}`;
	if (first) return first;
	if (last) return last;
	return opts.emailFallback === 'full'
		? person.email
		: (person.email.split('@')[0] ?? person.email);
}

/**
 * Avatar monogram: first letter of the first and last word (one word -> its
 * first letter), uppercased. Blank input yields '?'.
 */
export function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0];
	if (!first) return '?';
	const last = words[words.length - 1]?.[0] ?? first;
	return (words.length === 1 ? first : first + last).toUpperCase();
}
