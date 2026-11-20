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
