import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sprout, Shovel, Scissors, Wheat, MapPin } from 'lucide-react';
import { ThreatCard } from '@/components/grow/ThreatCard';
import { GrowLayout } from '@/components/grow/GrowLayout';
import { TranslatedText } from '@/components/translation/TranslatedFishCard';

import { getPlantImage, PLANT_IMAGE_MAP } from '@/lib/grow/plantImages';
import type { PlantSpecies } from '@/lib/grow/species';
import { api } from '@/lib/grow/api';

type PlantingWindow = {
  plantSlug: string;
  plantName: string;
  taskCode: string;
  taskName: string;
  taskType: string;
  startMonth?: number;
  startWeek: number;
  endMonth?: number;
  endWeek: number;
  // optional metadata
  category?: string | null;
  confidence?: number;
};

type TimingKind = 'sowing' | 'planting' | 'pruning' | 'harvest' | 'other';

function classifyTimingKind(w: PlantingWindow): TimingKind {
  const code = (w.taskCode ?? '').toLowerCase();
  const name = (w.taskName ?? '').toLowerCase();
  const hay = `${code} ${name}`;

  if (/(prun|prune|winter_prune|summer_prune)/.test(hay)) return 'pruning';
  if (/(harvest|pick|picking)/.test(hay)) return 'harvest';
  if (/(transplant|plant_out|planting|plant out|set out|move out)/.test(hay)) return 'planting';
  if (/(sow|sowing|seed|direct_sow|start_indoors|start indoors)/.test(hay)) return 'sowing';
  return 'other';
}

function TimingIcon({ kind }: { kind: TimingKind }) {
  const common = { className: 'h-4 w-4 text-muted-foreground' };
  if (kind === 'sowing') return <Sprout {...common} />;
  if (kind === 'planting') return <Shovel {...common} />;
  if (kind === 'pruning') return <Scissors {...common} />;
  if (kind === 'harvest') return <Wheat {...common} />;
  return null;
}

type ThreatRiskBand = 'none' | 'low' | 'moderate' | 'high' | 'severe';

type ThreatAssessment = {
  threatId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  threatType: string;
  severityDefault: number;
  score: number;
  band: ThreatRiskBand;
  matchedHosts: Array<{ kind: string; key: string; strength: number }>;
  matchedRules: Array<{ ruleId: string; title: string; score: number }>;
  reasons: string[];
  cardJson: Record<string, unknown>;
};

type GardenTask = {
  id?: string;
  taskId?: string;
  title?: string;
  description?: string;
  taskType?: string;
  plantSlugs?: string[];
  speciesSlugs?: string[];
  category?: string;
  scheduledFor?: string;
  startDate?: string;
  endDate?: string;
};

type MyTask = {
  taskId: string;
  plantSlug?: string | null;
  status?: string | null;
};

function extractArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const maybeTasks = (value as { tasks?: unknown }).tasks;
    if (Array.isArray(maybeTasks)) return maybeTasks;
    const maybeData = (value as { data?: unknown }).data;
    if (Array.isArray(maybeData)) return maybeData;
  }
  return [];
}

function normalizeMyTasks(payload: unknown): MyTask[] {
  const rows = extractArray(payload);
  return rows
    .map((r) => {
      if (!r || typeof r !== 'object') return null;
      const o = r as Record<string, unknown>;
      const taskIdRaw = o.taskId ?? o.task_id ?? o.id;
      const taskId = taskIdRaw != null ? String(taskIdRaw) : '';
      if (!taskId) return null;
      const plantSlugRaw = o.plantSlug ?? o.plant_slug;
      const plantSlug = plantSlugRaw != null ? String(plantSlugRaw) : null;
      const statusRaw = o.status;
      const status = statusRaw != null ? String(statusRaw) : null;
      return { taskId, plantSlug, status } as MyTask;
    })
    .filter((v): v is MyTask => Boolean(v));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pickBestPlantImageKeyFromSpecies(species: PlantSpecies | null): string | null {
  if (!species) return null;
  if (species.imageKey && PLANT_IMAGE_MAP[species.imageKey]) return species.imageKey;
  // Fallback: try slug, name, scientificName
  const candidates = [species.slug, species.name, species.scientificName ?? '']
    .map((c) => (c ? slugify(c) : ''))
    .filter(Boolean);

  for (const c of candidates) {
    if (PLANT_IMAGE_MAP[c]) return c;
    const prefix = `${c}-`;
    const hit = Object.keys(PLANT_IMAGE_MAP).find((k) => k.startsWith(prefix));
    if (hit) return hit;
  }

  return null;
}

function formatUsdaRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `USDA ${min}–${max}`;
  if (min != null) return `USDA ≥ ${min}`;
  return `USDA ≤ ${max}`;
}

