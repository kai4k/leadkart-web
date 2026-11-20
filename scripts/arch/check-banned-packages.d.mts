export const BANNED: string[];
export function findImportViolations(src: string): Array<{ line: number; specifier: string }>;
export function findManifestViolations(packageJson: string): string[];
