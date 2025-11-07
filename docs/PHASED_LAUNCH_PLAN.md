# Findr Mobile App: Phased Launch Plan

**Strategy:** Beta with Thin Wrapper → Convert to Hybrid → Public Launch

**Rationale:**
- ✅ Ship faster to beta testers (thin wrapper is already built)
- ✅ Validate app concept and features with real users
- ✅ Gather feedback before investing in hybrid conversion
- ✅ Convert to hybrid for production (better offline experience)
- ✅ Public launch with optimal architecture

**Timeline:** 2-3 weeks to beta, 4-5 weeks to public launch

---

## 📅 **Timeline Overview**

```
Week 1        Week 2        Week 3        Week 4        Week 5
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Phase 1:    │ Phase 2:    │ Phase 2:    │ Phase 3:    │ Phase 4:    │
│ Fix Blockers│ Beta Test   │ Feedback    │ Hybrid      │ Public      │
│ (5 days)    │ (TestFlight)│ & Iterate   │ Conversion  │ Launch      │
│             │             │             │ (4 days)    │ (Review)    │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
      MVP Ready      Limited Beta     Optimizing     Public Ready
```

---

## 🎯 **Phase 1: Fix Critical Blockers (Week 1 - 5 days)**

**Goal:** Make thin wrapper production-ready for beta testing

**Status:** 🔴 **BLOCKED** - Must complete before beta

### **Day 1-2: Write Tests** (Priority: CRITICAL)

**Why:** Data integrity - cannot risk losing user catches

**Tasks:**
```bash
# Create test files
mkdir -p lib/offline/__tests__
touch lib/offline/__tests__/db.test.ts
touch lib/offline/__tests__/storage.test.ts
touch lib/offline/__tests__/sync.test.ts
```

**Test Coverage Goals:**
- [ ] `lib/offline/db.ts` - 80%+ (database operations)
- [ ] `lib/offline/storage.ts` - 80%+ (CRUD operations)
- [ ] `lib/offline/sync.ts` - 80%+ (sync queue)

**Key Tests:**
```typescript
// Critical scenarios to test
describe('Offline Sync', () => {
  it('queues catch when offline', async () => { ... });
  it('syncs catch when online', async () => { ... });
  it('retries failed sync up to 5 times', async () => { ... });
  it('handles quota exceeded error', async () => { ... });
  it('preserves photo blobs during sync', async () => { ... });
});
```

**Acceptance Criteria:**
- ✅ All tests passing
- ✅ 80%+ coverage for offline modules
- ✅ No data loss scenarios uncovered

**Estimated Time:** 16 hours (2 days)

---

### **Day 3: Replace Console Logging** (Priority: CRITICAL)

**Why:** App Store may reject for excessive console output

**Tasks:**
```bash
# Find all console statements
grep -rn "console\." lib/capacitor/ lib/offline/ > console-usage.txt

# Count: 22 instances to replace
```

**Quick Replace Script:**
```bash
# 1. Add logger import to each file
# 2. Replace console.log → logger.info
# 3. Replace console.warn → logger.warn
# 4. Replace console.error → logger.error
# 5. Test that logger works in production
```

**Files to Update:**
- `lib/capacitor/camera.ts`
- `lib/capacitor/geolocation.ts`
- `lib/capacitor/notifications.ts`
- `lib/capacitor/error-tracking.ts`
- `lib/offline/db.ts`
- `lib/offline/storage.ts`
- `lib/offline/sync.ts`

**Acceptance Criteria:**
- ✅ Zero `console.log/warn/error` in production code
- ✅ ESLint rule added: `no-console: error`
- ✅ Logs still visible in development

**Estimated Time:** 3 hours

---

### **Day 4: Add Memory Cleanup** (Priority: HIGH)

**Why:** Prevent memory leaks in long-running app

**Task 1: Rate Limiter Cleanup**
```typescript
// lib/utils/rate-limiter.ts
// Add periodic cleanup every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, info] of rateLimitStore.entries()) {
    if (info.requests.length === 0 || now - info.requests[0] > windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);
```