function monthNumberToLabel(month: number | null | undefined): string {
  if (typeof month !== 'number' || Number.isNaN(month)) return '';
  const idx = Math.max(0, Math.min(11, Math.floor(month) - 1));
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx] ?? '';
}

function deriveMonthLabelFromWeekOfYear(weekOfYear0: number): string {
  const clamped = Math.max(0, Math.min(51, Math.floor(weekOfYear0)));
  const monthIndex = Math.max(0, Math.min(11, Math.floor((clamped / 52) * 12)));
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIndex] ?? '';
}

function windowStartLabel(w: PlantingWindow): string {
  if (typeof w.startMonth === 'number') return monthNumberToLabel(w.startMonth);
  // Fallback for payloads that only provide week-of-year
  return deriveMonthLabelFromWeekOfYear(w.startWeek);
}

function windowEndLabel(w: PlantingWindow): string {
  if (typeof w.endMonth === 'number') return monthNumberToLabel(w.endMonth);
  return deriveMonthLabelFromWeekOfYear(w.endWeek);
}

function getCurrentMonthIndex(): number {
  return new Date().getMonth();
}

function monthIndexToLabel(monthIndex: number): string {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIndex] ?? '';
}

function monthRangeOverlaps(startMonth: number | null | undefined, endMonth: number | null | undefined, monthIndex0: number): boolean {
  if (typeof startMonth !== 'number' || typeof endMonth !== 'number') return false;
  const s = Math.max(1, Math.min(12, startMonth));
  const e = Math.max(1, Math.min(12, endMonth));
  const m = monthIndex0 + 1;
  if (s <= e) return s <= m && m <= e;
  // Wrapped range (e.g., Nov -> Feb)
  return m >= s || m <= e;
}

function monthIndexHasWindow(windows: PlantingWindow[], monthIndex0: number): boolean {
  // Prefer exact month-based overlap.
  if (windows.some((w) => typeof w.startMonth === 'number' && typeof w.endMonth === 'number')) {
    return windows.some((w) => monthRangeOverlaps(w.startMonth, w.endMonth, monthIndex0));
  }
  // Fallback: approximate from week-of-year if month fields are absent.
  const label = monthIndexToLabel(monthIndex0);
  return windows.some((w) => {
    const start = deriveMonthLabelFromWeekOfYear(w.startWeek);
    const end = deriveMonthLabelFromWeekOfYear(w.endWeek);
    // Simple heuristic: if either boundary hits this month, count it.
    return start === label || end === label;
  });
}

function nextActionableWindows(all: PlantingWindow[], nowMonthIndex0: number): PlantingWindow[] {
  const nowMonth = nowMonthIndex0 + 1;
  const distance = (m: number) => {
    const d = (m - nowMonth + 12) % 12;
    return d;
  };

  const score = (w: PlantingWindow) => {
    const s = w.startMonth;
    const e = w.endMonth;
    if (typeof s === 'number' && typeof e === 'number') {
      if (monthRangeOverlaps(s, e, nowMonthIndex0)) return 0;
      return distance(Math.max(1, Math.min(12, s)));
    }
    // Fallback: if we only have week-of-year, approximate by boundary months.
    const startLabel = deriveMonthLabelFromWeekOfYear(w.startWeek);
    const endLabel = deriveMonthLabelFromWeekOfYear(w.endWeek);
    const nowLabel = monthIndexToLabel(nowMonthIndex0);
    if (startLabel === nowLabel || endLabel === nowLabel) return 0;
    return 50;
  };

  return [...all]
    .sort((a, b) => score(a) - score(b))
    .slice(0, 6);
}

