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
  unsubscribeUrl?: string;
}

export interface TieredEmailSpeciesAlert extends EmailSpeciesAlert {
  tier: 'hot_bites' | 'good_conditions' | 'status_updates';
}

export interface TieredDailyDigestData {
  userName?: string;
  hotBites: TieredEmailSpeciesAlert[];
  goodConditions: TieredEmailSpeciesAlert[];
  statusUpdates: TieredEmailSpeciesAlert[];
  date: string;
  locationName: string;
  unsubscribeUrl?: string;
}

/**
 * Generate HTML email template for daily fishing digest
 */
export function generateDailyDigestHTML(data: DailyDigestData): string {
  const { userName, alerts, date, unsubscribeUrl } = data;
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
                ${unsubscribeUrl ? ` • <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>` : ''}
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
  const { userName, alerts, date, unsubscribeUrl } = data;
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
Manage notification preferences: https://fishfindr.eu/findr/favourites${unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''}

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

/**
 * Generate tiered daily digest HTML with species grouped by confidence bands
 * HOT BITES (85%+), GOOD CONDITIONS (60-84%), STATUS UPDATES (<60%)
 */
export function generateTieredDailyDigestHTML(data: TieredDailyDigestData): string {
  const { userName, hotBites, goodConditions, statusUpdates, date, locationName, unsubscribeUrl } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hello';

  const totalSpecies = hotBites.length + goodConditions.length + statusUpdates.length;

  // Helper to render species card
  const renderSpeciesCard = (alert: TieredEmailSpeciesAlert, bgColor: string) => `
    <tr>
      <td style="padding: 0 24px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: top; width: 50px;">
                    ${alert.imageUrl ? `
                    <img src="${alert.imageUrl}" alt="${alert.speciesName}" width="40" height="40" style="border-radius: 6px; display: block;" />
                    ` : `
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                      🐟
                    </div>
                    `}
                  </td>
                  <td style="vertical-align: top; padding-left: 12px;">
                    <h4 style="margin: 0 0 2px; font-size: 16px; font-weight: 600; color: #111827;">
                      ${alert.speciesName}
                    </h4>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">
                      ${alert.rectangleCode || ''}
                    </p>
                  </td>
                  <td style="vertical-align: top; text-align: right;">
                    <div style="display: inline-block; background-color: ${getConfidenceColor(alert.confidence)}; color: #ffffff; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 600;">
                      ${alert.confidence}%
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Findr - Daily Fishing Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎣 Daily Fishing Digest
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${date} • ${locationName}
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
                Here's your fishing forecast for <strong>${totalSpecies} species</strong>:
              </p>
            </td>
          </tr>

          ${hotBites.length > 0 ? `
          <!-- Hot Bites Section (85%+) -->
          <tr>
            <td style="padding: 8px 24px 12px;">
              <div style="background-color: #10b981; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                🔥 HOT BITES (${hotBites.length}) - Go Fish Now!
              </div>
            </td>
          </tr>
          ${hotBites.map(alert => renderSpeciesCard(alert, '#f0fdf4')).join('')}
          ` : ''}

          ${goodConditions.length > 0 ? `
          <!-- Good Conditions Section (60-84%) -->
          <tr>
            <td style="padding: 16px 24px 12px;">
              <div style="background-color: #0ea5e9; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                👍 GOOD CONDITIONS (${goodConditions.length}) - Worth a Trip
              </div>
            </td>
          </tr>
          ${goodConditions.map(alert => renderSpeciesCard(alert, '#f0f9ff')).join('')}
          ` : ''}

          ${statusUpdates.length > 0 ? `
          <!-- Status Updates Section (<60%) -->
          <tr>
            <td style="padding: 16px 24px 12px;">
              <div style="background-color: #6b7280; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                📊 STATUS UPDATES (${statusUpdates.length})
              </div>
            </td>
          </tr>
          ${statusUpdates.map(alert => renderSpeciesCard(alert, '#f9fafb')).join('')}
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 24px 24px 32px;" align="center">
              <a href="https://fishfindr.eu/findr/predictions" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);">
                View Full Forecast →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-align: center;">
                You're receiving this daily digest because you enabled email notifications.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                <a href="https://fishfindr.eu/findr/favourites" style="color: #0ea5e9; text-decoration: none;">Manage notification preferences</a>${unsubscribeUrl ? ` • <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>` : ''}
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
 * Generate plain text version of tiered daily digest email
 */
export function generateTieredDailyDigestText(data: TieredDailyDigestData): string {
  const { userName, hotBites, goodConditions, statusUpdates, date, locationName, unsubscribeUrl } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hello';
  const totalSpecies = hotBites.length + goodConditions.length + statusUpdates.length;

  let text = `
FINDR DAILY FISHING DIGEST
${date} • ${locationName}

${greeting},

Here's your fishing forecast for ${totalSpecies} species:
`;

  if (hotBites.length > 0) {
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 HOT BITES (${hotBites.length}) - Go Fish Now!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    hotBites.forEach(alert => {
      text += `\n🐟 ${alert.speciesName}
📍 ${alert.rectangleCode || locationName}
📊 ${alert.confidence}% Confidence\n`;
    });
  }

  if (goodConditions.length > 0) {
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👍 GOOD CONDITIONS (${goodConditions.length}) - Worth a Trip
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    goodConditions.forEach(alert => {
      text += `\n🐟 ${alert.speciesName}
📍 ${alert.rectangleCode || locationName}
📊 ${alert.confidence}% Confidence\n`;
    });
  }

  if (statusUpdates.length > 0) {
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STATUS UPDATES (${statusUpdates.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    statusUpdates.forEach(alert => {
      text += `\n🐟 ${alert.speciesName}
📍 ${alert.rectangleCode || locationName}
📊 ${alert.confidence}% Confidence\n`;
    });
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View full forecast: https://fishfindr.eu/findr/predictions

---
You're receiving this daily digest because you enabled email notifications.
Manage notification preferences: https://fishfindr.eu/findr/favourites${unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''}

© 2025 Findr • fishfindr.eu
  `;

  return text.trim();
}

/**
 * Weekly Forecast Email Types
 */
export interface WeeklyForecastDay {
  date: string;         // e.g., "Mon 15"
  confidence: number;   // 0-100
}

export interface WeeklyForecastSpecies {
  speciesName: string;
  speciesCode: string;
  imageUrl: string;     // Full URL to species image
  forecast: WeeklyForecastDay[];  // 7 days
  peakDay: string;      // e.g., "Wednesday" - best day of the week
  peakConfidence: number;
}

export interface WeeklyForecastData {
  userName?: string;
  species: WeeklyForecastSpecies[];
  weekStart: string;    // e.g., "Week of January 15, 2025"
  locationName: string;
  unsubscribeUrl?: string;
}

/**
 * Generate HTML version of weekly forecast email with species images and 7-day charts
 */
export function generateWeeklyForecastHTML(data: WeeklyForecastData): string {
  const { userName, species, weekStart, locationName, unsubscribeUrl } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hello';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Fishing Forecast</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <!-- Main Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Email Content -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #ffffff;">
                📅 Your Weekly Fishing Forecast
              </h1>
              <p style="margin: 0; font-size: 16px; color: #e0f2fe;">
                ${weekStart} • ${locationName}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 16px;">
              <p style="margin: 0; font-size: 16px; color: #374151;">
                ${greeting},
              </p>
              <p style="margin: 12px 0 0; font-size: 16px; color: #374151;">
                Plan your week with confidence forecasts for your ${species.length} favourite species:
              </p>
            </td>
          </tr>

          ${species.map(s => `
          <!-- Species Card: ${s.speciesName} -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 16px;">
                    <!-- Species Header with Image -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="80" valign="top">
                          <img src="https://fishfindr.eu${s.imageUrl}" alt="${s.speciesName}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; display: block;" />
                        </td>
                        <td style="padding-left: 16px;" valign="top">
                          <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: #111827;">
                            ${s.speciesName}
                          </h3>
                          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                            Best day: <strong style="color: #0ea5e9;">${s.peakDay}</strong> (${s.peakConfidence}% confidence)
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- 7-Day Forecast Chart -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                      <tr>
                        ${s.forecast.map(day => `
                        <td style="width: 14.28%; text-align: center; vertical-align: bottom; padding: 0 2px;">
                          <!-- Bar Chart -->
                          <div style="background-color: #e5e7eb; border-radius: 4px 4px 0 0; height: 60px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative;">
                            <div style="width: 100%; background: ${day.confidence >= 85 ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)' : day.confidence >= 60 ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(180deg, #94a3b8 0%, #64748b 100%)'}; border-radius: 4px 4px 0 0; height: ${day.confidence}%; display: flex; align-items: center; justify-content: center;">
                              <span style="font-size: 10px; font-weight: 600; color: #ffffff;">${day.confidence}%</span>
                            </div>
                          </div>
                          <!-- Day Label -->
                          <p style="margin: 4px 0 0; font-size: 11px; font-weight: 500; color: #6b7280;">
                            ${day.date}
                          </p>
                        </td>
                        `).join('')}
                      </tr>
                    </table>

                    <!-- Legend -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
                      <tr>
                        <td style="text-align: center; padding: 8px; background-color: #ffffff; border-radius: 6px;">
                          <span style="font-size: 11px; color: #6b7280;">
                            <span style="display: inline-block; width: 12px; height: 12px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 3px; margin-right: 4px; vertical-align: middle;"></span>
                            Hot Bites (85%+) •
                            <span style="display: inline-block; width: 12px; height: 12px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 3px; margin: 0 4px 0 8px; vertical-align: middle;"></span>
                            Good (60-84%) •
                            <span style="display: inline-block; width: 12px; height: 12px; background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); border-radius: 3px; margin: 0 4px 0 8px; vertical-align: middle;"></span>
                            Moderate (<60%)
                          </span>
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
            <td style="padding: 24px 24px 32px;" align="center">
              <a href="https://fishfindr.eu/findr/predictions" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);">
                View Full Forecast →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-align: center;">
                You're receiving this weekly forecast because you enabled email notifications.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                <a href="https://fishfindr.eu/findr/favourites" style="color: #0ea5e9; text-decoration: none;">Manage notification preferences</a>${unsubscribeUrl ? ` • <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>` : ''}
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
 * Generate plain text version of weekly forecast email
 */
export function generateWeeklyForecastText(data: WeeklyForecastData): string {
  const { userName, species, weekStart, locationName, unsubscribeUrl } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hello';

  let text = `
FINDR WEEKLY FISHING FORECAST
${weekStart} • ${locationName}

${greeting},

Plan your week with 7-day confidence forecasts for your ${species.length} favourite species:

`;

  species.forEach(s => {
    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐟 ${s.speciesName}
Best day: ${s.peakDay} (${s.peakConfidence}% confidence)

7-Day Forecast:
${s.forecast.map(day => {
  const bar = '█'.repeat(Math.round(day.confidence / 10));
  const confidence = day.confidence >= 85 ? '🔥' : day.confidence >= 60 ? '👍' : '📊';
  return `${day.date}: ${bar} ${day.confidence}% ${confidence}`;
}).join('\n')}

`;
  });

  text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View full forecast: https://fishfindr.eu/findr/predictions

---
You're receiving this weekly forecast because you enabled email notifications.
Manage notification preferences: https://fishfindr.eu/findr/favourites${unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''}

© 2025 Findr • fishfindr.eu
  `;

  return text.trim();
}
