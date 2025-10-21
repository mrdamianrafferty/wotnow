# Vercel Deployment Investigation

## Critical Issue
OAuth fixes committed to GitHub main branch are **NOT appearing in production** despite successful builds.

## Evidence

### 1. Code is Correct in GitHub
```bash
$ curl -s "https://raw.githubusercontent.com/mrdamianrafferty/wotnow/main/pages/auth/callback.tsx" | grep -A 2 "if (code)"
if (code) {
  console.log('[OAuth Debug] Starting code exchange flow...', { code: code.substring(0, 10) + '...', codeLength: code.length });
```

✅ GitHub has the NEW code with "[OAuth Debug]" logging

### 2. Production Serves OLD Code
```
E2E Test Output (19:37:43 build):
[Browser Console log]: Exchanging code for session... {code: test-code...}
```

❌ Production shows OLD log message "Exchanging code for session..."

### 3. Build Timestamps Updating
- 19:03:16
- 19:05:09  
- 19:10:18
- 19:14:18
- 19:24:14
- 19:37:43 ← Latest

Builds ARE completing but serving old code!

### 4. Commits Confirmed Pushed
```
b428f970 (HEAD -> main, origin/main) Simplify vercel.json to use default build settings
b3c91293 Temporarily disable prebuild lint to fix Vercel build error
a87445cb Disable caching for OAuth callback to force fresh code
fce0f250 Add comprehensive OAuth debug logging and error handling ← HAS NEW CODE
465e94ca Fix indentation in OAuth callback session detection
```

All commits pushed successfully to origin/main

## Hypothesis

**Vercel may be building from a cached or incorrect commit SHA.**

Possible causes:
1. Vercel's git integration is not pulling latest main
2. Build is using cached source code from before commit fce0f250
3. There's a Vercel-specific configuration pointing to wrong branch/commit

## Required Actions

### Check Vercel Dashboard
1. Go to latest deployment
2. Verify "Source" shows correct commit SHA (should be `b428f970` or later)
3. Check if it shows `fce0f250` or earlier (wrong!)
4. Look at "Build Logs" → "Source Code" section to see what commit was actually built

### If Wrong Commit
- Vercel may have a "Production Branch" setting pointing to wrong branch
- Check Project Settings → Git → Production Branch (should be `main`)
- Check if there's a `vercel.json` "github" configuration overriding branch

### If Correct Commit but Old Code
- Vercel's build cache is corrupt
- Need to: "Redeploy" → Select commit `fce0f250` or later → Uncheck "Use existing Build Cache"

### Nuclear Option
If nothing works:
1. Delete `.vercel` directory from project (if exists locally)
2. Disconnect GitHub integration in Vercel
3. Reconnect GitHub integration
4. Trigger fresh deployment

## Test Command
After any deployment fix:
```bash
npx playwright test e2e/oauth-godaisy.spec.ts --grep="existing session" 2>&1 | grep "\[OAuth Debug\]"
```

Should see: `[Browser Console log]: [OAuth Debug] Starting code exchange flow...`

## Timeline
- 17:50-18:00: Multiple OAuth commits
- 19:02-19:24: ~10 deployments, all failing or serving old code
- 19:37: Latest build (simplified vercel.json) - STILL old code
- **Action needed**: Manual Vercel dashboard investigation required
