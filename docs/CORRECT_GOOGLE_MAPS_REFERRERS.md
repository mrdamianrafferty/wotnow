# Correct Google Maps API HTTP Referrer Format

## ❌ WRONG (What I Suggested Earlier)
```
https://fishfindr.eu/*
https://fishfindr.eu/findr/*
https://godaisy.io/*
```

**These are WRONG!** Google does NOT support path-based referrers.

## ✅ CORRECT Format (Per Google Docs)

According to Google's official documentation:
> Query parameters and fragments are not currently supported; they will be ignored if you include them in an HTTP referrer.

**Paths are also NOT supported** - only domains and subdomains.

### Your API Key Should Have These Referrers:

```
http://localhost:3000
https://fishfindr.eu
https://*.fishfindr.eu
https://godaisy.io
https://*.godaisy.io
```

That's it! No paths, no wildcards after the domain.

## How It Works

When a request comes from `https://fishfindr.eu/findr/log`:
- Google extracts the domain: `fishfindr.eu`
- Checks if `https://fishfindr.eu` is in the allowed list
- ✅ Allowed (the path `/findr/log` is ignored)

When a request comes from `https://www.fishfindr.eu/some/path`:
- Google extracts: `www.fishfindr.eu`
- Checks against the wildcard: `https://*.fishfindr.eu`
- ✅ Allowed

## Google's Official Examples

From the docs:

| Example | What It Allows |
|---------|----------------|
| `https://example.com` | Any URL in that single domain with no subdomains |
| `https://sub.example.com` | Any URL in that specific subdomain |
| `https://*.example.com` | Any subdomain (but NOT the root domain) |
| `https://example.com` + `https://*.example.com` | Root domain AND all subdomains |
| `http://www.example.com:8000` | A URL with non-standard port |

## Your Current Setup Should Be

**Application restrictions:** HTTP referrers (web sites)

**Website restrictions:**
```
http://localhost:3000
https://fishfindr.eu
https://*.fishfindr.eu
https://godaisy.io
https://*.godaisy.io
```

**API restrictions:** Don't restrict key
(Or if restricted: Select both "Maps JavaScript API" + "Places API")

## Why Your Error Might Persist

If you have paths in your referrer list (like `https://fishfindr.eu/findr/*`):
1. Google might be rejecting the format
2. Remove any entries with `/*` or paths
3. Keep only domain-level entries as shown above

## Test After Changes

1. Update referrers to the correct format above
2. Save and wait 2-3 minutes for propagation
3. Hard refresh (Cmd+Shift+R) at fishfindr.eu/findr/log
4. Try typing in the location search
5. Should work immediately!
