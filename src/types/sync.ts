export type SyncEntityType = 'observation' | 'evidence' | 'profile';
export type SyncOperation = 'upsert' | 'delete' | 'upload_evidence';
export type SyncJobState = 'pending' | 'leased' | 'completed' | 'failed' | 'abandoned';

export interface SyncJob {
  id: string; // UUID v4
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  state: SyncJobState;
  attempts: number;
  nextAttemptAt: string; // ISO-8601
  leaseExpiresAt?: string | null; // ISO-8601
  idempotencyKey: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}
