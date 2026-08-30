import { ProfileRepository } from '../db';
import { ParticipantProfile, ExperienceLevel } from '../types';

export const CURRENT_CONSENT_VERSION = '2026.1';

export class ConsentManager {
  constructor(private profileRepo: ProfileRepository) {}

  async getConsentState(): Promise<ParticipantProfile> {
    const existing = await this.profileRepo.getProfile();
    if (existing) {
      return existing;
    }

    const defaultProfile: ParticipantProfile = {
      localProfileId: `profile-${Date.now()}`,
      consentVersion: CURRENT_CONSENT_VERSION,
      consentedAt: new Date().toISOString(),
      ageBand: null,
      experienceLevel: 'intermediate',
      demographicRegion: null,
      shareDemographics: false,
      updatedAt: new Date().toISOString(),
    };

    await this.profileRepo.upsertProfile(defaultProfile);
    return defaultProfile;
  }

  async updateDemographics(
    experienceLevel: ExperienceLevel,
    ageBand: string | null,
    region: string | null,
    shareConsent: boolean
  ): Promise<ParticipantProfile> {
    const profile = await this.getConsentState();
    const updated: ParticipantProfile = {
      ...profile,
      experienceLevel,
      ageBand,
      demographicRegion: region,
      shareDemographics: shareConsent,
      updatedAt: new Date().toISOString(),
    };

    await this.profileRepo.upsertProfile(updated);
    return updated;
  }

  async revokeDemographicsSharing(): Promise<void> {
    const profile = await this.getConsentState();
    const updated: ParticipantProfile = {
      ...profile,
      shareDemographics: false,
      updatedAt: new Date().toISOString(),
    };
    await this.profileRepo.upsertProfile(updated);
  }
}
