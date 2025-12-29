import { Pool, PoolClient } from 'pg';
import { KeyValueStore } from './key-value-store';

/**
 * Postgres implementation of the KeyValueStore interface.
 * Stores key-value pairs in a 'key_value_store' table.
 */
export class PostgresKeyValueStore implements KeyValueStore {
  constructor(private pool: Pool) {}

  async get(key: string): Promise<string | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT value FROM key_value_store WHERE key = $1',
        [key]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].value;
    } finally {
      client.release();
    }
  }

  async set(key: string, value: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Use UPSERT to insert or update the value
      await client.query(
        `INSERT INTO key_value_store (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    } finally {
      client.release();
    }
  }

  async delete(key: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM key_value_store WHERE key = $1',
        [key]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async has(key: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT 1 FROM key_value_store WHERE key = $1',
        [key]
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
