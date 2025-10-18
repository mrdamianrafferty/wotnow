#!/usr/bin/env tsx
/**
 * Wrapper for targeted-reingest.ts with 28E5 as default
 */
import { execSync } from 'child_process';

const args = process.argv.slice(2);
if (!args.some(arg => arg.startsWith('--rectangle='))) {
  args.push('--rectangle=28E5');
}

execSync(`npx tsx ./scripts/targeted-reingest.ts ${args.join(' ')}`, { stdio: 'inherit' });
