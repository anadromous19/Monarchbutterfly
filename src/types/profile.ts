export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert' | 'professional_biologist';

export interface ParticipantProfile {
  localProfileId: string;
  consentVersion: string;
  consentedAt?: string | null;
  ageBand?: string | null;
  experienceLevel?: ExperienceLevel | null;
  demographicRegion?: string | null;
  shareDemographics: boolean;
  updatedAt: string;
}
