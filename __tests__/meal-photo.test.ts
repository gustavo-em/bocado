import { MIGRATIONS, SCHEMA_VERSION } from '../src/data/db/schema';

/**
 * The photo table, checked against the migration list rather than a live
 * database: `meal_photos` is created by the last migration, and what matters
 * about it is the shape of the key and that the path is not stored.
 */
describe('meal_photos migration', () => {
  const sql = MIGRATIONS.flat().join('\n');

  it('is the last migration, and the version counts it', () => {
    expect(SCHEMA_VERSION).toBe(MIGRATIONS.length);
    expect(MIGRATIONS[MIGRATIONS.length - 1].join('\n')).toContain(
      'meal_photos',
    );
  });

  it('keys one photo per meal of a day', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS meal_photos');
    expect(sql).toMatch(/PRIMARY KEY \(day, meal\)/);
  });

  it('stores a file name, never a path or a URI', () => {
    const table = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS meal_photos'),
    );
    const body = table.slice(0, table.indexOf(')'));
    expect(body).toContain('file_name');
    // A stored absolute path breaks on reinstall; a content:// URI breaks when
    // the granting app goes away. Neither may appear in this table.
    expect(body).not.toMatch(/\bpath\b/);
    expect(body).not.toMatch(/\buri\b/i);
  });

  it('never drops or rewrites the diary to add photos', () => {
    const last = MIGRATIONS[MIGRATIONS.length - 1].join('\n');
    expect(last).not.toMatch(/DROP|ALTER TABLE diary_entries/i);
  });
});
