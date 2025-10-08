# 🗄️ Supabase Pre-DNS Migration Guide

**Status**: Ready to deploy while DNS propagates  
**Estimated Time**: 10-15 minutes  
**Impact**: Prepares location system for immediate use after DNS

---

## 🚀 Quick Deploy Instructions

### 1. Open Supabase SQL Editor
```bash
# Open your Supabase project
open https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/sql/new
```

### 2. Run Migration Script
1. Copy entire contents of `SUPABASE_PRE_DNS_MIGRATION.sql`
2. Paste into Supabase SQL Editor
3. Click **"Run"** button
4. Wait for success confirmation

### 3. Verify Deployment
Check the verification queries at the end show:
- ✅ 6 tables created successfully
- ✅ 15 ICES rectangles inserted  
- ✅ RLS policies active
- ✅ Indexes created for performance

---

## 📋 What This Migration Includes

### 🌍 **Location System** (Priority: HIGH)
- ✅ `user_location_preferences` - User location settings with privacy controls
- ✅ GPS fields in `findr_catch_entries` - Precise catch coordinates
- ✅ `ices_rectangles` - 15 European fishing areas (~30km zones)

### 👤 **User Features**
- ✅ `user_favourites` - Species favorites system
- ✅ Full Row Level Security (RLS) policies
- ✅ Privacy-first data access controls

### ⚡ **Performance & Caching**
- ✅ `moon_cache` - Moon phase data caching
- ✅ `findr_conditions_snapshots` - Weather condition caching  
- ✅ Optimized indexes for fast queries

### 🔒 **Security Features**
- ✅ Row Level Security on all user tables
- ✅ User isolation (users only see their own data)
- ✅ Authenticated access for reference data
- ✅ Proper foreign key constraints

---

## 🎯 Immediate Benefits

After migration, your location system will be ready to:

1. **🌐 Background IP Detection** - Automatic location without GPS
2. **📍 GPS Catch Logging** - Optional precise coordinates  
3. **🗺️ ICES Rectangle Selection** - 15 fishing areas ready to use
4. **👤 User Preferences** - Privacy-controlled location settings
5. **⚡ Performance Caching** - Fast responses for weather/moon data

---

## 🧪 Test After Migration

Once DNS propagates, test these endpoints:

```bash
# Location preferences
curl https://fishfindr.eu/api/user/location-preferences

# Enhanced catch logging with GPS
curl -X POST https://fishfindr.eu/api/findr/catch-log \
  -H "Content-Type: application/json" \
  -d '{"species_id":"sea-bass","gps_latitude":50.25,"gps_longitude":1.5}'

# ICES rectangles
curl https://fishfindr.eu/api/findr/rectangles
```

---

## ⚠️ Notes

- **Safe to run now**: No DNS dependency
- **Idempotent**: Safe to run multiple times  
- **Backwards compatible**: Won't break existing functionality
- **Ready for production**: All privacy controls included

Run this migration now to have everything ready when DNS propagates! 🚀