import fs from 'node:fs/promises';
import path from 'node:path';

export type AstroNight = {
  date: string;
  sun?: { astro_dark_start?: string; astro_dark_end?: string };
  moon?: { phase?: string; illumination?: number; events?: { time: string; event: 'rise'|'set' }[] };
  dark_sky?: number | null;
  cloud_score?: number | null;
};
export type AstroHighlights = { nights: AstroNight[]; eclipses?: any[] };

const HIGHLIGHTS_PATH = path.join(
  process.cwd(),
  'services',
  'astro_highlights',
  'astro_highlights',
  'highlights.json'
);

export async function getAstroHighlights(): Promise<AstroHighlights> {
  const raw = await fs.readFile(HIGHLIGHTS_PATH, 'utf-8');
  return JSON.parse(raw);
}
