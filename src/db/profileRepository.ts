import { DatabaseConnection } from './database';
import { ParticipantProfile, ExperienceLevel } from '../types';

interface ProfileRow {
  local_profile_id: string;
  consent_version: string;
  consented_at: string | null;
  age_band: string | null;
  experience_level: ExperienceLevel | null;
  demographic_region: string | null;
  share_demographics: number;
  updated_at: string;
}

function mapRowToProfile(row: ProfileRow): ParticipantProfile {
  return {
    localProfileId: row.local_profile_id,
    consentVersion: row.consent_version,
    consentedAt: row.consented_at,
    ageBand: row.age_band,
    experienceLevel: row.experience_level,
    demographicRegion: row.demographic_region,
    shareDemographics: row.share_demographics === 1,
    updatedAt: row.updated_at,
  };
}

export class ProfileRepository {
  constructor(private db: DatabaseConnection) {}

  async getProfile(): Promise<ParticipantProfile | null> {
    const row = await this.db.getFirstAsync<ProfileRow>(
      'SELECT * FROM participant_profile LIMIT 1;'
    );
    return row ? mapRowToProfile(row) : null;
  }

  async upsertProfile(profile: ParticipantProfile): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT OR REPLACE INTO participant_profile (
        local_profile_id, consent_version, consented_at, age_band,
        experience_level, demographic_region, share_demographics, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        profile.localProfileId,
        profile.consentVersion,
        profile.consentedAt ?? null,
        profile.ageBand ?? null,
        profile.experienceLevel ?? null,
        profile.demographicRegion ?? null,
        profile.shareDemographics ? 1 : 0,
        profile.updatedAt || now,
      ]
    );
  }
}
