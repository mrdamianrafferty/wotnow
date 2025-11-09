# Email Notifications Implementation

**Status:** ✅ **IMPLEMENTED** (2025-11-09)

## Overview

Email notifications for Findr fishing alerts have been implemented using **daily digest** format to avoid overwhelming users. This feature sends ONE email per user per day containing ALL their species alerts.

## Key Features

### Daily Digest Approach

- **Maximum: 1 email per user per day** - Prevents notification fatigue
- **Batched alerts** - All threshold-crossing species in a single email
- **Real-time push notifications** - Continue to send immediately (unchanged)
- **Free tier compatible** - Resend free tier: 3,000 emails/month, 100/day

### Email Content

Each daily digest email includes:
- Personalized greeting with user's name (if available)
- List of all species crossing confidence thresholds
- Species details: name, location, confidence score, rectangle code
- Confidence-based color coding (green 85%+, blue 75%+, amber 65%+)
- Species images (when available)
- CTA button to view full forecast at fishfindr.eu
- Unsubscribe/manage preferences link

### Email Formats

Both HTML and plain text versions are generated for maximum compatibility:
- **HTML version**: Beautiful responsive design with gradients, cards, and images
- **Text version**: Clean ASCII format for email clients without HTML support

## Technical Implementation

### Files Modified/Created

1. **`lib/findr/emailTemplates.ts`** (NEW)
   - HTML email template generator
   - Plain text email generator
   - Responsive design with inline styles
   - Confidence-based color coding

2. **`pages/api/cron/check-notifications.ts`** (MODIFIED)
   - Added Resend integration
   - Implemented daily digest batching logic
   - Added `hasReceivedDailyDigestToday()` check
   - Separated push (individual) vs email (batched) flows
   - Added `sendDailyDigestEmail()` function

3. **`.env.example`** (MODIFIED)
   - Added `RESEND_API_KEY` documentation
   - Added `CRON_SECRET` documentation
   - Included free tier limits

4. **`package.json`** (MODIFIED)
   - Added `resend` dependency

### Database Schema

Uses existing `notification_log` table with new notification type:

```sql
{
  user_id: UUID,
  species_id: NULL,  -- Not species-specific for digests
  notification_type: 'daily_digest',
  channel: 'email',
  notification_data: {
    alert_count: 3,
    species_codes: ['BSS', 'COD', 'MAC'],
    location: '31E8'
  },
  sent_at: TIMESTAMP
}
```

### Notification Flow

```
1. Cron job runs (every 30-60 minutes)
   ↓
2. Check predictions for all users with notifications enabled
   ↓
3. Find species crossing confidence thresholds
   ↓
4a. Send PUSH notifications individually (real-time)
   ↓
4b. Group EMAIL notifications by user
   ↓
5. For each user with email alerts:
   - Check if already sent digest today
   - If not: Send ONE email with ALL their species
   - Log digest send to prevent duplicates
   ↓
6. Return summary: pushCount, emailDigestCount
```

### Daily Limit Enforcement

The `hasReceivedDailyDigestToday()` function ensures users receive at most one email per day:

```typescript
async function hasReceivedDailyDigestToday(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('channel', 'email')
    .eq('notification_type', 'daily_digest')
    .gte('sent_at', todayStart.toISOString())
    .limit(1);

  return data && data.length > 0;
}
```

### Resend Integration

Email sending uses Resend's Node.js SDK:

```typescript
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Findr <notifications@fishfindr.eu>',
  to: userEmail,
  subject: `🎣 ${alerts.length} great fishing opportunities today`,
  html: htmlContent,
  text: textContent,
});
```

## Environment Variables

### Required

```bash
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_your_api_key_here

# Cron job authentication secret (generate with: openssl rand -base64 32)
CRON_SECRET=your_secure_random_secret
```

### Resend Free Tier Limits

- **3,000 emails per month**
- **100 emails per day**
- Perfect for MVP with daily digest approach

### Setting Up Resend

1. Create account at https://resend.com
2. Verify domain: `fishfindr.eu`
3. Create API key
4. Add to Vercel environment variables

## User Interface

