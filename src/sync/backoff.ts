export interface BackoffConfig {
  initialDelayMs: number; // e.g. 2000 (2s)
  maxDelayMs: number; // e.g. 300000 (5m)
  factor: number; // e.g. 2.0
  jitterRatio: number; // e.g. 0.2 (20%)
  maxAttempts: number; // e.g. 10
}

export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  initialDelayMs: 2000,
  maxDelayMs: 300000,
  factor: 2.0,
  jitterRatio: 0.2,
  maxAttempts: 8,
};

export function calculateNextAttemptTime(
  attempt: number,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG
): { nextAttemptAt: string; isAbandoned: boolean } {
  if (attempt >= config.maxAttempts) {
    return {
      nextAttemptAt: new Date(Date.now() + 86400000).toISOString(), // 24h park
      isAbandoned: true,
    };
  }

  const rawDelay = Math.min(
    config.maxDelayMs,
    config.initialDelayMs * Math.pow(config.factor, attempt)
  );

  // Full/decorrelated jitter: [rawDelay * (1 - jitter), rawDelay * (1 + jitter)]
  const jitterRange = rawDelay * config.jitterRatio;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  const finalDelay = Math.max(1000, Math.floor(rawDelay + jitter));

  return {
    nextAttemptAt: new Date(Date.now() + finalDelay).toISOString(),
    isAbandoned: false,
  };
}
