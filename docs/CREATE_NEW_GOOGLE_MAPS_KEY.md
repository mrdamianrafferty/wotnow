# Create Fresh Google Maps API Key

Your current key seems stuck in Google's caching system. Create a fresh one:

## Step 1: Create New API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. **IMMEDIATELY** copy the new key (it shows once!)
4. Click **"RESTRICT KEY"**

## Step 2: Configure Restrictions

### Application restrictions → Websites

Add these (NO /* at the end):
```
http://localhost:3000
https://fishfindr.eu
https://fishfindr.eu/findr/*
https://*.fishfindr.eu
https://godaisy.io
https://*.godaisy.io
```

### API restrictions → Don't restrict key

Leave as "Don't restrict key" (so it can call Maps + Places)

**Click SAVE**

## Step 3: Enable APIs for New Key

Make sure these are enabled:
- https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
- https://console.cloud.google.com/apis/library/places-backend.googleapis.com

Both should show green "API enabled" checkmark.

## Step 4: Update Environment Variables

### Update Local:
```bash
cd /Users/damianrafferty/Projects/WotNow

# Edit .env.local
nano .env.local
# Change NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to new key
# Save: Ctrl+O, Enter, Ctrl+X
```

### Update Vercel:
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

## Step 5: Redeploy

```bash
git commit --allow-empty -m "Trigger redeploy for new Google Maps API key"
git push
```

## Step 6: Test

Wait 2-3 minutes for deployment, then:
1. Go to https://fishfindr.eu/findr/log
2. Hard refresh (Cmd+Shift+R)
3. Try typing in location search
4. Should work immediately (no 5-minute wait since it's a fresh key)

## Step 7: Delete Old Key (After Confirming New Works)

Once the new key works:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find the old key: `AIzaSyBvUzTUyaNiTufKVIMa5Wh087VMkxpf61Q`
3. Click ⋮ → Delete

This ensures you're not billed for two keys.
