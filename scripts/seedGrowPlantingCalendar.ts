#!/usr/bin/env tsx
import { seedPlantingCalendar } from '../lib/grow/plantingCalendarSeeder';

interface CliOptions {
  sourceUrl?: string;
  dryRun?: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--source=')) {
      options.sourceUrl = arg.slice('--source='.length);
      continue;
    }
  }

  return options;
}

async function main() {
  const { dryRun, sourceUrl } = parseArgs(process.argv.slice(2));

  const result = await seedPlantingCalendar({
    dryRun,
    sourceUrl,
  });

  console.info('Planting calendar seed summary:', JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('seedGrowPlantingCalendar.ts')) {
  main().catch((error) => {
    console.error('Failed to seed planting calendar', error);
    process.exit(1);
  });
}
