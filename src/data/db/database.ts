import { open, type DB } from '@op-engineering/op-sqlite';

import { MIGRATIONS } from './schema';

export const DATABASE_NAME = 'bocado.db';

let instance: Promise<DB> | null = null;

/**
 * Opens the database once, applies pending migrations and returns the handle.
 * Every repository goes through here; nothing else calls `open`.
 */
export function getDatabase(): Promise<DB> {
  if (!instance) {
    instance = (async () => {
      const db = open({ name: DATABASE_NAME });
      await db.execute('PRAGMA journal_mode = WAL');
      await db.execute('PRAGMA foreign_keys = ON');
      await migrate(db);
      return db;
    })();
  }
  return instance;
}

async function migrate(db: DB): Promise<void> {
  const result = await db.execute('PRAGMA user_version');
  const current = Number(result.rows[0]?.user_version ?? 0);
  for (let version = current; version < MIGRATIONS.length; version += 1) {
    await db.transaction(async tx => {
      for (const statement of MIGRATIONS[version]) {
        await tx.execute(statement);
      }
      await tx.execute(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

/** Facts the smoke screen and the seed importer rely on. */
export async function databaseStatus(db: DB): Promise<{ version: string; fts5: boolean; foods: number }> {
  const version = String((await db.execute('SELECT sqlite_version() AS v')).rows[0]?.v ?? '?');
  const fts5 = Boolean((await db.execute("SELECT count(*) AS n FROM sqlite_master WHERE name = 'foods_fts'")).rows[0]?.n);
  const foods = Number((await db.execute('SELECT count(*) AS n FROM foods')).rows[0]?.n ?? 0);
  return { version, fts5, foods };
}

/** Test seam: forget the cached handle so a test can start from a fresh fake. */
export function resetDatabaseForTests(): void {
  instance = null;
}
