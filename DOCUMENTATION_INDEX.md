# 📚 Fishfindr Documentation Index

**Last Updated:** October 18, 2025

Quick navigation to all technical documentation for the Fishfindr application.

---

## 🚨 Emergency Response

**If RPC/predictions are broken, start here:**

1. **[RPC Quick Reference](RPC_QUICK_REFERENCE.md)** ⚡ - 30-second diagnosis, print and keep handy
2. **[RPC Troubleshooting Guide](RPC_TROUBLESHOOTING_GUIDE.md)** 🔧 - Complete diagnostic procedures

**Recovery Time:** 5-30 minutes with these guides

---

## 📖 Core Documentation

### Recent Deployments
- **[Unified RPC Deployment](DEPLOYMENT_20251018_UNIFIED_RPC.md)** (Oct 18, 2025)
  - Critical fix: Always use enhanced RPC
  - Fixes predictions for 90%+ of users
  - Impact: HIGH, Risk: LOW

- **[Biogeographic Scoring Deployment](DEPLOYMENT_20251018_BIOGEOGRAPHIC_SCORING.md)** (Oct 18, 2025)
  - Temperature-based species scoring
  - Biogeographic filtering implementation
  - 30-day data fallback window

### Troubleshooting
- **[RPC Troubleshooting Guide](RPC_TROUBLESHOOTING_GUIDE.md)** - Complete diagnostic guide
  - Database schema reference
  - Common failure modes
  - Recovery procedures
  - Testing procedures

- **[RPC Quick Reference](RPC_QUICK_REFERENCE.md)** - Quick reference card
  - Function signatures
  - Key table columns
  - Common errors & fixes
  - Test commands

### Feature Documentation
- **[Copernicus Integration](API_COMPREHENSIVE_COPERNICUS_COMPLETE.md)** - Environmental data
- **[Biogeographic Integration](COPERNICUS_COMPLETE_BIOGEOCHEMICAL_COVERAGE.md)** - Bio-bands
- **[Confidence Scoring Algorithm](CONFIDENCE_SCORING_ALGORITHM.md)** - How scores work
- **[Bio Bands Integration](BIO_BANDS_INTEGRATION_STRATEGY.md)** - Biogeochemical preferences

---

## 🗂️ By Topic

### Database & Schema
- [RPC Troubleshooting Guide](RPC_TROUBLESHOOTING_GUIDE.md) - Complete schema reference
  - `species` table (temp_opt_c, biogeographic_regions, weights)
  - `findr_conditions_snapshots` (environmental data)
  - `species_bio_bands` (preferences)
  - `bio_bands_thresholds` (band definitions)
  - `species_substrates` (substrate preferences)

### API & RPC Functions
- [Unified RPC Deployment](DEPLOYMENT_20251018_UNIFIED_RPC.md) - Current production setup
- [RPC Quick Reference](RPC_QUICK_REFERENCE.md) - Function signatures
- [RPC Troubleshooting](RPC_TROUBLESHOOTING_GUIDE.md) - Parameter details & scoring

