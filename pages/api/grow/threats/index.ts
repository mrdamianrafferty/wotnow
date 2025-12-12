import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';
import type { PlantRow } from '../../../../lib/grow/server/plants';
import type { ThreatAssessment, ThreatHostRow, ThreatRiskRuleRow, ThreatRow, ThreatSignalContext } from '../../../../lib/grow/threats/types';
import { evaluateThreats } from '../../../../lib/grow/threats/evaluateThreats';

type ThreatResponse = {
  threats: ThreatAssessment[];
  context: {
    month: number;
    hostTags: { cropTags: string[]; featureTags: string[] };
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;

  // Load preferences_json
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('preferences_json')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[grow][threats] Failed to load profile preferences_json', userId, profileError);
    return res.status(500).json({ error: 'Failed to load profile' });
  }

  const preferencesJson = asRecord(profile?.preferences_json);

  // Load plants
  const { data: plantsData, error: plantsError } = await supabase
    .from('grow_user_plants')
    .select('name,type')
    .eq('user_id', userId);

  if (plantsError) {
    console.error('[grow][threats] Failed to load plants for user', userId, plantsError);
    return res.status(500).json({ error: 'Failed to load plants' });
  }

  const plants = (plantsData as Array<Pick<PlantRow, 'name' | 'type'>> | null) ?? [];

  // Host tags derived from plants + preferences
  const featureTags = Array.isArray(preferencesJson['garden_features'])
    ? (preferencesJson['garden_features'] as unknown[]).filter(v => typeof v === 'string') as string[]
    : [];
  const cropTags = plants.map(p => p.name);

  // Fetch threats relevant to any of the user tags
  // v1: pull threats by joining garden_threat_host against (crop_tag + feature_tag)
  const hostKeys = {
    crop_tag: cropTags.map(s => String(s).trim().toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')),
    feature_tag: featureTags.map(s => String(s).trim().toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')),
  };

  const cropHostKeys = hostKeys.crop_tag.filter(Boolean);
  const featureHostKeys = hostKeys.feature_tag.filter(Boolean);

  const threatsById = new Map<string, ThreatRow>();
  const hostsByThreatId = new Map<string, ThreatHostRow[]>();
  const rulesByThreatId = new Map<string, ThreatRiskRuleRow[]>();

  // Pull hosts that match user tags
  // Note: supabase-js doesn't support OR easily with different columns; do two queries.
  const hostRows: ThreatHostRow[] = [];

  if (cropHostKeys.length > 0) {
    const { data, error } = await supabase
      .from('garden_threat_host')
      .select('*')
      .eq('host_kind', 'crop_tag')
      .in('host_key', cropHostKeys);
    if (error) {
      console.error('[grow][threats] Failed to load crop_tag hosts', error);
      return res.status(500).json({ error: 'Failed to load threats' });
    }
    hostRows.push(...((data as ThreatHostRow[]) ?? []));
  }

  if (featureHostKeys.length > 0) {
    const { data, error } = await supabase
      .from('garden_threat_host')
      .select('*')
      .eq('host_kind', 'feature_tag')
      .in('host_key', featureHostKeys);
    if (error) {
      console.error('[grow][threats] Failed to load feature_tag hosts', error);
      return res.status(500).json({ error: 'Failed to load threats' });
    }
    hostRows.push(...((data as ThreatHostRow[]) ?? []));
  }

  const threatIds = [...new Set(hostRows.map(r => r.threat_id))];
  if (threatIds.length === 0) {
    return res.status(200).json({ threats: [], context: { month: new Date().getMonth() + 1, hostTags: { cropTags, featureTags } } } satisfies ThreatResponse);
  }

  // Fetch threat records
  {
    const { data, error } = await supabase
      .from('garden_threat')
      .select('*')
      .in('id', threatIds);

    if (error) {
      console.error('[grow][threats] Failed to load threats', error);
      return res.status(500).json({ error: 'Failed to load threats' });
    }

    for (const row of (data as ThreatRow[]) ?? []) {
      threatsById.set(row.id, row);
    }
  }

  // Group hosts
  for (const host of hostRows) {
    const arr = hostsByThreatId.get(host.threat_id) ?? [];
    arr.push(host);
    hostsByThreatId.set(host.threat_id, arr);
  }

  // Fetch enabled rules
  {
    const { data, error } = await supabase
      .from('garden_threat_risk_rule')
      .select('*')
      .in('threat_id', threatIds)
      .eq('enabled', true);

    if (error) {
      console.error('[grow][threats] Failed to load threat rules', error);
      return res.status(500).json({ error: 'Failed to load threat rules' });
    }

    for (const rule of (data as ThreatRiskRuleRow[]) ?? []) {
      const arr = rulesByThreatId.get(rule.threat_id) ?? [];
      arr.push(rule);
      rulesByThreatId.set(rule.threat_id, arr);
    }
  }

  const now = new Date();
  const ctx: ThreatSignalContext = {
    now,
    month: now.getMonth() + 1,
    // weather signals will be wired later; month-only rules work now
  };

  const bundles = threatIds
    .map((id) => {
      const threat = threatsById.get(id);
      if (!threat) return null;
      return {
        threat,
        hosts: hostsByThreatId.get(id) ?? [],
        rules: rulesByThreatId.get(id) ?? [],
      };
    })
    .filter(Boolean) as Array<{ threat: ThreatRow; hosts: ThreatHostRow[]; rules: ThreatRiskRuleRow[] }>;

  const assessments = evaluateThreats(
    {
      userId,
      preferencesJson,
      plants,
    },
    bundles,
    ctx
  );

  return res.status(200).json({
    threats: assessments,
    context: {
      month: ctx.month,
      hostTags: { cropTags, featureTags },
    },
  } satisfies ThreatResponse);
}
