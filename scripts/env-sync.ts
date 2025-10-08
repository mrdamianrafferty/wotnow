#!/usr/bin/env tsx
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

interface EnvMap {
  [key: string]: string;
}

function resolvePath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(process.cwd(), p);
}

async function readEnvFile(filePath: string): Promise<EnvMap> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function serializeEnv(env: EnvMap): string {
  const lines = Object.keys(env)
    .sort()
    .map((key) => `${key}=${env[key]}`);
  return `${lines.join('\n')}\n`;
}

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const fromArg = getArgValue('--from') ?? '.env.local';
  const toArg = getArgValue('--to') ?? '.env.cli';
  const includeAll = process.argv.includes('--all');

  const fromPath = resolvePath(fromArg);
  const toPath = resolvePath(toArg);

  const sourceEnv = await readEnvFile(fromPath);
  const targetEnv = await readEnvFile(toPath);

  if (Object.keys(sourceEnv).length === 0) {
    throw new Error(`Source env file '${fromArg}' is missing or empty.`);
  }

  const preferredKeys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'MOON_API_KEY',
    'N2YO_API_KEY',
    'NODE_ENV',
  ];

  const keysToSync = includeAll
    ? Object.keys(sourceEnv)
    : Array.from(new Set([...preferredKeys]));

  const missingKeys: string[] = [];
  const updatedEnv: EnvMap = { ...targetEnv };

  for (const key of keysToSync) {
    const value = sourceEnv[key];
    if (value == null) {
      missingKeys.push(key);
      continue;
    }
    updatedEnv[key] = value;
  }

  await fs.writeFile(toPath, serializeEnv(updatedEnv), 'utf8');

  console.log(`Env sync complete: '${fromArg}' -> '${toArg}' (${keysToSync.length - missingKeys.length}/${keysToSync.length} keys copied).`);

  if (missingKeys.length > 0) {
    console.warn('Skipped keys missing from source:', missingKeys.join(', '));
  }
}

main().catch((error) => {
  console.error('[env-sync] Failed to sync environment files:', error);
  process.exitCode = 1;
});