export type Listener<T> = (value: T) => void;

export class Signal<T> {
  private listeners = new Set<Listener<T>>();
  private last: T;

  constructor(initial: T) {
    this.last = initial;
  }

  get(): T {
    return this.last;
  }

  set(value: T): void {
    this.last = value;
    this.listeners.forEach((fn) => fn(value));
  }

  update(patch: Partial<T>): void {
    this.set({ ...(this.last as object), ...(patch as object) } as T);
  }

  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    fn(this.last);
    return () => {
      this.listeners.delete(fn);
    };
  }
}
