export function renameSource(src: string): {
	out: string;
	unmapped: Array<{ line: number; what: string }>;
};
