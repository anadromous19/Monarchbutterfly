export type EvidenceUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface Evidence {
  id: string; // UUID v4
  observationId: string;
  localUri: string;
  sha256: string;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  s3Key?: string | null;
  uploadStatus: EvidenceUploadStatus;
  createdAt: string;
}
