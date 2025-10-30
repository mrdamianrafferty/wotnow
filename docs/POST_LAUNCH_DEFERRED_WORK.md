# Post-Launch Deferred Work

**Date Created**: 2025-10-30
**Purpose**: Track P1/P2 work items deferred until after launch
**Status**: Active tracking document

---

## Overview

This document tracks technical debt and optimization work that has been intentionally deferred to prioritize shipping the initial product. Items are categorized by priority and estimated complexity.

**Priority Levels**:
- **P1**: Important optimization with measurable user impact, should complete within 1-2 weeks post-launch
- **P2**: Nice-to-have optimization or refactoring, can wait for next maintenance window

---

## P1 Items (High Priority)

### 1. Species Schema Migration - Phase 4B: RPC Function Optimization

**Category**: Performance Optimization
**Current Status**: API-layer workaround implemented (Phase 4A complete)
**Impact**: ~50ms API overhead per prediction request (eliminated after cache)
**Complexity**: Medium (requires modifying 700-line RPC function)

**Context**:
- Phase 4A successfully implemented API-layer enrichment for `slug` and `aliases` fields
- Current approach fetches species data in parallel queries and merges in TypeScript
- Phase 4B would add these fields directly to `get_global_fishing_predictions()` RPC function
- This eliminates the API-layer overhead entirely

**Implementation Options**:
- **Option A**: Automated migration (programmatically modify function, faster but medium risk)
- **Option B**: Manual database update (slower but safest, full control)

**Detailed Documentation**:
- See `SPECIES_SCHEMA_MIGRATION_PHASE4_PROPOSAL.md` for complete implementation guide
- See `SPECIES_SCHEMA_MIGRATION_PHASE4_COMPLETE.md` for Phase 4A details

**Estimated Time**: 1-2 hours
**Risk Level**: 🟡 Medium (complex function, but changes are minimal and well-documented)

**Acceptance Criteria**:
- ✅ RPC function returns `slug` and `aliases` fields natively
- ✅ API-layer enrichment code can be removed (lines 494-502 in `pages/api/findr/predictions.ts`)
- ✅ Performance improvement measurable (~50ms reduction in API response time)
- ✅ All existing tests pass
- ✅ Predictions API response identical to Phase 4A implementation

**Files to Modify**:
- `supabase/migrations/20251030000005_add_slug_aliases_to_predictions_rpc.sql` - Complete this migration
- `pages/api/findr/predictions.ts` - Remove API-layer enrichment after RPC update

---

## P2 Items (Lower Priority)

_No items currently tracked_

---

## Completed Deferred Items

_This section will be populated as deferred work is completed post-launch_

---

## How to Use This Document

**Adding New Items**:
1. Add to appropriate priority section (P1 or P2)
2. Include: Category, Current Status, Impact, Complexity, Estimated Time, Risk Level
3. Document acceptance criteria clearly
4. Link to related documentation

**Completing Items**:
1. Move completed item to "Completed Deferred Items" section
2. Add completion date and actual time spent
3. Note any deviations from original plan
4. Update related documentation with actual implementation details

**Reviewing Priorities**:
- Review this document weekly post-launch
- Re-prioritize based on user feedback and metrics
- Consider promoting P2 items to P1 if user impact becomes clear

---

## Related Documentation

- `SPECIES_SCHEMA_MIGRATION_PLAN.md` - Master plan for schema migration (all 7 phases)
- `SPECIES_SCHEMA_MIGRATION_PHASE4_PROPOSAL.md` - Detailed options for Phase 4B
- `SPECIES_SCHEMA_MIGRATION_PHASE4_COMPLETE.md` - Phase 4A implementation details

---

**Last Updated**: 2025-10-30
**Next Review**: Post-launch week 1
