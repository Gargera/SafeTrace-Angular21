export interface CacheEntry<T> {
  value: T;
  expiry: number;
  tags?: string[];
}
