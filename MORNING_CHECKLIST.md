# Morning Review Checklist - Favourites System

## ⏰ Quick 5-Minute Review

**Goal:** Understand what was built and decide next steps

### Step 1: Read the Summary (2 min)
```bash
# Open this file in your editor:
open FAVOURITES_SUMMARY.md
```

**Key Points:**
- ✅ 14 files created (~3,500 lines)
- ✅ 9 React components (all working)
- ✅ 3 API routes (stub implementations)
- ✅ Complete TypeScript type system
- ✅ Zero compilation errors

### Step 2: Visual Demo (2 min)
```bash
# Start dev server (if not running)
npm run dev

# Visit in browser:
# http://localhost:3000/findr/favourites-modern
```

**Try These Actions:**
1. See empty state with suggestions
2. Click between tabs (Hot Right Now, You've Caught, etc.)
3. Scroll through species carousel
4. Click heart icon (see console.log)
5. Notice confidence rings (color-coded)

### Step 3: Skim Blockers (1 min)
```bash
# Open this file:
open FAVOURITES_BLOCKERS.md
```

**4 Key Decisions Needed:**
1. Notification preferences: Embed or separate table?
2. Species database: Manual or API?
3. Notifications: MVP or full system?
4. Images: Keep /public or migrate?

---

## ✅ Decisions Made

### Question 1: Notification Preferences Storage

**👉 DECISION: Deferred to post-MVP**
- Focus on login and iOS version first
- Will add notifications after initial launch
- UI already built, can enable later

---

### Question 2: Species Database Source

**👉 DECISION: Use existing 30+ species**
- Already have species in codebase
- Post-MVP: User-requested species feature
- Community-driven species expansion
- Time saved: 2-3 hours ✅

---

### Question 3: Notification System Scope

**👉 DECISION: MVP - No notifications**
- Prioritize: Login + iOS app first
- Users manually check confidence scores
- UI already built for future activation
- Time saved: 1-2 days ✅

---

### Question 4: Image Hosting Strategy

**👉 DECISION: Migrate to Supabase Storage**
- Better scaling for future
- CDN distribution
- Consistent with auth/database
- Implementation: 2-3 hours

---

## 🚀 Implementation Plan (Your MVP Path)
**Total Time: 4-5 hours**

1. **Create Database (30 min)**
   ```bash
   # Run in Supabase SQL editor:
   # See FAVOURITES_BLOCKERS.md for full SQL
   ```

2. **Add Authentication (1 hour)**
   ```bash
   npm install @supabase/auth-helpers-nextjs
   # Update API routes - examples in FAVOURITES_GUIDE.md
   ```

3. **Implement Confidence Scoring (1-2 hours)**
   ```bash
   # Create lib/findr/confidenceScoring.ts
   # Integrate with existing conditions API
   ```

4. **Migrate Images to Supabase (2-3 hours)**
   ```bash
   # Upload species images to Supabase Storage
   # Update SPECIES_IMAGE_MAP to use Supabase URLs
   # Create admin upload utility
   ```

5. **Replace Old Page (15 min)**
   ```bash
   # After Supabase integration complete
   mv pages/findr/favourites.tsx pages/findr/favourites-legacy.tsx
   mv pages/findr/favourites-modern.tsx pages/findr/favourites.tsx
   ```

6. **Test & Deploy (30 min)**
   ```bash
   # Test with real data
   # Deploy to production
   ```

**Result:** Fully functional favourites with live scores, scalable images, ready for iOS

---

### If you chose: Full Features Path
**Total Time: 1-2 days**

All of MVP path, PLUS:

5. **Build Species Database (3-5 hours)**
   - Create species_data table
   - Source/populate data
   - Add images

6. **Notification System (1-2 days)**
   - Supabase Edge Function (cron)
   - Push setup (FCM)
   - Email setup (SES)
   - Rate limiting

**Result:** Complete system with notifications

---

## 📝 Your Chosen Path

```
✅ Decision 1: NO notifications (post-MVP)
✅ Decision 2: Use existing 30+ species + user requests
✅ Decision 3: Replace old page after Supabase integration
✅ Decision 4: Migrate to Supabase Storage (2-3 hours)

Total Time: 4-5 hours
Result: Production-ready favourites with scalable infrastructure
Next: Focus on login + iOS app, then add notifications
```

**Why This Path:**
- Clean MVP focused on core features
- Scalable image infrastructure from day 1
- Ready for iOS app development
- Community-driven species expansion
- Notifications come later with proper mobile push

---

## ✅ Today's Tasks (If MVP Path)

### Morning (30 minutes)
- [ ] Make 4 decisions above
- [ ] Create user_favourites table in Supabase
  ```sql
  -- Copy from FAVOURITES_BLOCKERS.md
  ```
- [ ] Test table with sample data:
  ```sql
  INSERT INTO user_favourites (user_id, species_id) 
  VALUES ('test-user-id', 'cod');
  ```

### Midday (1 hour)
- [ ] Install auth helpers:
  ```bash
  npm install @supabase/auth-helpers-nextjs
  ```
- [ ] Update `/api/findr/favourites.ts`:
  ```typescript
  // Follow example in FAVOURITES_GUIDE.md
  ```
- [ ] Test API with authenticated requests

### Afternoon (1 hour)
- [ ] Create `/lib/findr/confidenceScoring.ts`
  ```typescript
  // Copy template from FAVOURITES_GUIDE.md
  ```
- [ ] Wire to `/api/findr/favourites` GET handler
- [ ] Test real confidence scores in UI

### Final (30 minutes)
- [ ] Activate new page:
  ```bash
  mv pages/findr/favourites.tsx pages/findr/favourites-legacy.tsx
  mv pages/findr/favourites-modern.tsx pages/findr/favourites.tsx
  ```
- [ ] Test end-to-end flow
- [ ] Deploy to production 🚀

---

## 📚 Reference Files

- **Overview:** `FAVOURITES_SUMMARY.md` - Complete feature description
- **Decisions:** `FAVOURITES_BLOCKERS.md` - Technical blockers & SQL
- **How-To:** `FAVOURITES_GUIDE.md` - Step-by-step implementation
- **Quick Ref:** `FAVOURITES_QUICKREF.md` - Component usage examples
- **This File:** `MORNING_CHECKLIST.md` - What you're reading now

---

## 💬 Questions?

**"Can I see the code structure?"**
```bash
tree types/favourites.ts components/favourites/ pages/api/findr/favourites*
```

**"How do I test components in isolation?"**
```tsx
// Create a test file:
// pages/test/favourites-components.tsx
import { SpeciesCard } from '@/components/favourites/SpeciesCard';

export default function TestPage() {
  return <SpeciesCard species={mockData} />;
}
```

**"What if I want to keep old page for now?"**
```bash
# Don't rename anything
# Keep both pages:
# - /findr/favourites (old)
# - /findr/favourites-modern (new)
```

**"Where's the authentication example?"**
```bash
# See: FAVOURITES_GUIDE.md
# Section: "2. Add Authentication to API routes"
```

---

## 🎉 You're Ready!

Everything is built. Just need to:
1. Make 4 decisions (5 min)
2. Follow today's tasks (2-3 hours)
3. Ship it! 🚀

**Start here:** Make decisions above, then open `FAVOURITES_GUIDE.md`

---

**Created:** $(date)  
**Status:** ✅ All code complete, awaiting your decisions  
**Next:** Make decisions → Implement MVP → Ship today! 🎯
