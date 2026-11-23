/** A `$app/state` page whose `data` is reactive, so a test can change it and watch a component follow. */
export interface ReactivePage<T> {
	data: T;
}

export function createReactivePage<T>(initial: T): ReactivePage<T> {
	let data = $state(initial);
	return {
		get data() {
			return data;
		},
		set data(next: T) {
			data = next;
		}
	};
}

/** A `$app/state` page whose `url` is reactive: a list that reads its page or search from the URL follows `goto`. */
export function createReactiveUrlPage(initial: URL): { url: URL } {
	// replaced whole by the test, never mutated
	let url = $state.raw(initial);
	return {
		get url() {
			return url;
		},
		set url(next: URL) {
			url = next;
		}
	};
}
