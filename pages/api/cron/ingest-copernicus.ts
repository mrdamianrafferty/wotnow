/**
 * Copernicus Marine Biogeochemical Data Ingestion Cron Job
 * 
 * Runs daily at 6:00 AM UTC to ingest oceanographic data for all coastal rectangles.
 * Includes comprehensive error handling and failure notifications.
 * 
 * Schedule: Daily at 06:00 UTC
 * Expected runtime: ~4 hours for 200 rectangles
 * Failure threshold: >20% failure rate triggers alert
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyCronAuth } from '@/lib/cron-auth';

// Types for ingestion results
interface IngestionResult {
  rectangle_code: string;
  success: boolean;
  error?: string;
  variables_retrieved: number;
  data_quality: 'good' | 'partial' | 'poor';
}

interface IngestionSummary {
  total_rectangles: number;
  successful: number;
  failed: number;
  partial: number;
  success_rate: number;
  duration_minutes: number;
  errors: Array<{ rectangle: string; error: string }>;
  warnings: string[];
}

/**
 * Send failure notification email via SendGrid or similar
 * You'll need to configure SENDGRID_API_KEY in environment variables
 */
async function sendFailureNotification(summary: IngestionSummary) {
  const subject = `⚠️ Copernicus Ingestion Alert: ${summary.success_rate.toFixed(0)}% Success Rate`;
  
  const body = `
Copernicus Marine Data Ingestion Alert
======================================

Status: ${summary.success_rate < 50 ? '🔴 CRITICAL' : '⚠️ WARNING'}

Summary:
- Total rectangles: ${summary.total_rectangles}
- Successful: ${summary.successful} (${summary.success_rate.toFixed(1)}%)
- Failed: ${summary.failed}
- Partial data: ${summary.partial}
- Duration: ${summary.duration_minutes} minutes

Top Errors:
${summary.errors.slice(0, 10).map(e => `  • ${e.rectangle}: ${e.error}`).join('\n')}

Warnings:
${summary.warnings.slice(0, 5).map(w => `  • ${w}`).join('\n')}

Action Required:
${summary.success_rate < 50 
  ? '🔴 URGENT: More than 50% of rectangles failed. Check Copernicus API status and credentials.'
  : summary.success_rate < 80
  ? '⚠️ HIGH: Significant failure rate. Review error patterns and consider retry.'
  : '⚠️ MODERATE: Some failures detected. Monitor for patterns.'}

View detailed logs: https://vercel.com/damians-projects-06bbadaa/wotnow/logs

Dashboard: https://wotnow.vercel.app/admin/copernicus-status
  `.trim();

  // Option 1: SendGrid (recommended)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: process.env.ALERT_EMAIL || 'damianrafferty@gmail.com' }],
            subject: subject,
          }],
          from: { 
            email: process.env.FROM_EMAIL || 'alerts@wotnow.app',
            name: 'WotNow Monitoring'
          },
          content: [{
            type: 'text/plain',
            value: body,
          }],
        }),
      });

      if (!response.ok) {
        console.error('Failed to send email via SendGrid:', await response.text());
      }
    } catch (error) {
      console.error('Error sending notification email:', error);
    }
  }

  // Option 2: Also log to Supabase for dashboard
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase.from('copernicus_ingestion_logs').insert({
      timestamp: new Date().toISOString(),
      success_rate: summary.success_rate,
      total_rectangles: summary.total_rectangles,
      successful: summary.successful,
      failed: summary.failed,
      duration_minutes: summary.duration_minutes,
      errors: summary.errors,
      warnings: summary.warnings,
      alert_sent: true,
    });
  }

  // Option 3: Slack webhook (if configured)
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: subject,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${subject}*\n\n` +
                    `Success Rate: *${summary.success_rate.toFixed(1)}%*\n` +
                    `Failed: ${summary.failed}/${summary.total_rectangles} rectangles\n` +
                    `Duration: ${summary.duration_minutes} minutes`,
            },
          },
        ],
      }),
    });
  }
}

/**
 * Get list of coastal rectangles that need regular updates
 */
async function getTargetRectangles(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get rectangles that have had successful ingestion before
  // or are marked as priority coastal areas
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code')
    .or('has_copernicus_coverage.eq.true,is_coastal.eq.true')
    .order('rectangle_code');

  if (error) throw error;

  return data.map(r => r.rectangle_code);
}

/**
 * Ingest data for a single rectangle
 * 
 * NOTE: This function spawns the ingestion script as a child process
 * since we can't easily import the script logic directly
 */
async function ingestRectangle(
  rectangleCode: string,
  targetDate: string
): Promise<IngestionResult> {
  
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      
      const child = spawn('npx', [
        'tsx',
        'scripts/ingestCopernicusBiogeochemical.ts',
        `--rectangle=${rectangleCode}`,
        `--date=${targetDate}`,
      ], {
        cwd: process.cwd(),
        env: process.env,
      });

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        // Parse output to count successful variables
        const successMarkers = (stdout.match(/✓/g) || []).length;
        const variablesRetrieved = successMarkers;

        let dataQuality: 'good' | 'partial' | 'poor' = 'poor';
        if (variablesRetrieved >= 5) dataQuality = 'good';
        else if (variablesRetrieved >= 3) dataQuality = 'partial';

        if (code === 0 && variablesRetrieved > 0) {
          resolve({
            rectangle_code: rectangleCode,
            success: true,
            variables_retrieved: variablesRetrieved,
            data_quality: dataQuality,
          });
        } else {
          // Extract error message from output
          const errorMatch = stderr.match(/Error: (.+)/);
          const error = errorMatch ? errorMatch[1] : 'Ingestion failed';
          
          resolve({
            rectangle_code: rectangleCode,
            success: false,
            error,
            variables_retrieved: variablesRetrieved,
            data_quality: dataQuality,
          });
        }
      });

      // Timeout after 5 minutes per rectangle
      setTimeout(() => {
        child.kill();
        resolve({
          rectangle_code: rectangleCode,
          success: false,
          error: 'Timeout after 5 minutes',
          variables_retrieved: 0,
          data_quality: 'poor',
        });
      }, 5 * 60 * 1000);
    });
    
  } catch (error) {
    return {
      rectangle_code: rectangleCode,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      variables_retrieved: 0,
      data_quality: 'poor',
    };
  }
}

/**
 * Main cron handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now();

  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 Starting Copernicus biogeochemical data ingestion...');

  try {
    // Calculate target date (yesterday - account for processing lag)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    const dateStr = targetDate.toISOString().split('T')[0];

    console.log(`📅 Target date: ${dateStr}`);

    // Get list of rectangles to process
    const rectangles = await getTargetRectangles();
    console.log(`📍 Processing ${rectangles.length} rectangles`);

    // Process rectangles in batches to avoid overwhelming the system
    const BATCH_SIZE = 10;
    const results: IngestionResult[] = [];
    
    for (let i = 0; i < rectangles.length; i += BATCH_SIZE) {
      const batch = rectangles.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rectangles.length / BATCH_SIZE)}`);
      
      const batchResults = await Promise.all(
        batch.map(rect => ingestRectangle(rect, dateStr))
      );
      
      results.push(...batchResults);
      
      // Update rectangle health in database after each batch
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        for (const result of batchResults) {
          await supabase.rpc('update_rectangle_health', {
            p_rectangle_code: result.rectangle_code,
            p_success: result.success,
            p_variables_retrieved: result.variables_retrieved,
            p_data_quality: result.data_quality,
          });
        }
      }
      
      // Progress update
      const successCount = results.filter(r => r.success).length;
      console.log(`Progress: ${results.length}/${rectangles.length} (${successCount} successful)`);
      
      // Small delay between batches to be nice to Copernicus
      if (i + BATCH_SIZE < rectangles.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const partial = results.filter(r => r.success && r.data_quality === 'partial').length;
    const successRate = (successful / results.length) * 100;
    const durationMinutes = Math.round((Date.now() - startTime) / 60000);

    const summary: IngestionSummary = {
      total_rectangles: results.length,
      successful,
      failed,
      partial,
      success_rate: successRate,
      duration_minutes: durationMinutes,
      errors: results
        .filter(r => !r.success && r.error)
        .map(r => ({ rectangle: r.rectangle_code, error: r.error! })),
      warnings: results
        .filter(r => r.data_quality === 'partial')
        .map(r => `${r.rectangle_code}: Only ${r.variables_retrieved}/6 variables retrieved`),
    };

    console.log('\n✅ Ingestion complete!');
    console.log(`Success rate: ${successRate.toFixed(1)}% (${successful}/${results.length})`);
    console.log(`Duration: ${durationMinutes} minutes`);

    // Send notification if failure rate exceeds threshold
    if (successRate < 80) {
      console.log('⚠️ Success rate below 80% - sending failure notification');
      await sendFailureNotification(summary);
    }

    // Log to database for monitoring dashboard
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      await supabase.from('copernicus_ingestion_logs').insert({
        timestamp: new Date().toISOString(),
        target_date: dateStr,
        success_rate: successRate,
        total_rectangles: results.length,
        successful,
        failed,
        partial,
        duration_minutes: durationMinutes,
        errors: summary.errors.slice(0, 50), // Limit stored errors
        warnings: summary.warnings.slice(0, 50),
      });
    }

    return res.status(200).json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Fatal error in cron job:', error);

    // Send critical failure notification
    await sendFailureNotification({
      total_rectangles: 0,
      successful: 0,
      failed: 0,
      partial: 0,
      success_rate: 0,
      duration_minutes: Math.round((Date.now() - startTime) / 60000),
      errors: [{ rectangle: 'SYSTEM', error: error instanceof Error ? error.message : String(error) }],
      warnings: ['🔴 CRITICAL: Cron job failed to complete'],
    });

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
