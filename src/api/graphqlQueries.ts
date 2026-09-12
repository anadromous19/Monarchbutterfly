export const SYNC_OBSERVATION_MUTATION = `
  mutation SyncObservation($input: SyncObservationInput!) {
    syncObservation(input: $input) {
      success
      id
      version
      updatedAt
      weatherStatus
      weatherSnapshot {
        observationId
        observedAt
        provider
        temperatureC
        humidityPercent
        pressureHpa
        windSpeedMps
        precipitationMm
        cloudPercent
        conditionCode
      }
      error
    }
  }
`;

export const GET_PRESIGNED_UPLOAD_URL_MUTATION = `
  mutation GetPresignedUploadUrl($observationId: ID!, $evidenceId: ID!, $sha256: String!, $byteSize: Int!) {
    getPresignedUploadUrl(observationId: $observationId, evidenceId: $evidenceId, sha256: $sha256, byteSize: $byteSize) {
      uploadUrl
      s3Key
      expiresInSeconds
      headers
    }
  }
`;

export const VERIFY_EVIDENCE_MUTATION = `
  mutation VerifyEvidence($input: VerifyEvidenceInput!) {
    verifyEvidence(input: $input) {
      success
      evidenceId
      verified
      s3Url
    }
  }
`;

export const DELETE_OBSERVATION_MUTATION = `
  mutation DeleteObservation($id: ID!, $idempotencyKey: String!) {
    deleteObservation(id: $id, idempotencyKey: $idempotencyKey) {
      success
      id
      deletedAt
    }
  }
`;