**Task 2: IndexedDB Auto-Cleanup**
```typescript
// components/OfflineInit.tsx
useEffect(() => {
  // Run cleanup on app start
  cleanupOldData();

  // Run cleanup daily
  const interval = setInterval(() => cleanupOldData(), 24 * 60 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

**Acceptance Criteria:**
- ✅ Rate limiter cleanup runs every minute
- ✅ IndexedDB cleanup runs on start and daily
- ✅ Memory usage stable over 30 min test

**Estimated Time:** 1 hour

---

### **Day 5: Document & Test** (Priority: MEDIUM)

**Task 1: Environment Variables**
```bash
# Update .env.example
cat >> .env.example << 'EOF'

# === MOBILE APP (Optional) ===
# Error tracking (optional - gracefully degrades)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Analytics (optional - gracefully degrades)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Note: All mobile features work without these
EOF
```

**Task 2: Integration Testing**
```bash
# Run full test suite
npm run typecheck
npm run lint:ci
npm test

# Manual testing checklist
- [ ] App launches on iOS Simulator
- [ ] App launches on Android Emulator
- [ ] Location permission flow works
- [ ] Camera permission flow works
- [ ] Offline prediction caching works
- [ ] Offline catch logging works
- [ ] Sync queue works (offline → online)
- [ ] No crashes during 10 min usage
```

**Acceptance Criteria:**
- ✅ All automated tests pass
- ✅ Manual testing checklist complete
- ✅ Environment variables documented

**Estimated Time:** 4 hours

---

### **Phase 1 Deliverables:**

- ✅ Test coverage: 80%+ for offline modules
- ✅ Zero console statements in production
- ✅ Memory leaks fixed (rate limiter, IndexedDB)
- ✅ Environment variables documented
- ✅ All tests passing
- ✅ Manual testing complete

**Phase 1 Complete:** Ready for beta testing

---

## 🧪 **Phase 2: Beta Testing (Week 2-3 - 10 days)**

**Goal:** Validate app with real users in thin wrapper mode

**Audience:** 5-10 internal testers + trusted users

### **Day 6: Deploy to TestFlight (iOS)**

**Tasks:**
```bash
# 1. Build iOS app
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  archive

# 2. Export for TestFlight
# (Via Xcode Organizer)

# 3. Upload to App Store Connect
# (Automatic after export)
```

**TestFlight Setup:**
- [ ] Add internal testers (up to 100)
- [ ] Write beta testing instructions
- [ ] Set up feedback email: beta@fishfindr.eu

**Beta Instructions:**
```markdown
# Findr Beta Testing Instructions

**Thank you for testing Findr!**

**What to Test:**
1. Location detection (grant permission)
2. View fishing predictions
3. Log a catch with photo
4. Test offline mode:
   - View predictions
   - Enable Airplane Mode
   - Log a catch offline
   - Disable Airplane Mode
   - Verify catch synced

**Known Limitations (Beta):**
- App needs internet on first launch
- Offline mode only works after initial load

**Report Issues:**
- Email: beta@fishfindr.eu
- Include: Device model, iOS version, screenshots
```

**Acceptance Criteria:**
- ✅ Build uploaded to TestFlight
- ✅ 5-10 testers invited
- ✅ Testing instructions sent

**Estimated Time:** 2 hours

---

### **Day 7: Deploy to Play Console (Android)**

**Tasks:**
```bash
# 1. Build Android AAB
cd android
./gradlew bundleRelease

# 2. Upload to Play Console
# Internal Testing track
```

**Play Console Setup:**
- [ ] Create internal testing release
- [ ] Add testers via email list
- [ ] Share opt-in URL

**Acceptance Criteria:**
- ✅ AAB uploaded to Internal Testing
- ✅ 5-10 testers added
- ✅ Opt-in URL shared

**Estimated Time:** 2 hours

---

### **Day 8-17: Collect Feedback (10 days)**

**Week 1 (Day 8-12):**
- Daily check-ins with testers
- Monitor crash reports (Sentry)
- Track key metrics:
  - Crash-free rate: Target 99%+
  - Feature usage: Which features used most?
  - Bug reports: Prioritize critical bugs

**Week 2 (Day 13-17):**
- Iterate on feedback
- Fix critical bugs
- Update TestFlight/Internal Testing builds
- Prepare for hybrid conversion

**Feedback Collection:**
```markdown
# Beta Tester Survey (After 1 Week)

