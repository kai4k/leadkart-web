<script lang="ts">
	/**
	 * SearchInput — the search box of a list. Typing is debounced (one call per pause, trimmed text);
	 * Enter searches at once; Escape clears and searches for nothing. The page owns the search (it is
	 * usually a URL param), so `value` is what the page currently searches for and the box follows it
	 * when the page changes it (a chip removed, a saved view applied).
	 */
	import { untrack } from 'svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Icon, Search } from '#lib/icons/index.ts';

	type Props = {
		/** What the page currently searches for. */
		value: string;
		onSearch: (query: string) => void;
		/** The input's accessible name. */
		label: string;
		placeholder?: string;
		debounceMs?: number;
		/** The longest search the backend reads; the box takes no more. */
		maxlength?: number;
	};
	let { value, onSearch, label, placeholder, debounceMs = 300, maxlength }: Props = $props();

	let draft = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	// The query last handed to the page, or last seen coming from it: an unchanged one is not sent again.
	let current = '';

	$effect(() => {
		// What the person typed stays as typed (a trailing space is not deleted under them); the box only
		// follows the page when the page searches for something else.
		if (untrack(() => draft).trim() !== value.trim()) draft = value;
		current = value.trim();
	});
	$effect(() => () => clearTimeout(timer));

	function send(query: string, force = false): void {
		clearTimeout(timer);
		if (!force && query === current) return;
		current = query;
		onSearch(query);
	}

	function oninput(): void {
		clearTimeout(timer);
		const query = draft.trim();
		timer = setTimeout(() => send(query), debounceMs);
	}

	function onkeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			send(draft.trim(), true);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			draft = '';
			send('', true);
		}
	}
</script>

<div class="relative">
	<span class="pointer-events-none absolute inset-y-0 start-3 flex items-center">
		<Icon icon={Search} size="sm" class="text-subtle-foreground" />
	</span>
	<Input
		type="search"
		aria-label={label}
		{placeholder}
		{maxlength}
		enterkeyhint="search"
		autocomplete="off"
		bind:value={draft}
		{oninput}
		{onkeydown}
		class="ps-9"
	/>
</div>
