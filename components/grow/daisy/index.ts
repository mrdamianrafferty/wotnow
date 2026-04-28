/**
 * Grow Daisy — Daisy Design System components
 *
 * The "Daisy island" — components and tokens ported from the Rise Daisy
 * design system and re-keyed to the Cool Shadow palette for Grow Daisy.
 *
 * CSS tokens are defined in styles/index.css under the :root block labelled
 * "GROW DAISY · DAISY DESIGN SYSTEM TOKENS" and are prefixed --gd-*.
 *
 * Import order doesn't matter; all components are tree-shaken.
 *
 * Usage:
 *   import { ConfidenceRing, SourceBadge, GrowthStageBadge, EditorialBriefing } from '@/components/grow/daisy';
 */

export { ConfidenceRing } from './ConfidenceRing';
export type { ConfidenceBand } from './ConfidenceRing';

export { SourceBadge, GrowthStageBadge, ConfidencePill } from './HonestyBadges';
export type { DataSource, GrowthStage } from './HonestyBadges';

export { EditorialBriefing, EditorialVerdictBar } from './EditorialBriefing';
