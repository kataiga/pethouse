/** The shape of a catalogue: same keys as the French reference, every leaf a string. */
export type Catalogue<T> = {
  [K in keyof T]: T[K] extends string ? string : Catalogue<T[K]>;
};
