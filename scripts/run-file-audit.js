#!/usr/bin/env node

/**
 * File Audit Runner
 * 
 * This script runs a file audit based on the configuration in yml/file_audit.yml
 * It generates a report of files that are safe to delete, possibly unused, or definitely used.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml');
const crypto = require('crypto');
const glob = require('glob');

// Set up paths
const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'yml', 'file_audit.yml');
const outputDir = path.join(repoRoot, '.audit');
const outputFilePath = path.join(repoRoot, 'file_audit.yml');

console.log('🔍 Starting file audit...');
console.log(`📂 Repository root: ${repoRoot}`);
console.log(`📝 Config file: ${configPath}`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created output directory: ${outputDir}`);
}

// Read and parse config
let config;
try {
  const configContent = fs.readFileSync(configPath, 'utf8');
  config = yaml.parse(configContent);
  console.log('✅ Config loaded successfully');
} catch (error) {
  console.error(`❌ Error loading config: ${error.message}`);
  process.exit(1);
}

// List all Git-tracked files
console.log('📊 Enumerating Git-tracked files...');
let trackedFiles = [];
try {
  const gitLsOutput = execSync('git ls-files', { cwd: repoRoot }).toString();
  trackedFiles = gitLsOutput.split('\n').filter(Boolean);
  console.log(`✅ Found ${trackedFiles.length} Git-tracked files`);
  
  // Write to temp file for later steps
  fs.writeFileSync(path.join(outputDir, 'all_files.txt'), trackedFiles.join('\n'));
} catch (error) {
  console.error(`❌ Error listing Git files: ${error.message}`);
  process.exit(1);
}

// Filter files based on include_extensions and ignore_globs
const includeExtensions = config.config.include_extensions || [];
const ignoreGlobs = config.config.ignore_globs || [];

console.log('🔍 Filtering files based on include_extensions and ignore_globs...');
const filteredFiles = trackedFiles.filter(file => {
  const ext = path.extname(file);
  
  // Check if file extension is in include_extensions
  const isIncludedExt = includeExtensions.includes(ext);
  
  // Check if file matches any ignore glob
  const isIgnored = ignoreGlobs.some(pattern => {
    // Simple glob matching (asterisk only)
    if (pattern.includes('**')) {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.');
      return new RegExp(`^${regexPattern}$`).test(file);
    }
    return false;
  });
  
  return isIncludedExt && !isIgnored;
});

console.log(`✅ Filtered down to ${filteredFiles.length} relevant files`);
fs.writeFileSync(path.join(outputDir, 'filtered_files.txt'), filteredFiles.join('\n'));

// Generate a basic report
console.log('📝 Generating report...');
const report = {
  summary: {
    generated_at: new Date().toISOString(),
    repo: repoRoot,
    totals: {
      files_scanned: filteredFiles.length,
      definitely_used: 0,
      possibly_unused_or_duplicate: 0,
      safe_to_delete: 0,
    }
  },
  files: []
};

// Simple file classification (just a placeholder - would need more logic for full implementation)
for (const file of filteredFiles) {
  const filePath = path.join(repoRoot, file);
  const stats = fs.statSync(filePath);
  const ext = path.extname(file);
  
  // Calculate hash for text files
  let hash = null;
  if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md', '.yml', '.yaml'].includes(ext)) {
    const content = fs.readFileSync(filePath, 'utf8');
    hash = crypto.createHash('sha256').update(content).digest('hex');
  }
  
  // Get last modified date
  const lastModified = stats.mtime;
  const daysSinceLastModified = Math.floor((Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
  
  // Simple classification
  const isEntrypoint = config.config.entrypoints.includes(file);
  const matchesSuspectPattern = config.config.suspect_name_patterns.some(pattern => {
    if (pattern.includes('**')) {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.');
      return new RegExp(`^${regexPattern}$`).test(file);
    }
    return false;
  });
  
  // Determine classification (very simplistic)
  let classification;
  if (isEntrypoint) {
    classification = 'definitely_used';
    report.summary.totals.definitely_used++;
  } else if (matchesSuspectPattern || daysSinceLastModified > 90) {
    classification = 'possibly_unused_or_duplicate';
    report.summary.totals.possibly_unused_or_duplicate++;
  } else {
    classification = 'safe_to_delete';
    report.summary.totals.safe_to_delete++;
  }
  
  // Add to report
  report.files.push({
    path: file,
    extension: ext,
    size_bytes: stats.size,
    git: {
      last_modified: lastModified.toISOString(),
      days_since_last_modified: daysSinceLastModified,
    },
    duplication: {
      hash: hash,
    },
    classification: {
      bucket: classification,
      rationale: isEntrypoint ? 'Is an entrypoint' : 
                 matchesSuspectPattern ? 'Matches suspect pattern' : 
                 daysSinceLastModified > 90 ? 'Not modified in 90+ days' : 'Default classification',
    },
    recommended_action: {
      action: classification === 'safe_to_delete' ? 'delete_candidate' : 
              classification === 'possibly_unused_or_duplicate' ? 'review' : 'keep',
    }
  });
}

// Write the report
fs.writeFileSync(outputFilePath, yaml.stringify(report));
console.log(`✅ Report generated: ${outputFilePath}`);
console.log('');
console.log('📊 Summary:');
console.log(`   - Files scanned: ${report.summary.totals.files_scanned}`);
console.log(`   - Definitely used: ${report.summary.totals.definitely_used}`);
console.log(`   - Possibly unused or duplicate: ${report.summary.totals.possibly_unused_or_duplicate}`);
console.log(`   - Safe to delete: ${report.summary.totals.safe_to_delete}`);
console.log('');
console.log('⚠️  Note: This is a basic implementation and may not accurately identify all unused files.');
console.log('    Please review the report carefully before taking any action.');
