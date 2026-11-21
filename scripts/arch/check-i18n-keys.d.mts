export const REGISTRY: Array<{
	template: string;
	expand: (read: (p: string) => string) => string[];
	verify?: (read: (p: string) => string, expanded: string[]) => string | null;
}>;
export const NOT_KEYS: { files: string[]; strings: string[] };
export function stripComments(src: string): string;
export function checkI18nKeys(input: {
	files: Map<string, string>;
	en: object;
	read: (p: string) => string;
	registry?: typeof REGISTRY;
}): { problems: string[]; used: Set<string>; checked: number; unused: string[] };
