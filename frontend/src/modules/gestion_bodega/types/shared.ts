export type ID = number;
export interface ApiList<T> {
  results: T[];
  meta?: Record<string, any>;
}

