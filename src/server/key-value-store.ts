/**
 * Abstract interface for a persistent key-value store.
 * This abstraction allows us to swap out storage implementations
 * (Postgres, Redis, in-memory, etc.) without changing business logic.
 */
export interface KeyValueStore {
  /**
   * Get a value by key
   * @param key The key to look up
   * @returns The value associated with the key, or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value for a key (upsert: insert or update)
   * @param key The key to set
   * @param value The value to store
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Delete a key-value pair
   * @param key The key to delete
   * @returns true if the key was deleted, false if it didn't exist
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if a key exists
   * @param key The key to check
   * @returns true if the key exists, false otherwise
   */
  has(key: string): Promise<boolean>;

  /**
   * Close/cleanup the store connection
   */
  close(): Promise<void>;
}