1. Did the app work as expected? (1-5)
2. Did you test offline mode? Did it work? (Y/N)
3. What's the ONE thing that frustrated you most?
4. What's the ONE thing you loved most?
5. Would you pay for this app? (Y/N)
6. Would you recommend to a friend? (1-10)
```

**Success Criteria:**
- ✅ 99%+ crash-free rate
- ✅ Average rating: 4.0+ / 5.0
- ✅ NPS: 7.0+ / 10
- ✅ All critical bugs fixed

---

### **Phase 2 Deliverables:**

- ✅ TestFlight beta live (iOS)
- ✅ Internal Testing live (Android)
- ✅ 10+ days of real user feedback
- ✅ Critical bugs identified and fixed
- ✅ Feature priorities validated
- ✅ Confidence in app concept

**Phase 2 Complete:** Validated product, ready to optimize

---

## 🔄 **Phase 3: Hybrid Conversion (Week 4 - 4 days)**

**Goal:** Convert to true hybrid before public launch

**Why:** Better offline experience for public users

### **Day 18-19: Follow Hybrid Checklist**

**Reference:** `HYBRID_APP_CONVERSION_CHECKLIST.md`

**Tasks:**
- [ ] Update `next.config.mjs` → `output: 'export'`
- [ ] Update `capacitor.config.ts` → `webDir: 'out'`
- [ ] Update API calls to use absolute URLs
- [ ] Replace `next/image` with `<img>`
- [ ] Test static export: `npm run build`

**Acceptance Criteria:**
- ✅ Static export builds successfully
- ✅ `out/` directory contains all pages
- ✅ No API routes in bundle (expected)

**Estimated Time:** 8 hours (2 days)

---

### **Day 20: Test Hybrid Build**

**iOS Testing:**
```bash
npm run build:mobile  # New script: build + sync
npx cap open ios

# Test in Simulator:
# 1. Enable Airplane Mode FIRST
# 2. Launch app
# 3. ✅ Should open instantly (no internet)
# 4. Navigate around
# 5. ✅ All pages work
# 6. Disable Airplane Mode
# 7. Load predictions (API call)
# 8. ✅ Data loads correctly
```

**Android Testing:**
```bash
npm run build:mobile
npx cap open android

# Same tests as iOS
```

**Offline Scenario Tests:**
- [ ] Cold start offline (app never opened before)
- [ ] Airplane Mode mid-session
- [ ] Poor connection (toggle WiFi repeatedly)
- [ ] Background → Foreground offline
- [ ] App restart offline

**Acceptance Criteria:**
- ✅ App works 100% offline (UI + data)
- ✅ No white screens
- ✅ No console errors
- ✅ Memory usage acceptable

**Estimated Time:** 4 hours

---

### **Day 21: Deploy Hybrid to Beta**

**Tasks:**
- [ ] Build iOS hybrid version
- [ ] Upload to TestFlight (new build)
- [ ] Build Android hybrid version
- [ ] Upload to Internal Testing (new build)

**Beta Testers:**
- Send update: "We've improved offline mode!"
- Ask to test specifically:
  - Start app in Airplane Mode
  - Compare launch speed to previous version

**Success Criteria:**
- ✅ Testers confirm faster launch
- ✅ Testers confirm works without internet
- ✅ No new bugs introduced

**Estimated Time:** 4 hours

---

### **Phase 3 Deliverables:**

- ✅ Hybrid conversion complete
- ✅ App works 100% offline
- ✅ Tested on iOS and Android
- ✅ Beta testers validate improvement
- ✅ No new bugs introduced

**Phase 3 Complete:** Ready for public launch

---

## 🚀 **Phase 4: Public Launch (Week 5 - 7 days)**

**Goal:** Submit to App Store and Play Store for public release

### **Day 22-23: Prepare Submissions**

**Reference:**
- `APP_STORE_CONNECT_SUBMISSION_TEMPLATE.md`
- `GOOGLE_PLAY_CONSOLE_SUBMISSION_TEMPLATE.md`

**Tasks:**

**1. Capture Screenshots** (6 hours)
```bash
# iOS - 7 screenshots × 3 sizes = 21 total
# Android - 5 screenshots + feature graphic

