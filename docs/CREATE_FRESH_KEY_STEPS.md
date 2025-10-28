# Create Fresh Google Maps API Key - Step by Step

## Current Issue
Even with "None" restrictions, requests are blocked. This suggests the API key itself may be problematic.

## Current Key
`AIzaSyBvUzTUyaNiTufKVIMa5Wh087VMkxpf61Q`

## Steps to Create Fresh Key

### 1. Go to API Console
https://console.cloud.google.com/apis/credentials

### 2. Create New API Key
1. Click **"+ CREATE CREDENTIALS"**
2. Select **"API key"**
3. **IMMEDIATELY copy the key** (shows once!)
4. Click **"RESTRICT KEY"**

### 3. Configure Restrictions

**Name:** `FishFindr Production 2025`

**Application restrictions:** Websites

**Website restrictions:**
```
http://localhost:3000
https://fishfindr.eu
https://*.fishfindr.eu
https://godaisy.io
https://*.godaisy.io
```

**API restrictions:** Don't restrict key

Click **SAVE**

### 4. Enable Required APIs

Make sure BOTH are enabled:

**Maps JavaScript API:**
https://console.cloud.google.com/apis/library/maps-backend.googleapis.com

**Places API (New):**
https://console.cloud.google.com/marketplace/product/google/places.googleapis.com

**Places API (Legacy - just in case):**
https://console.cloud.google.com/apis/library/places-backend.googleapis.com

### 5. Update Environment Variables

**Local:**
```bash
cd /Users/damianrafferty/Projects/WotNow

# Edit .env.local
nano .env.local
# Change NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to new key
# Save: Ctrl+O, Enter, Ctrl+X
```

**Vercel:**
```bash
# Remove old key
vercel env rm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
vercel env rm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY preview
vercel env rm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY development

# Add new key
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# Paste new key when prompted
# Select: Production, Preview, Development (Space to select, Enter to confirm)
```

### 6. Redeploy
```bash
git commit --allow-empty -m "Trigger redeploy for new Google Maps API key"
git push
```

### 7. Test After 2-3 Minutes
1. Go to: https://fishfindr.eu/findr/log
2. Hard refresh: Cmd+Shift+R
3. Try typing in location search
4. Should work immediately!

### 8. Delete Old Key (After Confirming New Works)
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find old key: `AIzaSyBvUzTUyaNiTufKVIMa5Wh087VMkxpf61Q`
3. Click ⋮ → Delete
