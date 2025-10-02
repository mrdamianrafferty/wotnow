// packages/weather-services/bio-data-audit.ts
// Utility to audit Stormglass bio data coverage for ICES rectangles stored in Supabase.
// Usage example at bottom: runBioAudit().

import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../../lib/supabase/serverClient';
import { fetchStormglassBio, type StormglassResponse } from '../../utils/fetchStormglass';

loadEnv();
loadEnv({ path: '.env.local', override: false });

export type BioDataQuality = 'high' | 'medium' | 'low' | 'none';

export interface BioDataAvailability {
  rectangle_id: string;
  rectangle_code: string;
  region: string;
  has_bio_data: boolean;
  available_params: string[];
  data_quality: BioDataQuality;
  last_checked: Date;
}

export interface BioAuditReport {
  total_rectangles: number;
  bio_data_available: number;
  coverage_percentage: number;
  by_region: Record<string, { total: number; with_bio: number; percentage: number }>;
  by_quality: Record<BioDataQuality, number>;
  most_common_params: Record<string, number>;
  cost_estimate: {
    high_coverage_rectangles: number;
    medium_coverage_rectangles: number;
    estimated_monthly_cost: number;
  };
  entries: BioDataAvailability[];
  generated_at: string;
}

interface IcesRectangle {
  id: string;
  center_lat: number;
  center_lon: number;
  rectangle_code: string;
  region: string;
}

const DEFAULT_STORMGLASS_PARAMS = [
  'chlorophyll',
  'oxygen',
  'nitrate',
  'phosphate',
  'salinity',
  'surfaceTemperature',
  'phytoplankton',
  'ph',
];

export class BioDataAuditor {
  private readonly supabase: SupabaseClient;
  private readonly stormglassParams: string[];

  constructor(supabaseClient?: SupabaseClient, params: string[] = DEFAULT_STORMGLASS_PARAMS) {
    this.supabase = supabaseClient ?? getSupabaseServerClient();
    this.stormglassParams = params;
  }

  async auditAllRectangles(): Promise<BioAuditReport> {
    console.log('🧪 Starting bio data audit...');

    const { data, error } = await this.supabase
      .from('ices_rectangles')
      .select('id, center_lat, center_lon, rectangle_code, region')
      .eq('is_coastal', true);

    if (error) {
      throw new Error(`Failed to load ICES rectangles: ${error.message}`);
    }

    const rectangles: IcesRectangle[] = (data ?? []).filter((row): row is IcesRectangle =>
      Boolean(row?.id && row?.center_lat != null && row?.center_lon != null)
    );

    if (rectangles.length === 0) {
      console.warn('No coastal ICES rectangles found to audit.');
      return this.generateReport([]);
    }

    console.log(`🔍 Auditing bio data for ${rectangles.length} rectangles...`);

    const results: BioDataAvailability[] = [];

    for (const batch of this.chunk(rectangles, 5)) {
      console.log(`Processing batch of ${batch.length} rectangles...`);

      const batchResults = await Promise.all(batch.map((rect) => this.checkBioDataForRectangle(rect)));
      results.push(...batchResults);

      await this.saveBioAvailability(batchResults);
      await this.sleep(2500);
    }

    const report = this.generateReport(results);
    console.log('✅ Bio audit complete!');
    console.log(`📊 Coverage: ${report.coverage_percentage}% (${report.bio_data_available}/${report.total_rectangles})`);
    return report;
  }

  private async checkBioDataForRectangle(rectangle: IcesRectangle): Promise<BioDataAvailability> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const response: StormglassResponse = await fetchStormglassBio(
        rectangle.center_lat,
        rectangle.center_lon,
        startDate.toISOString(),
        endDate.toISOString(),
        this.stormglassParams
      );

      const availableParams = this.analyzeAvailableParams(response);
      const dataQuality = this.assessDataQuality(availableParams);

      console.log(`✅ ${rectangle.rectangle_code}: ${availableParams.length} params available (${dataQuality})`);

