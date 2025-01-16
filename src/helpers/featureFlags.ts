export const FEATURE_FLAGS = ['flag_dev', 'flag_yelling'] as const;

export type FeatureFlagKeys = typeof FEATURE_FLAGS;
export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number];

export interface IFeatureFlags {
  isFeatureEnabled(key: FeatureFlagKey): boolean;
}

export class FeatureFlags {
  static instance?: IFeatureFlags;
}

/*
  Convenience function to check if a feature is enabled when we use the feature flags as a boolean value.
  Although boolean is the most common use case, the feature flags can be used for any value, including number, string, enum or even object.
  */
export const isFeatureEnabled = (feature: FeatureFlagKey): boolean => {
  if (!FeatureFlags.instance) return false;
  return FeatureFlags.instance.isFeatureEnabled(feature);
};
