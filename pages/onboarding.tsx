import { useMemo, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import CoastalLocationDialog from "@/components/CoastalLocationDialog";
// DaisyUI Light tokens applied inline so they win the cascade inside this page
const LIGHT_INLINE_VARS: CSSProperties & Record<string, string> = {
  // Base surfaces/content (Light)
  '--b1': '0 0% 100%',   // white
  '--b2': '0 0% 95%',
  '--b3': '0 0% 90%',
  '--bc': '215 28% 17%', // slate-800-ish text

  // Brand accents (roughly DaisyUI light defaults)
  '--p':  '262 92% 58%', // primary
  '--pc': '0 0% 100%',
  '--s':  '316 80% 49%', // secondary
  '--sc': '0 0% 100%',
  '--a':  '173 64% 47%', // accent (teal)
  '--ac': '0 0% 100%',
  '--n':  '220 13% 46%', // neutral
  '--nc': '0 0% 100%',

  // State colours
  '--in': '204 86% 53%',
  '--su': '166 100% 34%',
  '--wa': '37 100% 50%',
  '--er': '14 100% 50%',
};
// ──────────────────────────────────────────────────────────────────────────────
// Small components and helpers for the improved onboarding UX

type CategoryHeaderProps = {
  title: string;
  subtitle?: string;
  onSkip?: () => void;
};

function CategoryHeader({ title, subtitle, onSkip }: CategoryHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-2">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-base-content/60">{subtitle}</p>
        )}
      </div>
      {onSkip && (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={onSkip}
          aria-label={`Skip ${title}`}
        >
          Skip this category
        </button>
      )}
    </div>
  );
}

type InterestPillProps = {
  id: string;
  label: string;
  selected: boolean;
  icon?: React.ReactNode;
  onToggle: (id: string) => void;
};