### Species Data
- [Bio Bands Verification](BIO_BANDS_VERIFICATION_SUMMARY.md) - Data completeness
- [Temperature Weights](ANSWER_WHY_ONLY_20_SPECIES.md) - Species categorization
- [Biogeographic Regions](RPC_TROUBLESHOOTING_GUIDE.md#5-mediterranean-species-in-atlantic) - Regional data

### Testing
- [RPC Troubleshooting Guide](RPC_TROUBLESHOOTING_GUIDE.md#-testing-procedures) - Test procedures
- Test Scripts:
  - `scripts/test-enhanced-with-without-gps.ts` - GPS/no-GPS testing
  - `scripts/test-5-regions-service.ts` - Regional filtering
  - `scripts/check-species-regions.ts` - Species data validation

### Deployment & Operations
- [Unified RPC Deployment](DEPLOYMENT_20251018_UNIFIED_RPC.md) - Latest deployment
- [Biogeographic Deployment](DEPLOYMENT_20251018_BIOGEOGRAPHIC_SCORING.md) - Previous deployment
- [Copernicus Deployment Guide](COPERNICUS_DEPLOYMENT_GUIDE.md) - Data ingestion

---

## 🔄 Migration History

**Critical migrations (in order):**

| Date | Migration | Purpose | Status |
|------|-----------|---------|--------|
| Oct 18 | `20251018001_add_biogeographic_filtering.sql` | Add regions column | ✅ |
| Oct 18 | `20251018002_populate_all_species_regions.sql` | Populate 79 species | ✅ |
| Oct 18 | `20251018003_boost_temp_weight_migratory.sql` | Set temp weights | ✅ |
| Oct 18 | `20251018005_extend_data_fallback_period.sql` | 7→30 day window | ✅ |
| Oct 18 | `20251018006_fix_region_matching.sql` | Normalize regions | ✅ |
| Oct 18 | `20251018007_use_actual_temp_fields.sql` | **FAILED** (wrong parsing) | ❌ |
| Oct 18 | `20251018008_fix_temp_array_parsing.sql` | Fix temp_opt_c array | ✅ |
| Oct 18 | `20251018009_update_enhanced_with_biogeographic_temp_scoring.sql` | **PRODUCTION RPC** | ✅ |
| Oct 18 | `20251018010_fix_mediterranean_species_regions.sql` | Fix Bogue regions | ✅ |

**See:** [RPC Troubleshooting Guide - File Locations](RPC_TROUBLESHOOTING_GUIDE.md#-file-locations)

---

## 📱 Quick Links

### For Debugging
1. Check RPC working: `npx tsx scripts/test-enhanced-with-without-gps.ts`
2. Check regions: `npx tsx scripts/test-5-regions-service.ts`
3. Check species data: `npx tsx scripts/check-species-regions.ts`
4. Re-deploy migrations: `npx supabase db push`

### Production URLs
- **Live Site:** https://fishfindr.eu
- **API Health:** https://fishfindr.eu/api/health
- **Predictions API:** https://fishfindr.eu/api/findr/predictions

### Code Locations
- **API Endpoint:** `pages/api/findr/predictions.ts` (line 590)
- **RPC Function:** `supabase/migrations/20251018009_update_enhanced_with_biogeographic_temp_scoring.sql`
- **Species Data:** `species` table in Supabase
- **Environmental Data:** `findr_conditions_snapshots` table

---

## 🎯 Common Tasks

### "RPC is broken, predictions not working"
1. Read: [RPC Quick Reference](RPC_QUICK_REFERENCE.md)
2. Run: `npx tsx scripts/test-enhanced-with-without-gps.ts`
3. If failed: `npx supabase db push`
4. If still failed: [RPC Troubleshooting Guide](RPC_TROUBLESHOOTING_GUIDE.md)

### "Mediterranean fish appearing in Atlantic"
1. Run: `npx tsx scripts/test-5-regions-service.ts`
2. Check: [Mediterranean Species Fix](RPC_TROUBLESHOOTING_GUIDE.md#5-mediterranean-species-in-atlantic)
3. Fix: Update `biogeographic_regions` in `species` table

### "All species have same confidence score"
1. Check: [Temperature Scoring](RPC_TROUBLESHOOTING_GUIDE.md#4-all-species-have-same-score)
2. Verify: `temp_opt_c` is array `{min, max}`
3. Verify: `temp_weight` is populated
4. Check: RPC uses `temp_opt_c[1]` and `temp_opt_c[2]`

### "No predictions returned"
1. Check: [Empty Predictions](RPC_TROUBLESHOOTING_GUIDE.md#3-no-predictions-returned-empty-array)
2. Query: Recent data in `findr_conditions_snapshots`
3. Check: Biogeographic filtering not too aggressive
4. Extend: Data window if needed (30→60 days)

---

## 📊 System Health Checks

**Run these SQL queries to verify system health:**

```sql
-- 1. RPC functions exist
SELECT proname, pronargs FROM pg_proc 
WHERE proname LIKE '%environmental_predictions%';
-- Expect: get_environmental_predictions_enhanced (8 params)

-- 2. Recent environmental data
SELECT COUNT(*), MAX(captured_at) 
FROM findr_conditions_snapshots 
WHERE captured_at >= CURRENT_DATE - INTERVAL '7 days';
-- Expect: > 1000 records, latest within 24 hours

-- 3. Species have regions
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE biogeographic_regions IS NOT NULL) as with_regions
FROM species;
-- Expect: with_regions close to total

-- 4. Mediterranean species correct
SELECT name_en, biogeographic_regions 
FROM species WHERE name_en = 'Bogue';
-- Expect: {Mediterranean, IBI} only
```

**See:** [RPC Troubleshooting Guide - Health Checks](RPC_TROUBLESHOOTING_GUIDE.md#-health-check-queries)

---

## 🔐 Access & Credentials

**Environment Variables:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` - Public URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public access

**Files:**
- Production: `.env.local` (gitignored)
- Development: `.env.local`

---

## 📞 Support & Escalation

### Recovery Time Objectives
- **RPC function missing:** 5 minutes
- **Parameter mismatch:** 10 minutes
- **No data:** 30 minutes
- **Full database restore:** 2 hours

### When to Escalate
- RPC completely broken (no predictions)
- Data corruption detected
- Migration rollback needed
- Production downtime > 5 minutes

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Oct 18, 2025 | Unified RPC, Mediterranean fix, troubleshooting guides |
| 1.5 | Oct 17, 2025 | Enhanced RPC (lunar, weather, substrate, depth) |
| 1.0 | Oct 16, 2025 | Basic RPC with biogeochemical scoring |

---

## ✅ Pre-Deployment Checklist

Before any RPC/schema changes:

- [ ] Read [RPC Troubleshooting Guide](RPC_TROUBLESHOOTING_GUIDE.md)
- [ ] Test locally: `npm run dev`
- [ ] Run test suite: `npx tsx scripts/test-enhanced-with-without-gps.ts`
- [ ] Check TypeScript: `npm run type-check`
- [ ] Review migration order
- [ ] Create rollback plan
- [ ] Document in deployment guide
- [ ] Monitor post-deployment (24 hours)

---

**📚 Total Documentation Files:** 20+  
**🔧 Test Scripts:** 10+  
**📊 Database Tables:** 5 core tables  
**🎯 Coverage:** Development, Deployment, Operations, Emergency Response

---

**Last Updated:** October 18, 2025  
**Status:** ✅ Complete  
**Maintainer:** Development Team
