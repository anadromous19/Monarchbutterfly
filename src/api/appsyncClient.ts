import { AuthService } from '../auth';
import {
  PresignedUploadUrlResponse,
  SyncObservationInput,
  SyncObservationResponse,
  VerifyEvidenceInput,
  VerifyEvidenceResponse,
} from '../types';
import {
  DELETE_OBSERVATION_MUTATION,
  GET_PRESIGNED_UPLOAD_URL_MUTATION,
  SYNC_OBSERVATION_MUTATION,
  VERIFY_EVIDENCE_MUTATION,
} from './graphqlQueries';

export interface AppSyncConfig {
  endpoint: string;
  region: string;
}

export class AppSyncClient {
  constructor(
    private config: AppSyncConfig,
    private authService: AuthService
  ) {}

  private isLiveEndpoint(): boolean {
    return (
      Boolean(this.config.endpoint) &&
      !this.config.endpoint.includes('example.com') &&
      !this.config.endpoint.includes('api.monarchtracker.org')
    );
  }

  private async executeGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    if (!this.isLiveEndpoint()) {
      throw new Error(`Cloud backend not configured (endpoint: ${this.config.endpoint || 'none'}). Observations remain saved in local offline outbox.`);
    }

    const session = await this.authService.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-identity': session.identityId,
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`AppSync HTTP Error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message || 'GraphQL Mutation failed');
    }

    return json.data;
  }

  async syncObservation(input: SyncObservationInput): Promise<SyncObservationResponse> {
    const data = await this.executeGraphQL<{ syncObservation: SyncObservationResponse }>(
      SYNC_OBSERVATION_MUTATION,
      { input }
    );

    return data.syncObservation;
  }

  async getPresignedUploadUrl(
    observationId: string,
    evidenceId: string,
    sha256: string,
    byteSize: number
  ): Promise<PresignedUploadUrlResponse> {
    const data = await this.executeGraphQL<{ getPresignedUploadUrl: PresignedUploadUrlResponse }>(
      GET_PRESIGNED_UPLOAD_URL_MUTATION,
      { observationId, evidenceId, sha256, byteSize }
    );

    return data.getPresignedUploadUrl;
  }

  async verifyEvidence(input: VerifyEvidenceInput): Promise<VerifyEvidenceResponse> {
    const data = await this.executeGraphQL<{ verifyEvidence: VerifyEvidenceResponse }>(
      VERIFY_EVIDENCE_MUTATION,
      { input }
    );

    return data.verifyEvidence;
  }

  async deleteObservation(id: string, idempotencyKey: string): Promise<{ success: boolean; id: string; deletedAt: string }> {
    const data = await this.executeGraphQL<{ deleteObservation: { success: boolean; id: string; deletedAt: string } }>(
      DELETE_OBSERVATION_MUTATION,
      { id, idempotencyKey }
    );

    return data.deleteObservation;
  }
}
