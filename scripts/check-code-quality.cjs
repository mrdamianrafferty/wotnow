#!/usr/bin/env node
/**
 * Code Quality Checks for Hugging Face Fish Service
 * Checks for common issues and best practices
 */

const fs = require('fs');
const path = require('path');

function checkFile(filepath) {
  console.log(`\n📄 Checking: ${filepath}`);
  const code = fs.readFileSync(filepath, 'utf8');
  const issues = [];
  const warnings = [];

  // Check 1: Proper error handling
  const tryBlocks = (code.match(/try\s*{/g) || []).length;
  const catchBlocks = (code.match(/catch\s*\(/g) || []).length;
  if (tryBlocks === catchBlocks) {
    console.log(`✅ Error handling: ${tryBlocks} try/catch blocks`);
  } else {
    warnings.push(`Mismatched try/catch blocks: ${tryBlocks} tries, ${catchBlocks} catches`);
  }

  // Check 2: Async function handling
  const asyncFunctions = (code.match(/async\s+\w+/g) || []).length;
  console.log(`✅ Async functions: ${asyncFunctions}`);

  // Check 3: Type annotations (interfaces/types)
  const interfaces = (code.match(/interface\s+\w+/g) || []).length;
  const types = (code.match(/type\s+\w+\s*=/g) || []).length;
  console.log(`✅ Type definitions: ${interfaces} interfaces, ${types} types`);

  // Check 4: Imports
  const imports = code.match(/^import\s+.*from\s+['"].*['"]/gm) || [];
  console.log(`✅ Imports: ${imports.length}`);

  // Check 5: Exports
  const exports = (code.match(/^export\s+(class|function|const|interface)/gm) || []).length;
  console.log(`✅ Exports: ${exports}`);

  // Check 6: Comments/documentation
  const docComments = (code.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
  console.log(`✅ Documentation comments: ${docComments}`);

  // Check 7: TODO/FIXME markers
  const todos = code.match(/\/\/\s*(TODO|FIXME|XXX|HACK)/gi) || [];
  if (todos.length > 0) {
    warnings.push(`Found ${todos.length} TODO/FIXME markers`);
  }

  // Check 8: Console.log usage (should use logger)
  const consoleLogs = (code.match(/console\.(log|error|warn)/g) || []).length;
  const loggerUsage = code.includes('logger') || code.includes('createLogger');
  if (consoleLogs > 0 && !loggerUsage) {
    warnings.push(`Found ${consoleLogs} console.log statements without logger`);
  }

  // Check 9: Line length (soft check)
  const lines = code.split('\n');
  const longLines = lines.filter(line => line.length > 120).length;
  if (longLines > 10) {
    warnings.push(`${longLines} lines exceed 120 characters`);
  }

  // Check 10: Empty catch blocks
  const emptyCatches = (code.match(/catch\s*\([^)]*\)\s*{\s*}/g) || []).length;
  if (emptyCatches > 0) {
    issues.push(`${emptyCatches} empty catch blocks found`);
  }

  // Summary
  if (issues.length > 0) {
    console.log('\n❌ Issues:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n✅ All checks passed!');
  }

  return { issues, warnings };
}

// Check all our new files
const filesToCheck = [
  'lib/findr/huggingfaceFishService.ts',
  'pages/api/findr/identify-fish-hf.ts',
];

console.log('🔍 Running code quality checks...\n');
console.log('=' .repeat(60));

let totalIssues = 0;
let totalWarnings = 0;

filesToCheck.forEach(filepath => {
  if (fs.existsSync(filepath)) {
    const { issues, warnings } = checkFile(filepath);
    totalIssues += issues.length;
    totalWarnings += warnings.length;
  } else {
    console.log(`\n⚠️  File not found: ${filepath}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:');
console.log(`   Total issues: ${totalIssues}`);
console.log(`   Total warnings: ${totalWarnings}`);

if (totalIssues === 0) {
  console.log('\n✅ All code quality checks passed!');
  process.exit(0);
} else {
  console.log('\n❌ Code quality issues found. Please review.');
  process.exit(1);
}
