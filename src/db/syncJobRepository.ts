import { DatabaseConnection } from './database';
import { SyncEntityType, SyncJob, SyncJobState, SyncOperation } from '../types';

interface SyncJobRow {
  id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperation;
  state: SyncJobState;
  attempts: number;
  next_attempt_at: string;
  lease_expires_at: string | null;
  idempotency_key: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToSyncJob(row: SyncJobRow): SyncJob {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    state: row.state,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    leaseExpiresAt: row.lease_expires_at,
    idempotencyKey: row.idempotency_key,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SyncJobRepository {
  constructor(private db: DatabaseConnection) {}

  async enqueue(job: Omit<SyncJob, 'attempts' | 'state' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sync_jobs (
        id, entity_type, entity_id, operation, state,
        attempts, next_attempt_at, lease_expires_at, idempotency_key,
        last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?, null, ?, ?);`,
      [
        job.id,
        job.entityType,
        job.entityId,
        job.operation,
        job.nextAttemptAt || now,
        job.leaseExpiresAt ?? null,
        job.idempotencyKey,
        now,
        now,
      ]
    );
  }

  async leaseDueJobs(limit = 5, leaseDurationSeconds = 60): Promise<SyncJob[]> {
    const now = new Date().toISOString();
    const leaseExpiry = new Date(Date.now() + leaseDurationSeconds * 1000).toISOString();

    const dueRows = await this.db.getAllAsync<SyncJobRow>(
      `SELECT * FROM sync_jobs
       WHERE (state = 'pending' OR (state = 'leased' AND lease_expires_at < ?))
         AND next_attempt_at <= ?
       ORDER BY created_at ASC
       LIMIT ?;`,
      [now, now, limit]
    );

    const leasedJobs: SyncJob[] = [];
    for (const row of dueRows) {
      await this.db.runAsync(
        `UPDATE sync_jobs
         SET state = 'leased', lease_expires_at = ?, attempts = attempts + 1, updated_at = ?
         WHERE id = ?;`,
        [leaseExpiry, now, row.id]
      );
      leasedJobs.push({
        ...mapRowToSyncJob(row),
        state: 'leased',
        attempts: row.attempts + 1,
        leaseExpiresAt: leaseExpiry,
      });
    }

    return leasedJobs;
  }

  async markCompleted(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE sync_jobs
       SET state = 'completed', lease_expires_at = null, updated_at = ?
       WHERE id = ?;`,
      [now, id]
    );
  }

  async markFailed(id: string, nextAttemptAt: string, error: string, abandon = false): Promise<void> {
    const now = new Date().toISOString();
    const state: SyncJobState = abandon ? 'abandoned' : 'pending';
    await this.db.runAsync(
      `UPDATE sync_jobs
       SET state = ?, next_attempt_at = ?, lease_expires_at = null, last_error = ?, updated_at = ?
       WHERE id = ?;`,
      [state, nextAttemptAt, error, now, id]
    );
  }

  async getPendingCount(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_jobs WHERE state IN ('pending', 'leased');`
    );
    return row?.count ?? 0;
  }
}
