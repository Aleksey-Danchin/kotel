export type AlertnessMode = 'debug' | 'isolation' | 'quarantine' | 'lockdown';

const VALID_ALERTNESS_MODES: AlertnessMode[] = [
  'debug',
  'isolation',
  'quarantine',
  'lockdown',
];

export function getAlertMode(): AlertnessMode {
  const value = process.env.REUSE_DETECTION_MODE ?? 'quarantine';

  if (!VALID_ALERTNESS_MODES.includes(value as AlertnessMode)) {
    throw new Error(`Invalid REUSE_DETECTION_MODE: ${value}`);
  }

  return value as AlertnessMode;
}
