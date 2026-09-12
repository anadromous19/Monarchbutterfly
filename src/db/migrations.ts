import { SCHEMA_MIGRATIONS } from './schema';
import { DatabaseConnection } from './database';

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

export async function runMigrations(db: DatabaseConnection): Promise<void> {
  // Ensure schema_migrations table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Get current applied version
  const applied = await db.getAllAsync<MigrationRecord>(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;'
  );

  const appliedVersions = new Set(applied.map((m) => m.version));

  for (const migration of SCHEMA_MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Applying migration v${migration.version}: ${migration.name}`);
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.runAsync(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, new Date().toISOString()]
        );
      });
      console.log(`Successfully applied migration v${migration.version}`);
    }
  }
}
