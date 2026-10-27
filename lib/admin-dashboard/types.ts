/**
 * Shapes shared by the /admin/dashboard panels and GET /api/admin/metrics-summary.
 * Kept the same as Rise Daisy's lib/admin-dashboard/types.ts where they overlap.
 *
 * Every panel is a Section: data, an honest "not configured" naming the env
 * vars that are missing, or the error the source gave. A panel never shows
 * zeros for a source it could not read.
 */

import type { StoreDownloadsSummary } from '@/lib/store-stats/summary';

export type Section<T> =
  | { state: 'ok'; data: T }
  | { state: 'not_configured'; missing: string[]; hint?: string }
  | { state: 'error'; message: string };

/** A count over the last 7 days against the 7 before, with the daily series. */
export interface WeekMetric {
  value: number;
  previous: number;
  /** % change on the previous week; null when the previous week was 0. */
  delta: number | null;
  /** Oldest first, one value per day. */
  daily: number[];
}

/**
 * In-app revenue. Go Daisy's RevenueCat app shares a project with Grow Daisy,
 * so these are charts filtered to Go Daisy's app, not the project overview.
 * Null when RevenueCat returned no value for that metric.
 */
export interface RevenueSummary {
  source: 'revenuecat';
  currency: string;
  mrr: number | null;
  revenue28d: number | null;
  activeSubscriptions: number | null;
  activeTrials: number | null;
  newCustomers28d: number | null;
}

export interface Ga4Summary {
  /** Last 14 complete days, oldest first (YYYY-MM-DD). */
  days: string[];
  activeUsers: WeekMetric;
  newUsers: WeekMetric;
  pageViews: WeekMetric;
  /** Mean of daily engagement rate, %, last 7 days vs the 7 before. */
  engagementRate: { value: number; previous: number };
  topPages: { path: string; views: number }[];
  channels: { channel: string; users: number; sessions: number; engagementRate: number }[];
  devices: { device: string; users: number; percent: number }[];
}

export interface SentrySummary {
  errors: WeekMetric;
  /** % crash-free sessions over 14 days; null when Sentry has no session data. */
  crashFreeRate: number | null;
  topIssues: { id: string; title: string; level: string; count: number; lastSeen: string; permalink: string }[];
}

/**
 * GET /api/admin/metrics-summary. App-agnostic on purpose: the multi-app
 * dashboard reads the same shape from every app in the family.
 */
export interface MetricsSummary {
  app: string;
  generatedAt: string;
  storeDownloads: Section<StoreDownloadsSummary>;
  revenue: Section<RevenueSummary>;
  analytics: Section<Ga4Summary>;
  platformHealth: Section<SentrySummary>;
}

/** 14 daily values → this week vs last week. */
export function weekMetric(daily: number[]): WeekMetric {
  const last14 = daily.slice(-14);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const value = sum(last14.slice(-7));
  const previous = last14.length > 7 ? sum(last14.slice(0, last14.length - 7)) : 0;
  return { value, previous, delta: pctDelta(value, previous), daily: last14 };
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Keeps a source's error text short and free of anything that looks like a credential. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/(Bearer|sk_live_|sk_test_|rk_live_)\S*/g, '[redacted]').slice(0, 240);
}
