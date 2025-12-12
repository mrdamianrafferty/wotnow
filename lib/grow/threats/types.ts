export type ThreatType =
  | 'pest'
  | 'fungal'
  | 'oomycete'
  | 'bacterial'
  | 'viral'
  | 'nematode'
  | 'abiotic'
  | 'nutrient'
  | 'weed'
  | 'other';

export type HostKind = 'species' | 'genus' | 'family' | 'crop_tag' | 'feature_tag';

export type ThreatCardJson = Record<string, unknown>;

export type ThreatRow = {
  id: string;
  slug: string;
  threat_type: ThreatType;
  common_name_en: string;
  scientific_name: string | null;
  description: string | null;
  recognition: string | null;
  severity_default: number;
  contagious: boolean;
  regions_applicable: string[] | null;
  notes: string | null;
  card_json: ThreatCardJson;
  created_at: string;
  updated_at: string;
};

export type ThreatHostRow = {
  threat_id: string;
  host_kind: HostKind;
  host_key: string;
  host_strength: number;
  notes: string | null;
};

export type ThreatRiskRuleRow = {
  id: string;
  threat_id: string;
  title: string;
  enabled: boolean;
  season_start_month: number | null;
  season_end_month: number | null;
  region_codes: string[] | null;
  rule_json: unknown;
  created_at: string;
};

export type ThreatSignalContext = {
  now: Date;
  month: number; // 1-12
  weather?: {
    rain_72h_mm?: number;
    rh_hours_24h_over_90?: number;
    temp_avg_24h_c?: number;
  };
};

export type ThreatMatchInput = {
  userId: string;
  location?: {
    lat?: number;
    lon?: number;
    climate_zone?: string;
    region_code?: string;
  };
  preferencesJson: Record<string, unknown>;
  plants: Array<{ name: string; type?: string | null }>; // from grow_user_plants
};

export type ThreatRiskBand = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export type ThreatAssessment = {
  threatId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  threatType: ThreatType;
  severityDefault: number;

  score: number; // 0-5
  band: ThreatRiskBand;

  matchedHosts: Array<{ kind: HostKind; key: string; strength: number }>;
  matchedRules: Array<{ ruleId: string; title: string; score: number }>;
  reasons: string[];

  cardJson: ThreatCardJson;
};