The notification setup modal (`components/favourites/NotificationSetupModal.tsx`) already has an email toggle:

```tsx
<label className="label cursor-pointer bg-base-200 rounded-lg p-3">
  <span className="flex items-center gap-2">
    <Mail className="w-4 h-4 text-info" />
    <span>Email</span>
  </span>
  <input
    type="checkbox"
    className="checkbox checkbox-info checkbox-sm"
    checked={preferences.channels.email}
    onChange={(e) => setPreferences({
      ...preferences,
      channels: { ...preferences.channels, email: e.target.checked }
    })}
  />
</label>
```

No UI changes required - email option is already present.

## Testing

### Local Testing

1. Add `RESEND_API_KEY` to `.env.local`
2. Add `CRON_SECRET` to `.env.local`
3. Enable email notifications for a test user
4. Manually trigger cron job:
   ```bash
   curl -X POST http://localhost:3000/api/cron/check-notifications \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### Production Testing

1. Add environment variables to Vercel
2. Verify domain in Resend dashboard
3. Test with real user account:
   - Enable notifications for multiple species
   - Set low threshold (e.g., 60%)
   - Wait for cron job to run
4. Check Resend logs for delivery status

## Email Template Preview

### HTML Version
- Gradient header with Findr branding
- Species cards with images and confidence badges
- Responsive design (mobile-friendly)
- Color-coded confidence scores
- Call-to-action button
- Footer with manage preferences link

### Text Version
- Clean ASCII layout
- All species listed with details
- Plain text links
- Readable on any email client

## Monitoring

### Logs to Check

```bash
# Vercel function logs
vercel logs <deployment-url>

# Look for:
[Cron] Daily digest email sent successfully: {
  userId: 'xxx',
  email: 'user@example.com',
  alertCount: 3,
  resendId: 'xxx'
}
```

### Resend Dashboard

- Email delivery status
- Bounce/complaint tracking
- Usage against free tier limits

## Future Enhancements

### Potential Improvements

1. **Species images** - Add actual species images to email template
2. **Localization** - Translate emails based on user's language preference
3. **Unsubscribe link** - One-click unsubscribe functionality
4. **Email preferences** - Allow users to choose digest frequency (daily vs weekly)
5. **Bite score inclusion** - Show bite score alongside confidence
6. **Location nickname** - Use user's saved location name instead of rectangle code
7. **Weather summary** - Include relevant weather data in digest

### Upgrade Path (If Needed)

If free tier limits are exceeded:
- **Resend Pro**: $20/month for 50,000 emails
- Current daily digest approach should keep usage well within free tier

## Rollback Plan

If issues arise, email notifications can be disabled without affecting push notifications:

1. Remove `RESEND_API_KEY` from environment variables
2. Cron job will log "Resend not configured" and skip email sending
3. Push notifications continue to work normally

## Security Considerations

- ✅ Cron job requires `CRON_SECRET` in Authorization header
- ✅ User emails fetched via Supabase `auth.admin.getUserById()`
- ✅ RLS policies prevent unauthorized access to notification preferences
- ✅ Daily limit prevents spam/abuse
- ✅ Email addresses only used for notifications (not stored separately)

## Success Metrics

Track these metrics to measure success:

- Email delivery rate (target: >95%)
- Open rate (target: >25%)
- Click-through rate (target: >5%)
- Unsubscribe rate (target: <2%)
- User satisfaction with daily digest vs individual emails

## Related Documentation

- [FAVOURITES_GUIDE.md](./FAVOURITES_GUIDE.md) - User favorites system
- [FINDR_VALIDATION_SYSTEM.md](./FINDR_VALIDATION_SYSTEM.md) - Catch validation
- Resend API docs: https://resend.com/docs

## Summary

Email notifications are now implemented using a **daily digest** approach that:
- ✅ Sends ONE email per user per day maximum
- ✅ Batches all species alerts into a single email
- ✅ Uses Resend free tier (3,000/month, 100/day)
- ✅ Includes both HTML and plain text versions
- ✅ Maintains real-time push notifications separately
- ✅ Prevents spam with daily limit enforcement
- ✅ Ready for production deployment

The implementation is complete and ready for testing with users.
