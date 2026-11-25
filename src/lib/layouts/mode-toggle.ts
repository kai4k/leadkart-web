/**
 * The topbar's quick mode button. It only cycles light <-> dark. From `auto` (follows the OS) it
 * must not overwrite the user's choice with `dark`, so it returns null and the caller opens the
 * customizer, where the Mode group lives.
 */
export function quickModeTarget(mode: string): 'light' | 'dark' | null {
	if (mode === 'light') return 'dark';
	if (mode === 'dark') return 'light';
	return null;
}
