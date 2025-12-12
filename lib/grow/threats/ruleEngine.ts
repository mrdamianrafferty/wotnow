import type { ThreatRiskBand, ThreatSignalContext } from './types';

type RuleConditionOp = '>=' | '>' | '<=' | '<' | 'between' | 'eq' | 'in';

export type ThreatRuleJsonV1 = {
  version: 1;
  logic?: 'all' | 'any';
  conditions: Array<{
    signal: 'month' | 'rain_72h_mm' | 'rh_hours_24h_over_90' | 'temp_avg_24h_c';
    op: RuleConditionOp;
    value: number | [number, number] | string[];
  }>;
  score: number; // 0-5
  reasons?: string[];
};

function toBand(score: number): ThreatRiskBand {
  if (score >= 5) return 'severe';
  if (score >= 4) return 'high';
  if (score >= 3) return 'moderate';
  if (score >= 1) return 'low';
  return 'none';
}

function getSignalValue(ctx: ThreatSignalContext, signal: ThreatRuleJsonV1['conditions'][number]['signal']): number | undefined {
  switch (signal) {
    case 'month':
      return ctx.month;
    case 'rain_72h_mm':
      return ctx.weather?.rain_72h_mm;
    case 'rh_hours_24h_over_90':
      return ctx.weather?.rh_hours_24h_over_90;
    case 'temp_avg_24h_c':
      return ctx.weather?.temp_avg_24h_c;
    default:
      return undefined;
  }
}

function evalCondition(value: number | undefined, op: RuleConditionOp, operand: ThreatRuleJsonV1['conditions'][number]['value']): boolean {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return false;
  }

  switch (op) {
    case '>=':
      return typeof operand === 'number' ? value >= operand : false;
    case '>':
      return typeof operand === 'number' ? value > operand : false;
    case '<=':
      return typeof operand === 'number' ? value <= operand : false;
    case '<':
      return typeof operand === 'number' ? value < operand : false;
    case 'eq':
      return typeof operand === 'number' ? value === operand : false;
    case 'between':
      return Array.isArray(operand) && operand.length === 2 ? value >= operand[0] && value <= operand[1] : false;
    case 'in':
      return Array.isArray(operand) ? operand.map(Number).some(v => v === value) : false;
    default:
      return false;
  }
}

export function evaluateThreatRule(ruleJson: unknown, ctx: ThreatSignalContext): {
  matched: boolean;
  score: number;
  band: ThreatRiskBand;
  reasons: string[];
} {
  const parsed = ruleJson as Partial<ThreatRuleJsonV1>;

  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.conditions) || typeof parsed.score !== 'number') {
    return { matched: false, score: 0, band: 'none', reasons: [] };
  }

  const logic = parsed.logic ?? 'all';
  const results = parsed.conditions.map((cond) => {
    const signal = cond.signal as ThreatRuleJsonV1['conditions'][number]['signal'];
    const op = cond.op as RuleConditionOp;
    const operand = cond.value as ThreatRuleJsonV1['conditions'][number]['value'];
    const signalValue = getSignalValue(ctx, signal);
    return evalCondition(signalValue, op, operand);
  });

  const matched = logic === 'any' ? results.some(Boolean) : results.every(Boolean);
  const score = matched ? Math.max(0, Math.min(5, parsed.score)) : 0;

  return {
    matched,
    score,
    band: toBand(score),
    reasons: matched ? (Array.isArray(parsed.reasons) ? parsed.reasons.filter(r => typeof r === 'string') as string[] : []) : [],
  };
}
