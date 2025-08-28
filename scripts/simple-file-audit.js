/**
 * Simple file audit script
 * This script finds potentially unused files in the project by checking:
 * 1. When they were last modified (git)
 * 2. If they match common test/temporary file patterns
 * 3. Checking for imports (very basic implementation)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'unused_files_report.md');

// File patterns to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /out/,
  /dist/,
  /build/,
  /\.vercel/,
  /\.turbo/,
  /\.cache/,
  /coverage/,
  /\.DS_Store/,
  /\.map$/,
  /\.snap$/,
  /\.log$/,
  /\.tmp$/
];

// Extensions to include
const INCLUDE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json', 
  '.css', '.scss', '.md', '.yml', '.yaml',
  '.svg', '.png', '.jpg', '.jpeg', '.gif'
];

// Patterns that suggest test/temporary files
const SUSPECT_PATTERNS = [
  /copilot/i,
  /draft/i,
  /try/i,
  /scratch/i,
  /playground/i,
  /temp/i,
  /test/i,
  /\.spec\./,
  /\.test\./,
  /__tests__/,
  /__mocks__/
];

// Get all git-tracked files
function getGitTrackedFiles() {
  try {
    const output = execSync('git ls-files', { cwd: ROOT_DIR }).toString();
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error(`Error getting git tracked files: ${error.message}`);
    return [];
  }
}

// Filter files based on patterns and extensions
function filterFiles(files) {
  return files.filter(file => {
    // Check if file should be ignored
    if (IGNORE_PATTERNS.some(pattern => pattern.test(file))) {
      return false;
    }
    
    // Check if file extension should be included
    const ext = path.extname(file);
    return INCLUDE_EXTENSIONS.includes(ext);
  });
}

// Get last modified date from git
function getLastModifiedDate(file) {
  try {
    const output = execSync(`git log -1 --format=%cd -- "${file}"`, { 
      cwd: ROOT_DIR 
    }).toString().trim();
    return new Date(output);
  } catch (error) {
    return new Date(0); // Default to epoch if error
  }
}

// Check if file matches suspect patterns
function matchesSuspectPattern(file) {
  return SUSPECT_PATTERNS.some(pattern => pattern.test(file));
}

// Simple function to check if a file is imported by others (very basic implementation)
function getImportCount(file, allFiles) {
  const basename = path.basename(file);
  const relPath = file.replace(/\\/g, '/'); // Normalize path
  
  let count = 0;
  
  for (const otherFile of allFiles) {
    if (otherFile === file) continue;
    
    // Only check JS/TS files for imports
    const ext = path.extname(otherFile);
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) continue;
    
    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, otherFile), 'utf8');
      
      // Very basic import detection (would need a proper parser for accuracy)
      if (content.includes(`from './${basename}'`) || 
          content.includes(`from "${basename}"`) || 
          content.includes(`from './${relPath}'`) || 
          content.includes(`from "${relPath}"`)) {
        count++;
      }
    } catch (error) {
      // Ignore read errors
    }
  }
  
  return count;
}

// Classify files
function classifyFiles(filteredFiles) {
  const classifications = {
    definitely_used: [],
    possibly_unused: [],
    safe_to_delete: []
  };
  
  for (const file of filteredFiles) {
    const lastModified = getLastModifiedDate(file);
    const daysSinceModified = Math.floor((Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
    const isSuspect = matchesSuspectPattern(file);
    const importCount = getImportCount(file, filteredFiles);
    
    // Classification logic
    if (importCount > 0 || daysSinceModified < 30) {
      classifications.definitely_used.push({ 
        file, 
        lastModified, 
        daysSinceModified, 
        importCount, 
        isSuspect 
      });
    } else if (isSuspect || daysSinceModified > 90) {
      classifications.safe_to_delete.push({ 
        file, 
        lastModified, 
        daysSinceModified, 
        importCount, 
        isSuspect 
      });
    } else {
      classifications.possibly_unused.push({ 
        file, 
        lastModified, 
        daysSinceModified, 
        importCount, 
        isSuspect 
      });
    }
  }
  
  return classifications;
}

// Generate markdown report
function generateReport(classifications) {
  const { definitely_used, possibly_unused, safe_to_delete } = classifications;
  
  const report = [
    '# File Audit Report',
    `Generated on: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `- **Total files analyzed**: ${definitely_used.length + possibly_unused.length + safe_to_delete.length}`,
    `- **Definitely used**: ${definitely_used.length}`,
    `- **Possibly unused**: ${possibly_unused.length}`,
    `- **Safe to delete**: ${safe_to_delete.length}`,
    '',
    '## Files Safe to Delete',
    'These files are likely safe to delete based on the analysis:',
    '',
  ];
  
  safe_to_delete.forEach(({ file, daysSinceModified, isSuspect }) => {
    const reason = isSuspect ? 'Matches test/temporary pattern' : `Not modified in ${daysSinceModified} days`;
    report.push(`- \`${file}\` - ${reason}`);
  });
  
  report.push('', '## Possibly Unused Files', 'These files might be unused, but require further investigation:', '');
  
  possibly_unused.forEach(({ file, daysSinceModified }) => {
    report.push(`- \`${file}\` - Not modified in ${daysSinceModified} days`);
  });
  
  report.push('', '## Review Checklist', '');
  report.push(
    '- Search usages in IDE (global find, symbol references) for files marked "safe to delete".',
    '- Run full type-check and tests after quarantining deletions.',
    '- Run production build; verify no new warnings/errors.',
    '- If image/font asset: confirm no CSS/url() or <Image/> refs missed.',
    '- If config/schema file: verify no runtime `require()` or env-driven paths load it.',
    '- If route/page/layout: confirm no dynamic routing expects it.'
  );
  
  return report.join('\n');
}

// Main function
function main() {
  console.log('Starting file audit...');
  
  // Get all git tracked files
  const allFiles = getGitTrackedFiles();
  console.log(`Found ${allFiles.length} git-tracked files`);
  
  // Filter files
  const filteredFiles = filterFiles(allFiles);
  console.log(`Filtered to ${filteredFiles.length} relevant files`);
  
  // Classify files
  console.log('Classifying files...');
  const classifications = classifyFiles(filteredFiles);
  
  // Generate report
  console.log('Generating report...');
  const report = generateReport(classifications);
  
  // Write report
  fs.writeFileSync(OUTPUT_FILE, report);
  console.log(`Report written to ${OUTPUT_FILE}`);
  
  return {
    definitely_used: classifications.definitely_used.length,
    possibly_unused: classifications.possibly_unused.length,
    safe_to_delete: classifications.safe_to_delete.length
  };
}

// Run the script
const results = main();
console.log('File audit complete!');
console.log(`Summary: ${results.definitely_used} used, ${results.possibly_unused} possibly unused, ${results.safe_to_delete} safe to delete`);
