import type {
  HostKind,
  ThreatAssessment,
  ThreatMatchInput,
  ThreatRiskRuleRow,
  ThreatRow,
  ThreatHostRow,
  ThreatSignalContext,
} from './types';
import { buildUserHostTags } from './hostTags';
import { evaluateThreatRule } from './ruleEngine';

type ThreatBundle = {
  threat: ThreatRow;
  hosts: ThreatHostRow[];
  rules: ThreatRiskRuleRow[];
};

function bandScore(band: ThreatAssessment['band']): number {
  switch (band) {
    case 'severe':
      return 5;
    case 'high':
      return 4;
    case 'moderate':
      return 3;
    case 'low':
      return 1;
    case 'none':
    default:
      return 0;
  }
}

export function evaluateThreats(input: ThreatMatchInput, bundles: ThreatBundle[], ctx: ThreatSignalContext): ThreatAssessment[] {
  const tags = buildUserHostTags(input);
  const tagSet = new Set(tags.map(t => `${t.kind}:${t.key}`));

  const assessments: ThreatAssessment[] = [];

  for (const bundle of bundles) {
    // Host match
    const matchedHosts = bundle.hosts
      .filter(h => tagSet.has(`${h.host_kind}:${h.host_key}`))
      .map(h => ({ kind: h.host_kind as HostKind, key: h.host_key, strength: h.host_strength }));

    if (matchedHosts.length === 0) {
      continue;
    }

    // Region/season gating (soft gating: if threat has regions_applicable and user has region_code)
    if (Array.isArray(bundle.threat.regions_applicable) && bundle.threat.regions_applicable.length > 0) {
      const userRegion = input.location?.region_code;
      if (userRegion && !bundle.threat.regions_applicable.includes(userRegion)) {
        continue;
      }
    }

    // Rules
    let bestRuleScore = 0;
    let reasons: string[] = [];
    const matchedRules: Array<{ ruleId: string; title: string; score: number }> = [];

    for (const rule of bundle.rules) {
      if (!rule.enabled) continue;

      // season gating
      if (rule.season_start_month && rule.season_end_month) {
        const m = ctx.month;
        const start = rule.season_start_month;
        const end = rule.season_end_month;
        const inSeason = start <= end ? (m >= start && m <= end) : (m >= start || m <= end);
        if (!inSeason) continue;
      }

      // region gating
      if (Array.isArray(rule.region_codes) && rule.region_codes.length > 0) {
        const userRegion = input.location?.region_code;
        if (userRegion && !rule.region_codes.includes(userRegion)) {
          continue;
        }
      }

      const result = evaluateThreatRule(rule.rule_json, ctx);
      if (!result.matched) continue;

      matchedRules.push({ ruleId: rule.id, title: rule.title, score: result.score });
      if (result.score > bestRuleScore) {
        bestRuleScore = result.score;
        reasons = result.reasons;
      }
    }

    // If no rules match, still include as low informational threat (host present) with default severity
    const score = matchedRules.length > 0 ? bestRuleScore : Math.min(2, Math.max(1, Math.round(bundle.threat.severity_default / 2)));
    const band = matchedRules.length > 0
      ? (evaluateThreatRule({ version: 1, conditions: [{ signal: 'month', op: '>=', value: 1 }], score }, ctx).band)
      : (score >= 2 ? 'moderate' : 'low');

    assessments.push({
      threatId: bundle.threat.id,
      slug: bundle.threat.slug,
      commonName: bundle.threat.common_name_en,
      scientificName: bundle.threat.scientific_name,
      threatType: bundle.threat.threat_type,
      severityDefault: bundle.threat.severity_default,

      score,
      band,

      matchedHosts,
      matchedRules,
      reasons,

      cardJson: bundle.threat.card_json,
    });
  }

  return assessments
    .sort((a, b) => {
      const byBand = bandScore(b.band) - bandScore(a.band);
      if (byBand !== 0) return byBand;
      const byScore = b.score - a.score;
      if (byScore !== 0) return byScore;
      return b.severityDefault - a.severityDefault;
    });
}