function InterestPill({ id, label, selected, icon, onToggle }: InterestPillProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={[
        "btn btn-sm rounded-xl normal-case transition-shadow",
        selected
          ? "btn-primary ring-2 ring-offset-1 ring-primary/60"
          : "btn-outline hover:bg-base-200"
      ].join(" ")}
      aria-pressed={selected}
    >
      {selected && <span className="mr-1">✓</span>}
      {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

function ClusterPill({ id, label, icon, selected, onToggle }: { id: string; label: string; icon?: React.ReactNode; selected: boolean; onToggle: (id: string) => void; }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={[
        "btn btn-lg h-24 w-full rounded-xl normal-case transition-shadow flex flex-col gap-1",
        selected
          ? "btn-primary ring-2 ring-offset-1 ring-primary/60"
          : "btn-outline hover:bg-base-200"
      ].join(" ")}
      aria-pressed={selected}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function OnboardingFooter({ onBack, onNext, isLast, totalSelected, nextDisabled }: {
  onBack: () => void;
  onNext: () => void;
  isLast?: boolean;
  totalSelected: number;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>
      <div className="text-sm text-base-content/60">
        You can edit your interests any time in <Link className="link" href="/settings/interests">Settings → Interests</Link>.
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm">Total selected: {totalSelected}</span>
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={!!nextDisabled}>
          {isLast ? "Complete Setup" : "Next Category"}
        </button>
      </div>
    </div>
  );
}

// Fallback emoji-based icon map (replace with custom SVGs later)
const activityIcon: Record<string, React.ReactNode> = {
  hiking: "🥾",
  birdwatching: "🦉",
  photography: "📷",
  foraging: "🧺",
  mushroom_hunting: "🍄",
  stargazing: "🔭",
  fly_fishing_freshwater: "🎣",
  coarse_fishing: "🎣",
  sea_fishing_shore: "🎣",
  sea_fishing_boat: "🚤",
  kayaking: "🛶",
  sea_kayaking: "🛶",
  canoeing: "🛶",
  surfing: "🏄‍♂️",
  stand_up_paddleboarding: "🏄",
  sup_sea: "🏄",
  snorkeling: "🤿",
  swimming: "🏊",
  indoor_swimming: "🏊",
  sea_swimming: "🏊",
  windsurfing: "🏄",
  kitesurfing: "🪁",
  jet_skiing: "🌊",
  scuba_diving: "🤿",
  sailing: "⛵",
  sailing_inland: "⛵",
  windsurfing_inland: "🏄",
  tennis: "🎾",
  tennis_indoor: "🎾",
  squash: "🎾",
  badminton: "🏸",
  table_tennis: "🏓",
  golf: "⛳",
  rugby: "🏉",
  cricket: "🏏",
  football_soccer: "⚽",
  basketball_outdoor: "🏀",
  beach_volleyball: "🏐",
  american_football: "🏈",
  baseball: "⚾",
  hurling_camogie: "🏑",
  gaelic_football: "🏐",
  hockey: "🏒",
  netball: "🟣",
  padel: "🎾",
  archery: "🏹",
  pickleball: "🥒",
  indoor_climbing: "🧗",
  rock_climbing: "🧗",
  mountain_biking: "🚵",
  gravel_biking: "🚴",
  road_cycling: "🚴",
  trail_running: "🥾",
  yoga: "🧘",
  outdoor_yoga: "🧘",
  meditation: "🧘",
  outdoor_meditation: "🧘",
  pilates: "🧍",
  tai_chi: "🌬️",
  running: "🏃",
  cycling: "🚴",
  urban_exploring: "🏙️",
  gym_workout: "🏋️",
  outdoor_gym: "🏋️",
  zumba: "💃",
  boxing: "🥊",
  spinning: "🚴",
  martial_arts: "🥋",
  painting: "🎨",
  outdoor_painting: "🎨",
  crafts: "🧵",
  knitting: "🧶",
  diy: "🛠️",
  playing_records: "📀",
  make_music: "🎸",
  dance: "💃",
  gallery: "🖼️",
  reading: "📚",
  cooking: "🍳",
  gaming: "🎮",
  online: "🌐",
  watch_a_movie: "🎬",
  going_to_pub: "🍺",
  playing_cards: "🃏",
  cafe: "☕",
  cinema: "🎞️",
  museum: "🏛️",
  shopping: "🛍️",
  bowling: "🎳",
  bbq: "🍖",
  beach: "🏖️",
  outdoor_reading: "📖",
  dog_walking: "🐕",
  outdoor_playground: "🛝",
  outdoor_chess: "♟️",
  outdoor_music: "🎷",
};
// Removed unused imports to reduce lint noise

// DaisyUI version of the hybrid onboarding flow
// - Uses Tailwind + DaisyUI utility classes (no shadcn imports)
// - Clusters → Subcategories → Activities
// - If total selected subcategories ≤ 3 → single combined activities screen
// - If > 3 → chunk by subcategory (groups of 3)
// - Optional marine location screen
// - British English copy

// ──────────────────────────────────────────────────────────────────────────────
// TAXONOMY (normalised & deduped)
const TAXONOMY = [
  {
    key: "Active Sports",
    icon: "🏃‍♂️",
    subcategories: [
      {
        key: "Outdoor Sports",
        icon: "🤾‍♂️",
        acts: [
          "football_soccer",
          "cricket",
          "rugby",
          "basketball_outdoor",
          "beach_volleyball",
          "american_football",
          "baseball",
          "hurling_camogie",
          "gaelic_football",
          "hockey",
          "netball",
          "padel",
          "archery",
          "pickleball",
          "golf",
          "tennis",
        ],
      },
      {
        key: "Indoor Sports",
        icon: "🎾",
        acts: [
          "tennis_indoor",
          "squash",
          "badminton",
          "table_tennis",
          "volleyball_indoor",
          "indoor_climbing",
        ],
      },
      {
        key: "Water Sports",
        icon: "🛶",
        acts: [
          "kayaking",
        "sea_kayaking",
                    "canoeing",
                    "surfing",
                    "stand_up_paddleboarding",
                    "sup_sea",
                    "snorkeling",
                    "swimming",
                    "indoor_swimming",
                    "sea_swimming",
                    "sea_fishing_shore",
                    "sea_fishing_boat",
                    "windsurfing",
                    "kitesurfing",
                    "jet_skiing",
                    "scuba_diving",
					"sailing",
                    "sailing_inland",
                    "windsurfing_inland",
        ],
      },
      {
        key: "Action Sports",
        icon: "🚵‍♂️",
        acts: [
          "mountain_biking",
          "road_cycling",
          "trail_running",
          "gravel_biking",
          "rock_climbing",
          "indoor_climbing",
          "skateboarding",
          "rollerblading",
          "riding_motorbike",
          "geocaching",
        ],
      },
      {
        key: "Winter Sports",
        icon: "⛷️",
        acts: [
          "skiing",
          "snowboarding",
          "cross_country_skiing",
          "ice_skating",
          "curling",
          "ice_hockey",
          "ice_fishing",
          "ice_hockey_indoor",
          "ice_hockey_us",
        ],
      },
    ],
  },
  {
    key: "Fitness & Wellness",
    icon: "💪",
    subcategories: [
      {
        key: "Mindfulness",
        icon: "🧘‍♂️",
        acts: [
          "yoga",
          "outdoor_yoga",
          "meditation",
          "outdoor_meditation",
          "pilates",
          "tai_chi",
          "outdoor_gym",
        ],
      },
      {
        key: "Keeping Fit",
        icon: "🏃",
        acts: [
          "running",
          "cycling",
          "urban_exploring",
          "gym_workout",
          "outdoor_gym",
          "zumba",
          "boxing",
          "spinning",
          "martial_arts",
        ],
      },
    ],
  },
  {
    key: "Outdoor Activities",
    icon: "🌲",
    subcategories: [
      {
        key: "Nature Activities",
        icon: "🌳",
        acts: [
          "hiking",
          "birdwatching",
          "photography",
          "foraging",
          "mushroom_hunting",
          "stargazing",
        ],
      },
      {
        key: "Fishing",
        icon: "🎣",
        acts: [
          "fly_fishing_freshwater",
          "coarse_fishing",
          "sea_fishing_shore",
          "sea_fishing_boat",
          "ice_fishing",
        ],
      },
      {
        key: "Kicking Back and Relaxing",
        icon: "🍔",
        acts: [
          "picnicking",
          "bbq",
          "beach",
          "camping",
          "outdoor_reading",
          "dog_walking",
          "outdoor_playground",
          "outdoor_chess",
          "outdoor_painting",
          "outdoor_music",
        ],
      },
    ],
  },
  {
    key: "Creative & Arts",
    icon: "🎨",
    subcategories: [
      {
        key: "Visual Arts",
        icon: "🎨",
        acts: [
          "painting",
          "outdoor_painting",
          "crafts",
          "photography",
          "knitting",
          "diy",
          "playing_records",
          "make_music",
          "dance",
          "outdoor_music",
          "gallery",
        ],
      },
    ],
  },
  {
    key: "Indoor Activities",
    icon: "🏠",
    subcategories: [
      {
        key: "Relaxing at Home",
        icon: "🧶",
        acts: [
          "crafts",
          "knitting",
          "reading",
          "diy",
          "playing_records",
          "cooking",
          "painting",
          "gaming",
          "online",
          "watch_a_movie",
        ],
      },
      {
        key: "Going Out",
        icon: "🍻",
        acts: [
          "going_to_pub",
          "playing_cards",
          "cafe",
          "cinema",
          "museum",
          "shopping",
          "dance",
          "gallery",
          "bowling",
        ],
      },
    ],
  },
];



export default function OnboardingFlowDaisyUI() {
  // Force DaisyUI theme to light on this page and restore after
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const previous = html.getAttribute('data-theme');
    html.classList.add('force-light-scope');
    html.setAttribute('data-theme', 'light');
    return () => {
      html.classList.remove('force-light-scope');
      if (previous) html.setAttribute('data-theme', previous);
      else html.removeAttribute('data-theme');
    };
  }, []);

  return (
    <div data-theme="light" className="force-light min-h-screen bg-base-100 text-base-content p-4" style={LIGHT_INLINE_VARS}>
      <div className="w-full">
        <LiveDemo />
      </div>
      <style jsx global>{`
        /* Force DaisyUI Light palette within .force-light scope (overrides app theme) */
        .force-light { color-scheme: light; }
        .force-light,
        [data-theme] .force-light,
        html.force-light-scope .force-light {
          --p: 262 92% 58% !important;
          --pc: 0 0% 100% !important;
          --s: 316 80% 49% !important;
          --sc: 0 0% 100% !important;
          --a: 173 64% 47% !important;
          --ac: 0 0% 100% !important;
          --n: 220 13% 46% !important;
          --nc: 0 0% 100% !important;
          --b1: 0 0% 100% !important;
          --b2: 0 0% 95% !important;
          --b3: 0 0% 90% !important;
          --bc: 215 28% 17% !important;
          --in: 204 86% 53% !important;
          --su: 166 100% 34% !important;
          --wa: 37 100% 50% !important;
          --er: 14 100% 50% !important;

          /* Optional radius & animation tokens to stabilise visuals */
          --rounded-box: 0.75rem;
          --rounded-btn: 0.5rem;
          --rounded-badge: 1.9rem;
          --animation-btn: 0.25s;
          --animation-input: 0.2s;
        }
      `}</style>
    </div>
  );
}
// Compact, visible bar for selected activities
function SelectedBar({ items, onRemove, onClear }: {
  items: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="bg-base-200 rounded-box p-2 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Selected ({items.length})</span>
        <button type="button" className="btn btn-ghost btn-xs text-base-content" onClick={onClear}>Clear all</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map(id => (
          <span key={id} className="badge bg-base-200 text-base-content border border-base-300 gap-1">
            {id.replaceAll('_', ' ')}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => onRemove(id)}
              aria-label={`Remove ${id.replaceAll('_',' ')}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Live demo (previous interactive flow in one card)
function LiveDemo() {
  return (
    <div data-theme="light"
         className="card bg-base-100 shadow-xl w-full"
         style={LIGHT_INLINE_VARS}>
      <div className="card-body">
        <OnboardingCardInteractive />
      </div>
    </div>
  );
}

// Extracted interactive card from previous implementation
function OnboardingCardInteractive() {
  const [step, setStep] = useState(1);
  const [selectedClusters, setSelectedClusters] = useState<string[]>(TAXONOMY.map(c => c.key));
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [homeLocation, setHomeLocation] = useState("");
  const [openHomeModal, setOpenHomeModal] = useState(false);
  const [homeSpot, setHomeSpot] = useState<null | { name: string; lat: number; lon: number }>(null);
  const [marineLocation, setMarineLocation] = useState("");
  const [openCoastalModal, setOpenCoastalModal] = useState(false);
  const [coastalSpot, setCoastalSpot] = useState<null | { name: string; lat: number; lon: number }>(null);
  const [showRegisterNudge, setShowRegisterNudge] = useState(true);
  const router = useRouter();

  const clusterMap = useMemo(() => new Map(TAXONOMY.map(c => [c.key, c])), []);

  const selectedSubcats = useMemo(() => {
    const subs: { key: string; icon: string }[] = [];
    selectedClusters.forEach(ck => {
      const cluster = clusterMap.get(ck);
      cluster?.subcategories.forEach(sc => subs.push({ key: sc.key, icon: sc.icon }));
    });
    return subs;
  }, [selectedClusters, clusterMap]);

  const activitiesBySubcat = useMemo(() => {
    const map: Record<string, string[]> = {};
    TAXONOMY.forEach(cluster => {
      cluster.subcategories.forEach(sc => {
        map[sc.key] = Array.from(new Set(sc.acts));
      });
    });
    return map;
  }, []);

  const combinedActivities = useMemo(() => {
    const set = new Set<string>();
    selectedSubcats.forEach(sc => activitiesBySubcat[sc.key]?.forEach(a => set.add(a)));
    return Array.from(set);
  }, [selectedSubcats, activitiesBySubcat]);

  const isMarineChosen = useMemo(() => {
    const MARINE_KEYS = ["surf","sea_","windsurf","kitesurf","paddle","kayak","canoe","sailing","scuba","snorkel","wild_swimming","beach"];
    const acts = new Set(combinedActivities.concat(selectedActivities));
    return Array.from(acts).some(a => MARINE_KEYS.some(k => a.includes(k)));
  }, [combinedActivities, selectedActivities]);

  const subcatChunks = useMemo(() => {
    const keys = selectedSubcats.map(s => s.key);
    const chunks: string[][] = [];
    for (let i = 0; i < keys.length; i += 3) chunks.push(keys.slice(i, i + 3));
    return chunks;
  }, [selectedSubcats]);

  const useCombined = selectedSubcats.length > 0 && selectedSubcats.length <= 3;

  const activityScreens = useCombined ? 1 : Math.max(1, subcatChunks.length);
  // clusters → activities (1..N) → home → (marine?) → confirm
  // const totalSteps = 1 + activityScreens + 1 + (isMarineChosen ? 1 : 0) + 1; // removed unused

  const phase = useMemo(() => {
    if (step === 1) return { type: "clusters" as const };
    if (step > 1 && step <= 1 + activityScreens) {
      if (useCombined) return { type: "activities-combined" as const };
      const chunkIndex = step - 2;
      return { type: "activities-chunk" as const, chunkIndex };
    }
    const afterActivities = 1 + activityScreens;
    if (step === afterActivities + 1) return { type: "home" as const };
    if (isMarineChosen && step === afterActivities + 2) return { type: "marine" as const };
    return { type: "confirm" as const };
  }, [step, useCombined, activityScreens, isMarineChosen]);

  const toggleCluster = (key: string) => setSelectedClusters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const toggleActivity = (name: string) => setSelectedActivities(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);

  const items = ["Choose areas", "Activities", "Home", ...(isMarineChosen ? ["Marine"] : []), "Done"];
  const currentIndex = (() => {
    if (phase.type === 'clusters') return 0;
    if (phase.type === 'activities-combined' || phase.type === 'activities-chunk') return 1;
    if (phase.type === 'home') return 2;
    if (phase.type === 'marine') return isMarineChosen ? 3 : 2;
    return items.length - 1;
  })();

  return (
    <>
      <div className="sticky top-0 z-10 bg-base-100/95 backdrop-blur pt-1">
        <ul className="steps w-full">
          {items.map((label, i) => (<li key={label} className={`step ${i <= currentIndex ? 'step-primary' : ''}`}>{label}</li>))}
        </ul>
        <div className="text-center space-y-1 mt-2">
          <h1 className="card-title justify-center text-2xl">
            {phase.type === 'clusters' ? '👋 Welcome to GoDaisy!' : phase.type === 'home' ? 'Set your home location 📍' : phase.type === 'marine' ? 'Set a coastal spot 🌊' : phase.type === 'confirm' ? '🎉 All set!' : 'Fine-tune 🎯'}
          </h1>
          <p className="text-base-content/70 text-sm">
            {phase.type === 'clusters' && "Deselect any areas you’re not into. You can change this any time."}
            {phase.type === 'activities-combined' && "Great! Deselect anything that’s not your vibe. We’ve pre‑selected a few to get you started."}
            {phase.type === 'activities-chunk' && "Short lists, better choices. You can add more later."}
            {phase.type === 'home' && "Set your home location so we can personalise local recommendations and forecasts."}
            {phase.type === 'marine' && "Because you chose sea activities, adding a coastal spot helps us give you seaside advice."}
            {phase.type === 'confirm' && "We’ve saved your activities. You can always add more later."}
          </p>

      {phase.type === 'home' && (
        <div className="space-y-3 mt-2">
          <CategoryHeader
            title="Home location"
            subtitle="Helps us tailor forecasts and nearby suggestions."
          />
          <input
            className="input input-bordered w-full"
            placeholder="Enter a town, postcode, or click Use current location"
            value={homeLocation}
            onChange={(e) => setHomeLocation(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => setHomeLocation('Use current location')}>Use current location</button>
            <button className="btn btn-outline" onClick={() => setOpenHomeModal(true)}>Use map</button>
          </div>
          {homeSpot && (
            <div className="alert alert-info">
              <span>Home: {homeSpot.name}</span>
            </div>
          )}
          <CoastalLocationDialog
            open={openHomeModal}
            onClose={() => setOpenHomeModal(false)}
            title="Set your home location 📍"
            onSave={(loc) => {
              setHomeSpot(loc);
              setHomeLocation(loc.name);
              setOpenHomeModal(false);
            }}
          />
          <p className="text-xs text-base-content/60">You can change this any time in Settings → Location.</p>
        </div>
      )}
        </div>
      </div>

      <SelectedBar
        items={selectedActivities}
        onRemove={(id) => toggleActivity(id)}
        onClear={() => setSelectedActivities([])}
      />

      {/* Screens */}
      {phase.type === 'clusters' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 mt-2">
          {TAXONOMY.map(c => (
            <ClusterPill
              key={c.key}
              id={c.key}
              label={c.key}
              icon={c.icon}
              selected={selectedClusters.includes(c.key)}
              onToggle={toggleCluster}
            />
          ))}
        </div>
      )}

      {phase.type === 'activities-combined' && (
        <>
          <CategoryHeader
            title="Activities"
            subtitle="Deselect anything that’s not your vibe."
            onSkip={() => setStep(s => s + 1)}
          />
          <div className="divider my-1"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
            {combinedActivities.map(a => (
              <InterestPill
                key={a}
                id={a}
                label={a.replaceAll('_', ' ')}
                icon={activityIcon[a]}
                selected={selectedActivities.includes(a)}
                onToggle={(id) => toggleActivity(id)}
              />
            ))}
          </div>
        </>
      )}

      {phase.type === 'activities-chunk' && (
        <>
          <CategoryHeader
            title="Activities"
            subtitle="Short lists, better choices. You can add more later."
            onSkip={() => setStep(s => s + 1)}
          />
          <div className="flex flex-wrap gap-1 -mb-1 mt-1">
            {(subcatChunks[phase.chunkIndex] || []).map(sc => (
              <span key={sc} className="badge badge-outline">{sc}</span>
            ))}
          </div>
          <div className="divider my-1"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
            {Array.from(new Set((subcatChunks[phase.chunkIndex] || [])
              .flatMap(scKey => activitiesBySubcat[scKey] || [])))
              .map(a => (
                <InterestPill
                  key={a}
                  id={a}
                  label={a.replaceAll('_', ' ')}
                  icon={activityIcon[a]}
                  selected={selectedActivities.includes(a)}
                  onToggle={(id) => toggleActivity(id)}
                />
              ))}
          </div>
        </>
      )}

      {phase.type === 'marine' && (
        <div className="space-y-3 mt-2">
          <p className="text-sm text-base-content/70">Because you chose sea activities, setting a coastal spot lets us give tide, swell and wind‑aware advice.</p>
          <input className="input input-bordered w-full" placeholder="Search or enter a coastal location" value={marineLocation} onChange={(e) => setMarineLocation(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <button className="btn btn-outline" onClick={() => setMarineLocation('Use current location')}>Use current location</button>
            <button className="btn btn-outline" onClick={() => setOpenCoastalModal(true)}>Use map</button>
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!marineLocation && !coastalSpot}>Save & Continue</button>
          </div>
          {coastalSpot && (
            <div className="alert alert-info">
              <span>Selected: {coastalSpot.name}</span>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(s => s + 1)}>Skip for now</button>
          <CoastalLocationDialog
            open={openCoastalModal}
            onClose={() => setOpenCoastalModal(false)}
            title="Set a coastal spot 🌊"
            onSave={(loc) => {
              setCoastalSpot(loc);
              setMarineLocation(loc.name);
              setOpenCoastalModal(false);
            }}
          />
        </div>
      )}

      {phase.type === 'confirm' && (
        <div className="space-y-3 mt-2">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="card bg-base-200">
              <div className="card-body py-3">
                <h3 className="card-title text-sm">Home location</h3>
                <p className="text-sm">{homeSpot?.name || homeLocation}</p>
              </div>
            </div>
            {isMarineChosen && (
              <div className="card bg-base-200">
                <div className="card-body py-3">
                  <h3 className="card-title text-sm">Coastal spot</h3>
                  <p className="text-sm">{coastalSpot?.name || marineLocation || 'Not set'}</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-base-content/60">Tip: you can edit locations any time in <Link className="link" href="/account">Account → Locations</Link>.</p>
          {/* Registration nudge */}
          {showRegisterNudge ? (
            <div className="alert bg-base-200 border border-base-300 flex items-center gap-3 mt-2">
              <div>
                <div className="font-medium">Save these to your account?</div>
                <div className="text-sm opacity-70">Register to sync your interests and locations across devices.</div>
              </div>
              <Link href="/login" className="btn btn-primary btn-sm ml-auto">Register</Link>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRegisterNudge(false)}>Maybe later</button>
            </div>
          ) : (
            <p className="text-xs text-base-content/60 mt-2">We’ll use your locally saved preferences on this device for now.</p>
          )}
        </div>
      )}

      <OnboardingFooter
        onBack={() => {
          if (phase.type === 'clusters') {
            setSelectedClusters(["Active Sports"]);
            setStep(2);
          } else {
            setStep(s => Math.max(1, s - 1));
          }
        }}
        onNext={() => {
          if (phase.type === 'clusters') {
            if (selectedClusters.length === 0) setSelectedClusters(["Active Sports", "Fitness & Wellness"]);
            setStep(2);
          } else if (phase.type === 'activities-combined' || phase.type === 'activities-chunk') {
            setStep(s => s + 1);
          } else if (phase.type === 'home') {
            if (homeLocation || homeSpot) setStep(s => s + 1);
          } else if (phase.type === 'marine') {
            setStep(s => s + 1);
          } else if (phase.type === 'confirm') {
            router.push('/');
          }
        }}
        isLast={phase.type === 'confirm'}
        totalSelected={selectedActivities.length}
        nextDisabled={phase.type === 'home' && !homeLocation && !homeSpot}
      />
    </>
  );
}

