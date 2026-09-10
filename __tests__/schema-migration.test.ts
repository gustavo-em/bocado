import {
  MICRO_COLUMNS,
  MIGRATIONS,
  SCHEMA_VERSION,
} from '../src/data/db/schema';

/*
  A real SQLite engine, so the migration is proved by running it and not by
  reading it. `node:sqlite` ships with Node and needs no dependency; the
  project's tsconfig only loads the jest types, so the three calls this test
  makes are typed here instead of pulling all of @types/node into the app.
*/
interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): { get(): unknown; all(): unknown[] };
  close(): void;
}

const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => SqliteDatabase;
};

/** Everything that had shipped before task 20 added its own migration. */
const PREVIOUS_VERSION = 3;

function openAt(version: number): SqliteDatabase {
  const db = new DatabaseSync(':memory:');
  for (let index = 0; index < version; index += 1)
    for (const statement of MIGRATIONS[index]) db.exec(statement);
  db.exec(`PRAGMA user_version = ${version}`);
  return db;
}

function migrate(db: SqliteDatabase): void {
  const current = Number(
    (db.prepare('PRAGMA user_version').get() as { user_version: number })
      .user_version,
  );
  for (let version = current; version < MIGRATIONS.length; version += 1) {
    for (const statement of MIGRATIONS[version]) db.exec(statement);
    db.exec(`PRAGMA user_version = ${version + 1}`);
  }
}

function seedOneDay(db: SqliteDatabase): void {
  db.exec(`INSERT INTO foods (id, source, source_id, name_pt, name_norm,
    verified, kcal_100, protein_100, carbs_100, fat_100, servings_json,
    attribution_json, fetched_at)
    VALUES ('taco:3', 'taco', '3', 'Arroz, tipo 1, cozido', 'arroz tipo 1 cozido',
      1, 128.3, 2.5, 28.1, 0.2, '[]', '{}', '2026-01-01')`);
  db.exec(`INSERT INTO diary_entries (id, day, meal, food_id, grams, kcal,
    protein, carbs, fat, position, created_at, updated_at)
    VALUES ('e1', '2026-09-10', 'lunch', 'taco:3', 200, 257, 5, 56, 0.5, 1,
      '2026-09-10T12:00:00.000Z', '2026-09-10T12:00:00.000Z')`);
}

describe('schema', () => {
  test('SCHEMA_VERSION is the number of migrations', () => {
    expect(SCHEMA_VERSION).toBe(MIGRATIONS.length);
    expect(MIGRATIONS).toHaveLength(PREVIOUS_VERSION + 1);
  });

  test('the minerals migration is the new last entry and only adds columns', () => {
    const statements = MIGRATIONS[PREVIOUS_VERSION];
    expect(statements).toHaveLength(MICRO_COLUMNS.length);
    for (const statement of statements) {
      expect(statement).toMatch(/^ALTER TABLE foods ADD COLUMN \w+ REAL$/);
      // Nullable on purpose: a default of 0 would make "never measured" and
      // "measured as zero" the same number in the day's total.
      expect(statement).not.toMatch(/DEFAULT/);
      expect(statement).not.toMatch(/NOT NULL/);
    }
  });

  test('the shipped migrations are untouched, and none touches diary_entries', () => {
    expect(MIGRATIONS[0][0]).toContain('CREATE TABLE IF NOT EXISTS foods');
    expect(MIGRATIONS[0].join(' ')).toContain(
      'CREATE TABLE IF NOT EXISTS diary_entries',
    );
    for (const statement of MIGRATIONS[PREVIOUS_VERSION])
      expect(statement).not.toContain('diary_entries');
  });
});

describe('migrating a database from the previous version', () => {
  test('keeps every diary entry and adds the five columns as NULL', () => {
    const db = openAt(PREVIOUS_VERSION);
    seedOneDay(db);

    migrate(db);

    const version = (
      db.prepare('PRAGMA user_version').get() as { user_version: number }
    ).user_version;
    expect(Number(version)).toBe(SCHEMA_VERSION);

    const entries = db
      .prepare('SELECT id, grams, kcal FROM diary_entries')
      .all() as { id: string; grams: number; kcal: number }[];
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 'e1', grams: 200, kcal: 257 });

    const food = db
      .prepare(
        `SELECT ${MICRO_COLUMNS.join(', ')} FROM foods WHERE id = 'taco:3'`,
      )
      .get() as Record<string, unknown>;
    for (const column of MICRO_COLUMNS) expect(food[column]).toBeNull();

    db.close();
  });

  test('a fresh database ends on the same shape as a migrated one', () => {
    const migrated = openAt(PREVIOUS_VERSION);
    migrate(migrated);
    const fresh = openAt(MIGRATIONS.length);

    const columns = (db: SqliteDatabase) =>
      (db.prepare('PRAGMA table_info(foods)').all() as { name: string }[])
        .map(column => column.name)
        .sort();
    expect(columns(migrated)).toEqual(columns(fresh));
    for (const column of MICRO_COLUMNS)
      expect(columns(fresh)).toContain(column);

    migrated.close();
    fresh.close();
  });
});