# Follow: FINDR_SCREENSHOT_SPECIFICATIONS.md
```

**2. Fill Store Listings** (4 hours)
- Copy descriptions from `FINDR_APP_STORE_METADATA.md`
- Upload screenshots
- Set categories (Sports / Weather)
- Complete privacy questionnaires

**3. Generate Builds** (2 hours)
```bash
# iOS: Archive and upload (follow BUILD_GENERATION_GUIDE.md)
# Android: bundleRelease and upload
```

**Acceptance Criteria:**
- ✅ All 21 iOS screenshots captured
- ✅ All 5 Android screenshots + feature graphic
- ✅ Store listings 100% complete
- ✅ Builds uploaded and processing

**Estimated Time:** 12 hours (1.5 days)

---

### **Day 24: Submit for Review**

**iOS Submission:**
- [ ] Select build in App Store Connect
- [ ] Complete App Review Information (demo account)
- [ ] Submit for review
- [ ] Status: "Waiting for Review"

**Android Submission:**
- [ ] Create production release
- [ ] Upload AAB
- [ ] Start rollout to 100%
- [ ] Status: "Under review"

**Acceptance Criteria:**
- ✅ iOS submitted to App Store
- ✅ Android submitted to Play Store

**Estimated Time:** 2 hours

---

### **Day 25-31: Review Period (7 days avg)**

**Apple App Store:**
- Review time: 1-3 days (average 24-48 hours)
- Respond to any questions within 24 hours

**Google Play Store:**
- Review time: 1-7 days (average 2-3 days)
- Check Pre-launch report

**Possible Outcomes:**

**If Approved:**
- ✅ App goes live automatically (or when you release)
- Monitor downloads, crashes, reviews

**If Rejected:**
- Read rejection reason carefully
- Fix issues
- Re-submit (usually faster second time)

**Common Rejection Reasons:**
- Permission descriptions unclear
- Privacy policy doesn't match app
- Demo account doesn't work
- App crashes on launch

---

### **Phase 4 Deliverables:**

- ✅ App live on App Store
- ✅ App live on Play Store
- ✅ Public users can download
- ✅ Monitoring in place (Sentry, Analytics)

**Phase 4 Complete:** PUBLIC LAUNCH! 🎉

---

## 📊 **Success Metrics**

### **Beta (Phase 2)**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Crash-free rate | 99%+ | Sentry dashboard |
| User satisfaction | 4.0+ / 5.0 | Beta survey |
| Feature usage | 80%+ use predictions | Analytics |
| Critical bugs | 0 | Bug tracker |
| Offline functionality | Works for 100% | Manual testing |

### **Public Launch (Phase 4)**

| Metric | Week 1 Target | Month 1 Target |
|--------|--------------|----------------|
| Downloads | 100-500 | 1,000-5,000 |
| Crash-free rate | 99%+ | 99%+ |
| App Store rating | 4.0+ stars | 4.5+ stars |
| Day 1 retention | 40%+ | 50%+ |
| Day 7 retention | 20%+ | 30%+ |
| Day 30 retention | 10%+ | 15%+ |

---

## 🎯 **Decision Points**

### **After Phase 1 (Before Beta):**

**Question:** Are critical blockers fixed?
- ✅ Tests passing? → Proceed to Phase 2
- ❌ Tests failing? → Fix and re-test

---

### **After Phase 2 (Before Hybrid):**

**Question:** Is beta feedback positive?
- ✅ Good feedback + few bugs → Proceed to Phase 3 (hybrid)
- ⚠️ Major bugs found → Fix in Phase 2.5, delay hybrid
- ❌ Concept doesn't work → Pivot or cancel

**Red Flags to Watch:**
- < 90% crash-free rate (stability issues)
- < 3.0 / 5.0 satisfaction (UX issues)
- Low feature usage (product-market fit issues)
- "Doesn't work offline" complaints (validate hybrid decision)

---

### **After Phase 3 (Before Public):**

**Question:** Is hybrid version stable?
- ✅ Beta testers love it → Proceed to Phase 4 (public)
- ⚠️ Some issues → Fix and re-test
- ❌ Major regression → Revert to thin wrapper, delay hybrid

---

## ⚠️ **Risk Mitigation**

### **Risk 1: Phase 1 Takes Too Long**

**If blockers aren't fixed in 5 days:**
- **Option A:** Delay beta (better to ship stable than fast)
- **Option B:** Skip non-critical fixes (e.g., memory cleanup) for beta
- **Recommendation:** Delay beta - data integrity is critical

---

### **Risk 2: Beta Feedback is Negative**

**If satisfaction < 3.0 / 5.0:**
- **Investigate:** Is it concept, UX, bugs, or performance?
- **Decision:**
  - Bugs → Fix and re-test
  - UX → Iterate on design
  - Concept → Pivot or cancel

---

### **Risk 3: Hybrid Conversion Breaks Things**

**If hybrid causes new bugs:**
- **Rollback:** Revert to thin wrapper (30 min rollback)
- **Submit thin wrapper:** Better to launch working app than wait
- **Hybrid Later:** Convert post-launch as v1.1.0

---

### **Risk 4: App Store Rejects**

**If rejected:**
- **Common:** Permission strings, privacy policy, demo account
- **Timeline:** Fix → Re-submit → Wait 1-3 days
- **Mitigation:** Follow templates exactly (already done)

---

## 📅 **Gantt Chart**

```
Phase 1: Fix Blockers
Day 1-2  [████████████████] Tests
Day 3    [████████] Console logging
Day 4    [████] Memory cleanup
Day 5    [████] Documentation

