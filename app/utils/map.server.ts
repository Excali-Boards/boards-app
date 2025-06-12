export type Key = string | number | symbol;
export type Value = string | number | boolean | null | undefined | object;

export default class CustomMap<K extends Key, V extends Value> extends Map<K, V> {
	constructor(entries?: readonly (readonly [K, V])[] | null) {
		super(entries);
	}

	public update(key: K, value: (oldValue?: V) => V): this {
		if (!this.has(key)) this.set(key, value(undefined));

		this.set(key, value(this.get(key)!));
		return this;
	}
}
