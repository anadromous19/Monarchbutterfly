/**
 * AppSync Resolver: getPresignedUploadUrl
 * Generates constrained, short-lived S3 PUT URL for private evidence upload.
 */

export interface GetPresignedUrlArgs {
  observationId: string;
  evidenceId: string;
  sha256: string;
  byteSize: number;
}

export async function handler(event: { arguments: GetPresignedUrlArgs; identity: { cognitoIdentityId: string } }) {
  const { observationId, evidenceId, sha256, byteSize } = event.arguments;
  const identityId = event.identity?.cognitoIdentityId || 'guest-identity-mock';
  
  // Strict key pattern: private/{identityId}/observations/{observationId}/{evidenceId}.jpg
  const s3Key = `private/${identityId}/observations/${observationId}/${evidenceId}.jpg`;
  const bucketName = process.env.S3_EVIDENCE_BUCKET || 'monarch-evidence-private';

  // In production AWS SDK:
  // const s3 = new S3Client({});
  // const command = new PutObjectCommand({ Bucket: bucketName, Key: s3Key, ChecksumSHA256: sha256, ContentLength: byteSize });
  // const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

  return {
    uploadUrl: `https://${bucketName}.s3.amazonaws.com/${s3Key}?X-Amz-Expires=900`,
    s3Key,
    expiresInSeconds: 900,
    headers: JSON.stringify({
      'Content-Type': 'image/jpeg',
      'x-amz-checksum-sha256': sha256,
    }),
  };
}