Phase 2: Beta Testing
Day 6    [████] Deploy TestFlight
Day 7    [████] Deploy Play Console
Day 8-17 [████████████████████] Feedback (10 days)

Phase 3: Hybrid Conversion
Day 18-19 [████████████████] Convert to hybrid
Day 20    [████████] Test hybrid
Day 21    [████] Deploy to beta

Phase 4: Public Launch
Day 22-23 [████████████████] Prepare submissions
Day 24    [████] Submit for review
Day 25-31 [████████████████████████████] Review period (7 days avg)

Total: 31 days (4.5 weeks) from start to public launch
```

---

## 🎯 **Summary: What You're Doing**

### **Short-Term (Week 1): Fix & Beta**
- Fix 2 critical blockers (tests, logging)
- Ship thin wrapper to beta testers
- Validate concept with real users

### **Mid-Term (Week 2-3): Iterate**
- Collect feedback
- Fix bugs
- Prove product-market fit

### **Before Public (Week 4): Optimize**
- Convert to hybrid (better offline)
- Test with beta testers
- Get validation

### **Public Launch (Week 5): Ship**
- Submit to stores
- Wait for approval
- Launch to world

---

## ✅ **Next Steps**

**Right Now:**
1. Read this plan
2. Confirm timeline is acceptable
3. Make Phase 1 your immediate priority

**This Week:**
1. Day 1-2: Write tests for offline modules
2. Day 3: Replace console statements
3. Day 4: Add memory cleanup
4. Day 5: Final testing and documentation

**Want me to help you start Phase 1 right now?** I can:
1. Write the test files for offline modules
2. Create the logger replacement script
3. Add the memory cleanup code

Let me know and I'll get started!

---

**Prepared By:** Claude Code
**Date:** January 6, 2025
**Status:** Ready to Execute
**First Task:** Write tests for `lib/offline/*`
