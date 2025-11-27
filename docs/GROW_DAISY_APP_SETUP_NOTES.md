# Grow Daisy iOS App Setup Notes

## When Adding Grow Daisy as a Separate iOS App

When creating a new iOS app shell for Grow Daisy (similar to how Go Daisy and Findr are separate apps), you'll need to configure authentication.

### 1. Choose Bundle ID

Decide on the bundle ID for Grow Daisy, e.g.:
- `io.growdaisy.app`
- `io.godaisy.grow`

### 2. Apple Developer Console

1. Register the new App ID in Apple Developer Console
2. Enable **Sign in with Apple** capability
3. Associate the bundle ID with the existing Services ID (`io.godaisy.login`)

### 3. Supabase Configuration (CRITICAL)

Add the new bundle ID to Supabase's **Authorized Client IDs** for Apple:

1. Go to: **Supabase Dashboard** → **Authentication** → **Providers** → **Apple**
2. Find: **"Authorized Client IDs"** field
3. Add the new bundle ID to the existing list:
   ```
   io.godaisy.login,eu.fishfindr.app,io.godaisy.app,io.growdaisy.app
   ```
4. Click **Save**

**Why this is needed:**
- Native iOS Apple Sign In returns ID tokens with the app's bundle ID as the audience
- Supabase must be configured to accept tokens from ALL valid bundle IDs
- Without this, you'll see: `Unacceptable audience in id_token: [io.growdaisy.app]`

### 4. Capacitor Config

Create a new Capacitor config file (similar to `capacitor.godaisy.config.ts`):

```typescript
// capacitor.growdaisy.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.growdaisy.app',  // Your chosen bundle ID
  appName: 'Grow Daisy',
  webDir: 'out',
  // ... rest of config
};

export default config;
```

### 5. Reference: Current Authorized Client IDs

As of November 2025, Supabase Apple provider accepts:
- `io.godaisy.login` - Services ID for web OAuth (all apps)
- `eu.fishfindr.app` - Findr iOS native app
- `io.godaisy.app` - Go Daisy iOS native app

### 6. Google Sign In (If Needed)

If Grow Daisy will support Google Sign In:
1. Create a new iOS OAuth Client ID in Google Cloud Console
2. Add it to Supabase's Google provider **Authorized Client IDs**

---

*This note was created after fixing Apple Sign In for Go Daisy iOS app (November 27, 2025)*
