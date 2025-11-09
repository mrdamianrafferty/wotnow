/**
 * Email Templates for Findr Notifications
 *
 * Daily digest format - one email per user with all species alerts
 */

export interface EmailSpeciesAlert {
  speciesName: string;
  confidence: number;
  locationName: string;
  rectangleCode?: string;
  imageUrl?: string;
}

export interface DailyDigestData {
  userName?: string;
  alerts: EmailSpeciesAlert[];
  date: string;
}

/**
 * Generate HTML email template for daily fishing digest
 */
export function generateDailyDigestHTML(data: DailyDigestData): string {
  const { userName, alerts, date } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hello';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Findr - Daily Fishing Forecast</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">

  <!-- Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">

        <!-- Email Content -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎣 Findr Daily Forecast
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${date}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 16px;">
              <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.5;">
                ${greeting},
              </p>
              <p style="margin: 12px 0 0; font-size: 16px; color: #374151; line-height: 1.5;">
                Great fishing conditions detected for <strong>${alerts.length} species</strong> you're tracking:
              </p>
            </td>
          </tr>

          <!-- Species Alerts -->
          ${alerts.map(alert => `
          <tr>
            <td style="padding: 0 24px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; width: 60px;">
                          ${alert.imageUrl ? `
                          <img src="${alert.imageUrl}" alt="${alert.speciesName}" width="50" height="50" style="border-radius: 8px; display: block;" />
                          ` : `
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                            🐟
                          </div>
                          `}
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                          <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: #111827;">
                            ${alert.speciesName}
                          </h3>
                          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                            ${alert.locationName}${alert.rectangleCode ? ` • ${alert.rectangleCode}` : ''}
                          </p>
                          <div style="display: inline-block; background-color: ${getConfidenceColor(alert.confidence)}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            ${alert.confidence}% Confidence
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `).join('')}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 8px 24px 32px;" align="center">
              <a href="https://fishfindr.eu/findr/predictions" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);">
                View Full Forecast →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-align: center;">
                You're receiving this email because you enabled email notifications for these species.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                <a href="https://fishfindr.eu/findr/favourites" style="color: #0ea5e9; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer Text -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
          <tr>
            <td style="text-align: center; padding: 16px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © 2025 Findr • <a href="https://fishfindr.eu" style="color: #0ea5e9; text-decoration: none;">fishfindr.eu</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of daily digest email
 */
export function generateDailyDigestText(data: DailyDigestData): string {
  const { userName, alerts, date } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hello';

  return `
FINDR DAILY FISHING FORECAST
${date}

${greeting},

Great fishing conditions detected for ${alerts.length} species you're tracking:

${alerts.map(alert => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐟 ${alert.speciesName}
📍 ${alert.locationName}${alert.rectangleCode ? ` • ${alert.rectangleCode}` : ''}
📊 ${alert.confidence}% Confidence
`).join('')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View full forecast: https://fishfindr.eu/findr/predictions

---
You're receiving this email because you enabled email notifications for these species.
Manage notification preferences: https://fishfindr.eu/findr/favourites

© 2025 Findr • fishfindr.eu
  `.trim();
}

/**
 * Get confidence color for email badge
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return '#10b981'; // green
  if (confidence >= 75) return '#0ea5e9'; // blue
  if (confidence >= 65) return '#f59e0b'; // amber
  return '#6b7280'; // gray
}
