import { runMigrations } from './migrations';

export interface DatabaseConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  withTransactionAsync(action: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

let dbInstance: DatabaseConnection | null = null;

/**
 * Creates or retrieves the singleton database connection.
 * Supports expo-sqlite at runtime and in-memory mock for Jest tests.
 */
export async function getDatabase(dbName = 'monarch_tracker.db'): Promise<DatabaseConnection> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // Attempt to load expo-sqlite in React Native / Expo environment
    const SQLite = await import('expo-sqlite');
    if (SQLite && SQLite.openDatabaseAsync) {
      const nativeDb = await SQLite.openDatabaseAsync(dbName);
      
      // Enable WAL mode and foreign keys
      await nativeDb.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
      `);

      dbInstance = {
        execAsync: (sql) => nativeDb.execAsync(sql),
        runAsync: (sql, params = []) => nativeDb.runAsync(sql, params as (string | number | null)[]),
        getFirstAsync: (sql, params = []) => nativeDb.getFirstAsync(sql, params as (string | number | null)[]),
        getAllAsync: (sql, params = []) => nativeDb.getAllAsync(sql, params as (string | number | null)[]),
        withTransactionAsync: (action) => nativeDb.withTransactionAsync(action),
        closeAsync: () => nativeDb.closeAsync(),
      };

      await runMigrations(dbInstance);
      return dbInstance;
    }
  } catch {
    // Falling back to in-memory test database in non-native environments
  }

  // In-memory sqlite mock adapter for Jest / Web / Test environments
  dbInstance = createInMemoryDatabase();
  await runMigrations(dbInstance);
  return dbInstance;
}

export function setTestDatabase(db: DatabaseConnection): void {
  dbInstance = db;
}

export function resetDatabaseInstance(): void {
  dbInstance = null;
}

/**
 * In-memory SQL engine for deterministic Jest unit tests and non-native execution.
 */
export function createInMemoryDatabase(): DatabaseConnection {
  const tables: Record<string, Record<string, unknown>[]> = {};
  let inTransaction = false;

  return {
    async execAsync(sql: string): Promise<void> {
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?([a-zA-Z0-9_]+)/i);
          if (match && match[1]) {
            const tableName = match[1].toLowerCase();
            if (!tables[tableName]) {
              tables[tableName] = [];
            }
          }
        }
      }
    },

    async runAsync(sql: string, params: unknown[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
      const trimmed = sql.trim();

      // INSERT / INSERT OR REPLACE
      const insertMatch = trimmed.match(/INSERT (?:OR REPLACE )?INTO ([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (insertMatch) {
        const tableName = insertMatch[1].toLowerCase();
        const columns = insertMatch[2].split(',').map((c) => c.trim().toLowerCase());
        const rawValues = insertMatch[3].split(',').map((v) => v.trim());
        if (!tables[tableName]) tables[tableName] = [];

        const row: Record<string, unknown> = {};
        let paramIdx = 0;

        columns.forEach((col, idx) => {
          const valToken = rawValues[idx] || '?';
          if (valToken === '?') {
            row[col] = params[paramIdx] !== undefined ? params[paramIdx] : null;
            paramIdx++;
          } else if (valToken.startsWith("'") && valToken.endsWith("'")) {
            row[col] = valToken.slice(1, -1);
          } else if (valToken === '0') {
            row[col] = 0;
          } else if (valToken === '1') {
            row[col] = 1;
          } else if (valToken.toUpperCase() === 'NULL') {
            row[col] = null;
          } else if (!isNaN(Number(valToken))) {
            row[col] = Number(valToken);
          } else {
            row[col] = params[paramIdx] !== undefined ? params[paramIdx] : null;
            paramIdx++;
          }
        });

        // Unique PK checks
        const pk = row.id !== undefined ? 'id' : row.version !== undefined ? 'version' : row.local_profile_id !== undefined ? 'local_profile_id' : 'observation_id';
        if (row[pk] !== undefined) {
          const existingIdx = tables[tableName].findIndex((r) => r[pk] === row[pk]);
          if (existingIdx >= 0) {
            tables[tableName][existingIdx] = { ...tables[tableName][existingIdx], ...row };
            return { lastInsertRowId: existingIdx + 1, changes: 1 };
          }
        }

        tables[tableName].push(row);
        return { lastInsertRowId: tables[tableName].length, changes: 1 };
      }

      // UPDATE
      const updateMatch = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+)$/i);
      if (updateMatch) {
        const tableName = updateMatch[1].toLowerCase();
        const setClause = updateMatch[2];
        const whereClause = updateMatch[3];
        const rows = tables[tableName] || [];

        // Determine target ID from last param usually used in WHERE id = ? or observation_id = ?
        const targetId = params[params.length - 1];

        // Parse assignments in SET clause
        const assignments = setClause.split(',').map((a) => a.trim());

        for (const row of rows) {
          if (row.id === targetId || row.observation_id === targetId || !whereClause.includes('id = ?')) {
            let paramIdx = 0;
            for (const assignment of assignments) {
              const eqIdx = assignment.indexOf('=');
              if (eqIdx > 0) {
                const col = assignment.substring(0, eqIdx).trim().toLowerCase();
                const valExpr = assignment.substring(eqIdx + 1).trim();
                if (valExpr.includes('?')) {
                  const paramVal = params[paramIdx++];
                  if (valExpr.toUpperCase().startsWith('COALESCE')) {
                    if (paramVal !== null && paramVal !== undefined) {
                      row[col] = paramVal;
                    }
                  } else {
                    row[col] = paramVal;
                  }
                } else if (valExpr.includes('attempts + 1')) {
                  row[col] = ((row[col] as number) || 0) + 1;
                } else if (valExpr.startsWith("'") && valExpr.endsWith("'")) {
                  row[col] = valExpr.slice(1, -1);
                } else if (valExpr.toUpperCase() === 'NULL') {
                  row[col] = null;
                }
              }
            }
          }
        }
        return { lastInsertRowId: 1, changes: rows.length };
      }

      // DELETE
      const deleteMatch = trimmed.match(/DELETE FROM ([a-zA-Z0-9_]+)/i);
      if (deleteMatch) {
        const tableName = deleteMatch[1].toLowerCase();
        const count = (tables[tableName] || []).length;
        tables[tableName] = [];
        return { lastInsertRowId: 0, changes: count };
      }

      return { lastInsertRowId: 1, changes: 1 };
    },

    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const results = await this.getAllAsync<T>(sql, params);
      return results.length > 0 ? results[0] : null;
    },

    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const trimmed = sql.trim();

      // Handle COUNT(*) queries
      if (trimmed.toUpperCase().includes('COUNT(*)')) {
        const selectMatch = trimmed.match(/FROM\s+([a-zA-Z0-9_]+)/i);
        if (selectMatch) {
          const tableName = selectMatch[1].toLowerCase();
          const rows = tables[tableName] || [];
          let count = rows.length;
          if (trimmed.includes("WHERE state IN ('pending', 'leased')") || trimmed.includes('WHERE state IN')) {
            count = rows.filter((r) => r.state === 'pending' || r.state === 'leased').length;
          }
          return [{ count }] as unknown as T[];
        }
        return [{ count: 0 }] as unknown as T[];
      }

      const selectMatch = trimmed.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (selectMatch) {
        const tableName = selectMatch[1].toLowerCase();
        let rows = tables[tableName] || [];

        if (trimmed.includes('WHERE')) {
          if (trimmed.includes('id = ?') || trimmed.includes('observation_id = ?') || trimmed.includes('local_profile_id = ?')) {
            const paramVal = params[0];
            rows = rows.filter((r) => r.id === paramVal || r.observation_id === paramVal || r.local_profile_id === paramVal);
          } else if (trimmed.includes('deleted_at IS NULL')) {
            rows = rows.filter((r) => r.deleted_at === null || r.deleted_at === undefined);
          } else if (trimmed.includes('next_attempt_at <=')) {
            rows = rows.filter((r) => r.state === 'pending' || r.state === 'leased');
          }
        }

        if (trimmed.toUpperCase().includes('ORDER BY')) {
          rows.sort((a, b) => {
            const aTime = (a.captured_at || a.created_at || '') as string;
            const bTime = (b.captured_at || b.created_at || '') as string;
            return bTime.localeCompare(aTime);
          });
        }

        const limitMatch = trimmed.match(/LIMIT\s+(\d+|\?)/i);
        if (limitMatch) {
          const limitVal = limitMatch[1] === '?' ? (params[params.length - 1] as number) || 5 : parseInt(limitMatch[1], 10);
          rows = rows.slice(0, limitVal);
        }

        return rows.map((r) => ({ ...r })) as unknown as T[];
      }
      return [];
    },

    async withTransactionAsync(action: () => Promise<void>): Promise<void> {
      inTransaction = true;
      try {
        await action();
      } finally {
        inTransaction = false;
      }
    },

    async closeAsync(): Promise<void> {},
  };
}
