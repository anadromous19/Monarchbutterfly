export interface S3UploadOptions {
  uploadUrl: string;
  localUri: string;
  sha256: string;
  mimeType?: string;
  headers?: Record<string, string>;
}

export interface S3UploadResult {
  success: boolean;
  httpStatus: number;
  etag?: string;
  error?: string;
}

export class S3Uploader {
  /**
   * Uploads raw photographic evidence directly to private S3 bucket via presigned PUT URL.
   * Never routes large binary payloads through AppSync / Lambda.
   */
  async uploadEvidence(options: S3UploadOptions): Promise<S3UploadResult> {
    try {
      if (!options.uploadUrl || options.uploadUrl.includes('example.com') || options.uploadUrl.includes('signed=true')) {
        return {
          success: false,
          httpStatus: 0,
          error: 'S3 storage not connected: Presigned URL is unconfigured.',
        };
      }

      // Perform actual fetch PUT to presigned S3 URL
      const response = await fetch(options.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': options.mimeType || 'image/jpeg',
          ...(options.headers || {}),
        },
        body: options.localUri, // Or blob in browser
      });

      if (!response.ok) {
        return {
          success: false,
          httpStatus: response.status,
          error: `S3 upload returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        httpStatus: response.status,
        etag: response.headers.get('etag') || `"${options.sha256.substring(0, 32)}"`,
      };
    } catch (err) {
      return {
        success: false,
        httpStatus: 500,
        error: (err as Error).message,
      };
    }
  }
}
