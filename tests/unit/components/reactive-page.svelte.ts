/** A `$app/state` `page` whose `data` is reactive, so a test can commit a new layout load. */
export function createReactivePage(scopeContext: string): { data: { scopeContext: string } } {
	let data = $state({ scopeContext });
	return {
		get data() {
			return data;
		},
		set data(next) {
			data = next;
		}
	};
}
