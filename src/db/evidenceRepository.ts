import { DatabaseConnection } from './database';
import { Evidence, EvidenceUploadStatus } from '../types';

interface EvidenceRow {
  id: string;
  observation_id: string;
  local_uri: string;
  sha256: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  s3_key: string | null;
  upload_status: EvidenceUploadStatus;
  created_at: string;
}

function mapRowToEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    observationId: row.observation_id,
    localUri: row.local_uri,
    sha256: row.sha256,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    width: row.width,
    height: row.height,
    s3Key: row.s3_key,
    uploadStatus: row.upload_status,
    createdAt: row.created_at,
  };
}

export class EvidenceRepository {
  constructor(private db: DatabaseConnection) {}

  async insert(evidence: Evidence): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO evidence (
        id, observation_id, local_uri, sha256, mime_type,
        byte_size, width, height, s3_key, upload_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        evidence.id,
        evidence.observationId,
        evidence.localUri,
        evidence.sha256,
        evidence.mimeType,
        evidence.byteSize,
        evidence.width ?? null,
        evidence.height ?? null,
        evidence.s3Key ?? null,
        evidence.uploadStatus,
        evidence.createdAt,
      ]
    );
  }

  async getByObservationId(observationId: string): Promise<Evidence[]> {
    const rows = await this.db.getAllAsync<EvidenceRow>(
      'SELECT * FROM evidence WHERE observation_id = ?;',
      [observationId]
    );
    return rows.map(mapRowToEvidence);
  }

  async getById(id: string): Promise<Evidence | null> {
    const row = await this.db.getFirstAsync<EvidenceRow>(
      'SELECT * FROM evidence WHERE id = ?;',
      [id]
    );
    return row ? mapRowToEvidence(row) : null;
  }

  async updateUploadStatus(
    id: string,
    uploadStatus: EvidenceUploadStatus,
    s3Key?: string | null
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE evidence
       SET upload_status = ?, s3_key = COALESCE(?, s3_key)
       WHERE id = ?;`,
      [uploadStatus, s3Key ?? null, id]
    );
  }
}
