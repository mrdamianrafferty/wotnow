#!/usr/bin/env tsx

/**
 * Diagnose Copernicus Cron Job Issues
 * 
 * Checks:
 * 1. GitHub Secrets are configured
 * 2. Workflow file exists and is valid
 * 3. Database table exists and is accessible
 * 4. Recent workflow runs and their status
 * 5. Data freshness in findr_conditions_snapshots
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function diagnose() {
  console.log('🔍 Diagnosing Copernicus Cron Job...\n');
  
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // 1. Check environment variables
  console.log('1️⃣  Environment Variables:');
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasCopernicusUser = !!process.env.COPERNICUS_USERNAME;
  const hasCopernicusPass = !!process.env.COPERNICUS_PASSWORD;
  
  console.log(`   SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '❌ MISSING'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${hasServiceKey ? '✅' : '❌ MISSING'}`);
  console.log(`   COPERNICUS_USERNAME: ${hasCopernicusUser ? '✅' : '⚠️  MISSING (will use mock data)'}`);
  console.log(`   COPERNICUS_PASSWORD: ${hasCopernicusPass ? '✅' : '⚠️  MISSING (will use mock data)'}`);
  
  if (!hasSupabaseUrl || !hasServiceKey) {
    issues.push('Missing Supabase credentials - cron cannot write to database');
  }
  
  if (!hasCopernicusUser || !hasCopernicusPass) {
    warnings.push('Missing Copernicus credentials - using mock data instead of real API');
  }
  
  // 2. Check workflow file
  console.log('\n2️⃣  GitHub Workflow:');
  const workflowPath = path.join(process.cwd(), '.github/workflows/findr-copernicus-ingest.yml');
  const workflowExists = fs.existsSync(workflowPath);
  console.log(`   Workflow file exists: ${workflowExists ? '✅' : '❌'}`);
  
  if (workflowExists) {
    const workflow = fs.readFileSync(workflowPath, 'utf-8');
    const hasSchedule = workflow.includes('schedule:');
    const hasCron = workflow.includes("cron: '0 3 * * *'");
    const hasScript = workflow.includes('ingest-copernicus-data.ts');
    
    console.log(`   Has schedule trigger: ${hasSchedule ? '✅' : '❌'}`);
    console.log(`   Runs at 3 AM UTC: ${hasCron ? '✅' : '⚠️'}`);
    console.log(`   Calls ingest script: ${hasScript ? '✅' : '❌'}`);
    
    if (!hasSchedule || !hasScript) {
      issues.push('Workflow configuration is incomplete');
    }
  } else {
    issues.push('Workflow file missing at .github/workflows/findr-copernicus-ingest.yml');
  }
  
  // 3. Check ingestion script
  console.log('\n3️⃣  Ingestion Script:');
  const scriptPath = path.join(process.cwd(), 'scripts/ingest-copernicus-data.ts');
  const scriptExists = fs.existsSync(scriptPath);
  console.log(`   Script exists: ${scriptExists ? '✅' : '❌'}`);
  
  if (!scriptExists) {
    issues.push('Ingestion script missing at scripts/ingest-copernicus-data.ts');
  }
  
  // 4. Check database table
  console.log('\n4️⃣  Database Table:');
  const { count, error: countError } = await supabase
    .from('findr_conditions_snapshots')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.log(`   Table accessible: ❌ Error: ${countError.message}`);
    issues.push(`Cannot access findr_conditions_snapshots: ${countError.message}`);
  } else {
    console.log(`   Table accessible: ✅`);
    console.log(`   Total records: ${count || 0}`);
    
    if (!count || count === 0) {
      issues.push('Table is EMPTY - no data has been ingested yet');
    }
    
    // Check data freshness
    if (count && count > 0) {
      const { data: latest } = await supabase
        .from('findr_conditions_snapshots')
        .select('captured_at, rectangle_code')
        .order('captured_at', { ascending: false })
        .limit(1)
        .single();
        
      if (latest) {
        const hoursSince = (Date.now() - new Date(latest.captured_at).getTime()) / (1000 * 60 * 60);
        console.log(`   Latest data: ${latest.captured_at} (${hoursSince.toFixed(1)} hours ago)`);
        console.log(`   Latest rectangle: ${latest.rectangle_code}`);
        
        if (hoursSince > 48) {
          warnings.push(`Data is ${hoursSince.toFixed(0)} hours old - may be stale`);
        }
      }
    }
  }
  
  // 5. Check GitHub Actions status (requires GitHub CLI)
  console.log('\n5️⃣  GitHub Actions:');
  console.log(`   Manual check required:`);
  console.log(`   → https://github.com/mrdamianrafferty/wotnow/actions/workflows/findr-copernicus-ingest.yml`);
  console.log(`   `);
  console.log(`   Look for:`);
  console.log(`   - Recent runs (should be daily at 3 AM UTC)`);
  console.log(`   - Success/failure status`);
  console.log(`   - Error messages in logs`);
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    DIAGNOSIS SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  if (issues.length === 0) {
    console.log('✅ No critical issues found\n');
  } else {
    console.log(`❌ Found ${issues.length} critical issue(s):\n`);
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warning(s):\n`);
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
    console.log();
  }
  
  // Recommendations
  console.log('💡 Recommendations:\n');
  
  if (issues.some(i => i.includes('EMPTY'))) {
    console.log('   1. Run ingestion manually to populate initial data:');
    console.log('      npx tsx scripts/ingest-copernicus-data.ts\n');
  }
  
  if (warnings.some(w => w.includes('mock data'))) {
    console.log('   2. Add Copernicus credentials to GitHub Secrets:');
    console.log('      - COPERNICUS_USERNAME');
    console.log('      - COPERNICUS_PASSWORD');
    console.log('      Get credentials at: https://data.marine.copernicus.eu\n');
  }
  
  console.log('   3. Manually trigger workflow to test:');
  console.log('      → GitHub Actions → "FINDR Copernicus ingestion" → "Run workflow"\n');
  
  console.log('   4. Enable workflow notifications:');
  console.log('      → GitHub Settings → Notifications → Actions → Enable email alerts\n');
  
  // Exit with error if critical issues found
  if (issues.length > 0) {
    process.exit(1);
  }
}

diagnose().catch(err => {
  console.error('❌ Diagnosis failed:', err.message);
  process.exit(1);
});
