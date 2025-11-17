export type SeasonalityProfile =
  | 'year_round_resident'
  | 'partial_resident'
  | 'seasonal_visitor';

export interface SeasonalityCurve {
  peak_months: number[];
  good_months: number[];
  possible_months: number[];
  availability_multiplier: number | null;
  source: string | null;
  source_confidence: number | null;
}