export default function GrowSpeciesPage() {
  const router = useRouter();
  const slugParam = router.query.slug;
  const slug = typeof slugParam === 'string' ? slugParam : '';

  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const [species, setSpecies] = useState<PlantSpecies | null>(null);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
  
  // Wikipedia fallback for species without descriptions
  const [wikiSummary, setWikiSummary] = useState<{
    extract: string;
    pageUrl: string;
    attribution: string;
    language: string;
  } | null>(null);
  const [isLoadingWiki, setIsLoadingWiki] = useState(false);

  const [windows, setWindows] = useState<PlantingWindow[] | null>(null);
  const [isLoadingWindows, setIsLoadingWindows] = useState(false);

  const [threats, setThreats] = useState<ThreatAssessment[] | null>(null);
  const [isLoadingThreats, setIsLoadingThreats] = useState(false);

  const [tasks, setTasks] = useState<GardenTask[] | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isAddingTaskId, setIsAddingTaskId] = useState<string | null>(null);

  const [myTasks, setMyTasks] = useState<MyTask[] | null>(null);
  const [isLoadingMyTasks, setIsLoadingMyTasks] = useState(false);
  const [recentlyAddedTaskIds, setRecentlyAddedTaskIds] = useState<Set<string>>(new Set());

  const [isHeroOpen, setIsHeroOpen] = useState(false);

  // Attempt to personalize by default:
  // - If user has a saved profile location/zone, api calls should use it internally.
  // - As an MVP, we call existing APIs without requiring extra query params.

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    setIsLoadingSpecies(true);
    api
      .getPlantSpeciesByName(slug)
      .then((resp) => {
        if (cancelled) return;
        const speciesData = (resp ?? null) as PlantSpecies | null;
        setSpecies(speciesData);
        
        // Redirect to canonical slug if different from URL
        // e.g., /grow/species/daucus-carota -> /grow/species/carrot
        if (speciesData?.slug && speciesData.slug !== slug) {
          router.replace(`/grow/species/${speciesData.slug}`, undefined, { shallow: true });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSpecies(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingSpecies(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  // Fetch Wikipedia summary if species has no description but has scientific name
  useEffect(() => {
    // Only fetch if we have species data, no description, and a scientific name
    if (!species || species.description || !species.scientificName || isLoadingWiki) return;
    // Don't refetch if we already have wiki data
    if (wikiSummary) return;
    
    let cancelled = false;
    setIsLoadingWiki(true);
    
    fetch(`/api/grow/species/wiki-summary?scientificName=${encodeURIComponent(species.scientificName)}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.success && data.summary) {
          setWikiSummary(data.summary);
        }
      })
      .catch(err => {
        console.warn('[Species] Failed to fetch Wikipedia summary:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWiki(false);
      });
    
    return () => { cancelled = true; };
  }, [species, wikiSummary, isLoadingWiki]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    setIsLoadingMyTasks(true);
    api
      .getMyTasks()
      .then((data: unknown) => {
        if (cancelled) return;
        setMyTasks(normalizeMyTasks(data));
      })
      .catch(() => {
        if (cancelled) return;
        setMyTasks([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingMyTasks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!slug || !accessToken) return;
    let cancelled = false;

    setIsLoadingWindows(true);
    api
      .getPlantingCalendar()
      .then((data: unknown) => {
        if (cancelled) return;
        const all = ((data as { windows?: unknown })?.windows ?? []) as PlantingWindow[];
        setWindows(all.filter((w) => w.plantSlug === slug));
      })
      .catch(() => {
        if (cancelled) return;
        setWindows([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingWindows(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, accessToken]);

  useEffect(() => {
    // Threats endpoint is garden-wide today; we still load it for a “right now” panel.
    // Later we’ll add `?speciesSlug=` support.
    if (!accessToken) return;
    let cancelled = false;

    setIsLoadingThreats(true);
    fetch('/api/grow/threats', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setThreats((data?.threats ?? []) as ThreatAssessment[]);
      })
      .catch(() => {
        if (cancelled) return;
        setThreats([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingThreats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!slug || !accessToken) return;
    let cancelled = false;

    setIsLoadingTasks(true);
    api
      .getRecommendedActivities()
      .then((data: unknown) => {
        if (cancelled) return;
        const all = ((data as { tasks?: unknown })?.tasks ?? []) as GardenTask[];
        setTasks(all);
      })
      .catch(() => {
        if (cancelled) return;
        setTasks([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingTasks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, accessToken]);

  const heroImageKey = useMemo(() => pickBestPlantImageKeyFromSpecies(species), [species]);
  const heroSrc = useMemo(() => {
    // First try local image from PLANT_IMAGE_MAP
    if (heroImageKey) {
      const entry = (PLANT_IMAGE_MAP as Record<string, unknown>)[heroImageKey];
      if (entry && typeof entry === 'object') {
        const xl = (entry as { xl?: unknown }).xl;
        if (typeof xl === 'string' && xl) return xl;
      }
      const localImg = getPlantImage(heroImageKey, 'lg');
      if (localImg) return localImg;
    }
    // Fallback to wiki image for custom species
    if (species?.wikiImageUrl) return species.wikiImageUrl;
    return null;
  }, [heroImageKey, species?.wikiImageUrl]);
  
  const thumbSrc = useMemo(() => {
    if (heroImageKey) {
      const local = getPlantImage(heroImageKey, 'medium');
      if (local) return local;
    }
    // Fallback to wiki image for custom species
    if (species?.wikiImageUrl) return species.wikiImageUrl;
    return null;
  }, [heroImageKey, species?.wikiImageUrl]);
  
  // Use the biggest variant if present in the map (backwards compatible)
  const heroFullSrc = useMemo(() => {
    if (heroImageKey) {
      const entry = (PLANT_IMAGE_MAP as Record<string, unknown>)[heroImageKey];
      if (entry && typeof entry === 'object') {
        const xl = (entry as { xl?: unknown }).xl;
        if (typeof xl === 'string' && xl) return xl;
      }
      const localImg = getPlantImage(heroImageKey, 'lg');
      if (localImg) return localImg;
    }
    // Fallback to wiki image for custom species
    if (species?.wikiImageUrl) return species.wikiImageUrl;
    return null;
  }, [heroImageKey, species?.wikiImageUrl]);

  const filteredThreats = useMemo(() => {
    if (!species || !Array.isArray(threats)) return threats;
    const needles = [species.name, species.scientificName, ...(species.aliases ?? [])]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase());

    if (needles.length === 0) return threats;

    return threats.filter((t) => {
      const hay = `${t.commonName} ${t.scientificName ?? ''} ${(t.reasons ?? []).join(' ')}`.toLowerCase();
      return needles.some((n) => n && hay.includes(n));
    });
  }, [species, threats]);

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return tasks;
    const wanted = slug.toLowerCase();
    return tasks.filter((t) => {
      const slugs = (t.plantSlugs ?? t.speciesSlugs ?? []).map((s) => String(s).toLowerCase());
      if (slugs.includes(wanted)) return true;
      const title = (t.title ?? '').toLowerCase();
      return species?.name ? title.includes(species.name.toLowerCase()) : false;
    });
  }, [tasks, slug, species]);

  const title = species?.name ? `${species.name} — Grow` : 'Species — Grow';
  const description = species?.scientificName
    ? `${species.name} (${species.scientificName}). Care, timing, and what to do now.`
    : `${species?.name ?? 'Plant'} care, timing, and what to do now.`;

  const usda = formatUsdaRange(species?.usdaZoneMin ?? null, species?.usdaZoneMax ?? null);

  const nowMonthIndex0 = useMemo(() => getCurrentMonthIndex(), []);
  const actionable = useMemo(() => (windows ? nextActionableWindows(windows, nowMonthIndex0) : []), [windows, nowMonthIndex0]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const windowsByTaskCode = useMemo(() => {
    const map = new Map<string, PlantingWindow[]>();
    (windows ?? []).forEach((w) => {
      const key = w.taskCode;
      const arr = map.get(key) ?? [];
      arr.push(w);
      map.set(key, arr);
    });
    for (const [k, arr] of map.entries()) {
      map.set(k, arr.sort((a, b) => a.startWeek - b.startWeek));
    }
    return map;
  }, [windows]);

  const taskIsAlreadyInList = (taskId: string) => {
    if (recentlyAddedTaskIds.has(taskId)) return true;
    const list = myTasks ?? [];
    return list.some((t) => t.taskId === taskId && (!t.plantSlug || t.plantSlug === slug) && t.status !== 'removed');
  };

  // Dynamic breadcrumbs with species name
  const breadcrumbs = useMemo(() => [
    { label: 'Grow', href: '/grow' },
    { label: 'Garden', href: '/grow/garden' },
    { label: species?.name ?? 'Species' },
  ], [species?.name]);

  return (
    <GrowLayout 
      title={species?.name ?? 'Species'} 
      breadcrumbs={breadcrumbs}
      showBack
    >
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {species?.slug ? <link rel="canonical" href={`https://godaisy.io/grow/species/${species.slug}`} /> : null}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Head>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {isLoadingSpecies ? (
              <>
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-5 w-48 mt-2" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-semibold tracking-tight truncate">{species?.name ?? 'Species'}</h1>
                {species?.scientificName ? (
                  <p className="text-muted-foreground italic">{species.scientificName}</p>
                ) : null}
              </>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {species?.category ? <Badge variant="secondary">{species.category}</Badge> : null}
              {species?.isCustomSpecies ? <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800">🌱 Community Species</Badge> : null}
              {species?.sunRequirements ? <Badge variant="outline">☀️ {species.sunRequirements}</Badge> : null}
              {species?.soilType ? <Badge variant="outline">🪴 {species.soilType}</Badge> : null}
              {species?.plantSize ? <Badge variant="outline">📏 {species.plantSize}</Badge> : null}
              {usda ? <Badge variant="outline">{usda}</Badge> : null}
            </div>
            
            {/* Custom species info banner */}
            {species?.isCustomSpecies && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🌱</span>
                  <div>
                    <div className="font-medium text-amber-900">Community-contributed species</div>
                    <div className="text-amber-800 mt-1">
                      This species was identified by our community and isn&apos;t in our main database yet. 
                      {species.suggestionCount && species.suggestionCount > 1 
                        ? ` ${species.suggestionCount} gardeners have added this plant.`
                        : ''}
                    </div>
                    {species.wikiUrl && (
                      <a 
                        href={species.wikiUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 underline mt-2"
                      >
                        Learn more on Wikipedia →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {thumbSrc ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-xl border bg-white">
                <Image src={thumbSrc} alt={`${species?.name ?? 'Plant'}${species?.scientificName ? ` (${species.scientificName})` : ''}`} fill className="object-contain p-1" sizes="96px" />
              </div>
            ) : null}

            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                // MVP: navigate back to Garden with Add Plant dialog open
                // Later: open AddPlantDialog preselected.
                router.push('/grow/garden');
              }}
            >
              Add to Garden
            </Button>
          </div>
        </div>

        {heroSrc ? (
          <Card className="overflow-hidden">
            <button
              type="button"
              className="relative h-64 w-full bg-muted block text-left"
              onClick={() => setIsHeroOpen(true)}
            >
              <Image
                src={heroSrc}
                alt={`Photo of ${species?.name ?? 'plant'}${species?.scientificName ? `, ${species.scientificName}` : ''}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 960px, 1024px"
                priority
              />
              <div className="absolute bottom-3 right-3 rounded-full bg-black/50 text-white text-xs px-3 py-1">
                Tap to expand
              </div>
            </button>
            {/* Wiki image attribution */}
            {species?.wikiImageUrl && species?.wikiImageLicense && (
              <div className="px-3 py-2 bg-gray-50 border-t text-xs text-muted-foreground">
                Image via Wikimedia Commons • {species.wikiImageLicense}
              </div>
            )}
          </Card>
        ) : null}

        {isHeroOpen && heroFullSrc ? (
          <div
            className="fixed inset-0 z-50 bg-black/80"
            role="dialog"
            aria-modal="true"
            onClick={() => setIsHeroOpen(false)}
          >
            <div className="absolute top-4 right-4 z-10">
              <Button variant="secondary" onClick={() => setIsHeroOpen(false)}>
                Close
              </Button>
            </div>
            <div className="absolute inset-0 p-4">
              <div className="relative h-full w-full">
                <Image
                  src={heroFullSrc}
                  alt={`Full-size photo of ${species?.name ?? 'plant'}${species?.scientificName ? `, ${species.scientificName}` : ''}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            </div>
          </div>
        ) : null}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timing">Your timing</TabsTrigger>
            <TabsTrigger value="threats">Threats</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Care basics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {species?.searchTerms?.length ? (
                  <div className="text-sm text-muted-foreground">
                    Also known as: {species.searchTerms.slice(0, 8).join(', ')}
                  </div>
                ) : null}

                {species?.scientificName ? (
                  <div className="text-sm">
                    <span className="font-medium">Scientific name:</span> {species.scientificName}
                  </div>
                ) : null}

                {species?.imageKey ? (
                  <div className="text-xs text-muted-foreground">Image key: {species.imageKey}</div>
                ) : null}

                {/* If/when climate zone is available from profile we can show it here.
                    MVP: left out to avoid hard dependency on auth/profile loading.
                    This is where we’ll add it later:
                    <ClimateZoneInfo climateZone={...} variant="compact" />
                */}

                {species ? (
                  <div className="text-sm text-muted-foreground">
                    {species.category ? `A ${species.category}. ` : ''}
                    This page combines timeless care info with personalized timing.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSpecies ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-80" />
                    <Skeleton className="h-5 w-64" />
                  </div>
                ) : species ? (
                  <div className="space-y-3">
                    {/* Description: prefer species.description, fall back to Wikipedia */}
                    {species.description ? (
                      <p className="text-sm text-muted-foreground">
                        <TranslatedText text={species.description} />
                      </p>
                    ) : wikiSummary ? (
                      <p className="text-sm text-muted-foreground">
                        <TranslatedText text={wikiSummary.extract} />
                      </p>
                    ) : isLoadingWiki ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No description available yet.
                      </p>
                    )}
                    
                    {/* Wikipedia attribution - show for custom species with description OR when using wiki fallback */}
                    {((species.isCustomSpecies && species.description && species.wikiUrl) || wikiSummary) && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>From Wikipedia, CC BY-SA 3.0</span>
                        <a
                          href={wikiSummary?.pageUrl || species.wikiUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Read full article →
                        </a>
                      </div>
                    )}
                    
                    {species.advice ? (
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-xs font-medium text-green-800 mb-1">Top tip</div>
                        <div className="text-sm text-green-900">
                          <TranslatedText text={species.advice} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No species loaded.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4">
            {/* Location-based timing notice */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>
                <strong>Personalized for your location</strong> — These timings are calculated based on your saved garden location and local climate conditions.
              </span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Your timing</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingWindows ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-80" />
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-5 w-72" />
                  </div>
                ) : windows && windows.length > 0 ? (
                  <div className="space-y-5">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Next actionable</div>
                      <div className="flex flex-wrap gap-2">
                        {actionable.map((w) => (
                          <div
                            key={`${w.taskCode}:${w.startWeek}:${w.endWeek}`}
                            className="px-3 py-2 rounded-full border bg-white"
                          >
                            <div className="flex items-center gap-2">
                              <TimingIcon kind={classifyTimingKind(w)} />
                              <div className="text-sm font-medium">{w.taskName}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {windowStartLabel(w)} → {windowEndLabel(w)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Year at a glance</div>
                      <div className="grid grid-cols-12 gap-1">
                        {months.map((m) => {
                          const hasWindow = monthIndexHasWindow(windows ?? [], m);
                          const isNow = m === nowMonthIndex0;
                          return (
                            <div
                              key={m}
                              className={
                                'h-9 rounded-md flex items-center justify-center text-xs border ' +
                                (isNow
                                  ? 'border-green-600 bg-green-600 text-white'
                                  : hasWindow
                                    ? 'border-green-200 bg-green-50 text-green-900'
                                    : 'border-muted bg-muted/30 text-muted-foreground')
                              }
                              title={hasWindow ? 'Action window(s) this month' : 'No windows'}
                            >
                              {monthIndexToLabel(m)}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Green months have at least one relevant window.
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">All windows</div>
                      <div className="space-y-2">
                        {Array.from(windowsByTaskCode.entries()).map(([taskCode, rows]) => (
                          <div key={taskCode} className="p-3 rounded-lg border bg-white">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 font-medium">
                                {rows[0] ? <TimingIcon kind={classifyTimingKind(rows[0])} /> : null}
                                <span>{rows[0]?.taskName ?? taskCode}</span>
                              </div>
                              <Badge variant="outline">{taskCode}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {rows.slice(0, 4).map((w) => (
                                <Badge key={`${taskCode}:${w.startWeek}:${w.endWeek}`} variant="secondary">
                                  {windowStartLabel(w)}–{windowEndLabel(w)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No calendar windows found for this species yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What to do now</CardTitle>
              </CardHeader>
              <CardContent>
                {!accessToken ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in to see personalized tasks.
                  </p>
                ) : isLoadingTasks ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-72" />
                    <Skeleton className="h-5 w-60" />
                  </div>
                ) : filteredTasks && filteredTasks.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTasks.slice(0, 6).map((t, idx) => {
                      const taskId = t.taskId ?? t.id ?? `${idx}`;
                      const already = taskIsAlreadyInList(taskId);
                      return (
                        <div key={taskId} className="p-3 rounded-lg border bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{t.title ?? 'Task'}</div>
                              {t.description ? (
                                <div className="text-xs text-muted-foreground">{t.description}</div>
                              ) : null}
                              {t.startDate || t.endDate ? (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}
                                  {t.startDate && t.endDate ? ' → ' : ''}
                                  {t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}
                                </div>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              variant={already ? 'secondary' : 'outline'}
                              disabled={already || isAddingTaskId === taskId || isLoadingMyTasks}
                              onClick={() => {
                                setIsAddingTaskId(taskId);
                                api
                                  .addTaskToList(taskId, {
                                    title: t.title,
                                    description: t.description,
                                    taskType: t.taskType,
                                    plantSlug: slug,
                                  })
                                  .then(() => {
                                    setRecentlyAddedTaskIds((prev) => {
                                      const next = new Set(prev);
                                      next.add(taskId);
                                      return next;
                                    });
                                    // Refresh my tasks so the state persists on reload/navigation
                                    return api.getMyTasks();
                                  })
                                  .then((data: unknown) => {
                                    setMyTasks(normalizeMyTasks(data));
                                  })
                                  .finally(() => setIsAddingTaskId(null));
                              }}
                            >
                              {already ? 'Added' : isAddingTaskId === taskId ? 'Adding…' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tasks found for this species right now.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="threats" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Threats right now</h2>
            </div>
            {isLoadingThreats ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              </div>
            ) : filteredThreats && filteredThreats.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredThreats.slice(0, 6).map((t) => (
                  <ThreatCard key={t.threatId} threat={t} compact />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No threats to show for this species yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </GrowLayout>
  );
}