      return {
        rectangle_id: rectangle.id,
        rectangle_code: rectangle.rectangle_code,
        region: rectangle.region,
        has_bio_data: availableParams.length > 0,
        available_params: availableParams,
        data_quality: dataQuality,
        last_checked: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Bio check failed for ${rectangle.rectangle_code}: ${message}`);
      return this.createNoDataResult(rectangle);
    }
  }

  private analyzeAvailableParams(stormglassData: StormglassResponse): string[] {
    if (!Array.isArray(stormglassData.hours) || stormglassData.hours.length === 0) {
      return [];
    }

    const sampleHour = stormglassData.hours[0];
    const available: string[] = [];

    for (const param of this.stormglassParams) {
      const reading = sampleHour?.[param];
      if (reading && typeof reading === 'object') {
        const hasData = Object.values(reading).some((value) => value !== null && value !== undefined);
        if (hasData) {
          available.push(param);
        }
      }
    }

    return available;
  }

  private assessDataQuality(availableParams: string[]): BioDataQuality {
    if (availableParams.length === 0) return 'none';
    if (availableParams.length >= 4) return 'high';
    if (availableParams.length >= 2) return 'medium';
    return 'low';
  }

  private async saveBioAvailability(results: BioDataAvailability[]): Promise<void> {
    for (const result of results) {
      const { error } = await this.supabase
        .from('ices_rectangles')
        .update({
          bio_data_available: result.has_bio_data,
          available_bio_params: result.available_params,
          bio_data_quality: result.data_quality,
          bio_data_checked_at: result.last_checked.toISOString(),
        })
        .eq('id', result.rectangle_id);

      if (error) {
        console.error(`Failed to persist bio availability for rectangle ${result.rectangle_id}: ${error.message}`);
      }
    }
  }

  private createNoDataResult(rectangle: IcesRectangle): BioDataAvailability {
    return {
      rectangle_id: rectangle.id,
      rectangle_code: rectangle.rectangle_code,
      region: rectangle.region,
      has_bio_data: false,
      available_params: [],
      data_quality: 'none',
      last_checked: new Date(),
    };
  }

  private generateReport(results: BioDataAvailability[]): BioAuditReport {
    const byRegion: Record<string, { total: number; with_bio: number; percentage: number }> = {};
    const byQuality: Record<BioDataQuality, number> = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };
    const paramCounts: Record<string, number> = {};

    for (const result of results) {
      const regionKey = this.extractRegionGroup(result.region);
      const regionStats = byRegion[regionKey] ?? { total: 0, with_bio: 0, percentage: 0 };
      regionStats.total += 1;
      if (result.has_bio_data) {
        regionStats.with_bio += 1;
      }
      byRegion[regionKey] = regionStats;

      byQuality[result.data_quality] += 1;

      for (const param of result.available_params) {
        paramCounts[param] = (paramCounts[param] ?? 0) + 1;
      }
    }

    for (const [region, stats] of Object.entries(byRegion)) {
      stats.percentage = stats.total === 0 ? 0 : Math.round((stats.with_bio / stats.total) * 1000) / 10;
      byRegion[region] = stats;
    }

    const total = results.length;
    const withBio = results.filter((r) => r.has_bio_data).length;
    const coverage = total === 0 ? 0 : Math.round((withBio / total) * 1000) / 10;

    const costEstimate = this.estimateMonthlyCost(byQuality);

    return {
      total_rectangles: total,
      bio_data_available: withBio,
      coverage_percentage: coverage,
      by_region: byRegion,
      by_quality: byQuality,
      most_common_params: paramCounts,
      cost_estimate: costEstimate,
      entries: results,
      generated_at: new Date().toISOString(),
    };
  }

  private estimateMonthlyCost(byQuality: Record<BioDataQuality, number>) {
    // Simple heuristic: assume 50 requests/month for high coverage, 25 for medium.
    const high = byQuality.high;
    const medium = byQuality.medium;
    const costPerRequestUsd = 0.04; // example value; adjust to actual plan.
    const estimatedMonthlyCost = (high * 50 + medium * 25) * costPerRequestUsd;

    return {
      high_coverage_rectangles: high,
      medium_coverage_rectangles: medium,
      estimated_monthly_cost: Math.round(estimatedMonthlyCost * 100) / 100,
    };
  }

  private extractRegionGroup(regionName: string): string {
    const value = regionName ?? '';
    if (/mediterranean/i.test(value)) return 'Mediterranean';
    if (/north sea/i.test(value)) return 'North Sea';
    if (/baltic/i.test(value)) return 'Baltic Sea';
    if (/english channel/i.test(value)) return 'English Channel';
    if (/bay of biscay/i.test(value)) return 'Bay of Biscay';
    if (/norwegian/i.test(value)) return 'Norwegian Waters';
    if (/irish/i.test(value)) return 'Irish Waters';
    if (/portuguese/i.test(value)) return 'Portuguese Waters';
    if (/scottish/i.test(value)) return 'Scottish Waters';
    return 'Atlantic';
  }

  private chunk<T>(items: T[], size: number): T[][] {
    if (size <= 0 || items.length === 0) return items.length ? [items] : [];
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const runBioAudit = async (): Promise<BioAuditReport> => {
  const auditor = new BioDataAuditor();
  const report = await auditor.auditAllRectangles();

  console.log('🧪 BIO DATA AUDIT REPORT 🧪');
  console.log('============================');
  console.log(`Total rectangles: ${report.total_rectangles}`);
  console.log(`Bio data available: ${report.bio_data_available} (${report.coverage_percentage}%)`);
  console.log(`Estimated monthly cost: $${report.cost_estimate.estimated_monthly_cost.toFixed(2)}`);
  console.log('\nBy Region:');
  for (const [region, stats] of Object.entries(report.by_region)) {
    console.log(`  ${region}: ${stats.with_bio}/${stats.total} (${stats.percentage}%)`);
  }

  return report;
};

const isExecutedDirectly = (() => {
  if (typeof process === 'undefined' || !Array.isArray(process.argv)) return false;
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();

if (isExecutedDirectly) {
  runBioAudit()
    .then(() => {
      console.log('\n✅ Bio audit finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bio audit failed:', error);
      process.exit(1);
    });
}