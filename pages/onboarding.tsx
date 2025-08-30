import { useMemo, useState } from "react";
import CoastalLocationDialog from "@/components/CoastalLocationDialog";

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
  const [tab, setTab] = useState<'live' | 'mock'>('mock');

  return (
    <div data-theme="wotnow" className="min-h-screen bg-gradient-to-b from-sky-100 to-base-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Tabs to switch between Mock screens and Live demo */}
        <div role="tablist" className="tabs tabs-bordered mb-4">
          <a role="tab" className={`tab ${tab === 'mock' ? 'tab-active' : ''}`} onClick={() => setTab('mock')}>Mock screens</a>
          <a role="tab" className={`tab ${tab === 'live' ? 'tab-active' : ''}`} onClick={() => setTab('live')}>Live demo</a>
        </div>

        {tab === 'mock' ? <MockScreens /> : <LiveDemo />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Live demo (previous interactive flow in one card)
function LiveDemo() {
  return (
    <div className="card bg-base-100 shadow-xl max-w-md mx-auto">
      <div className="card-body">
        <OnboardingCardInteractive />
      </div>
    </div>
  );
}

// Extracted interactive card from previous implementation
function OnboardingCardInteractive() {
  const [step, setStep] = useState(1);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [marineLocation, setMarineLocation] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [openCoastalModal, setOpenCoastalModal] = useState(false);
  const [coastalSpot, setCoastalSpot] = useState<null | { name: string; lat: number; lon: number }>(null);

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
  const totalSteps = 1 + activityScreens + (isMarineChosen ? 1 : 0) + 1;

  const phase = useMemo(() => {
    if (step === 1) return { type: "clusters" as const };
    if (step > 1 && step <= 1 + activityScreens) {
      if (useCombined) return { type: "activities-combined" as const };
      const chunkIndex = step - 2;
      return { type: "activities-chunk" as const, chunkIndex };
    }
    const afterActivities = 1 + activityScreens;
    if (isMarineChosen && step === afterActivities + 1) return { type: "marine" as const };
    return { type: "confirm" as const };
  }, [step, useCombined, activityScreens, isMarineChosen]);

  const toggleCluster = (key: string) => setSelectedClusters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const toggleActivity = (name: string) => setSelectedActivities(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);

  const preselectPopular = () => {
    const picks: string[] = [];
    selectedSubcats.forEach(sc => { const list = activitiesBySubcat[sc.key] || []; if (list[0]) picks.push(list[0]); });
    setSelectedActivities(prev => Array.from(new Set([...prev, ...picks])));
  };

  const next = () => setStep(s => Math.min(s + 1, totalSteps));
  const back = () => setStep(s => Math.max(1, s - 1));

  const items = ["Choose areas", "Activities", ...(isMarineChosen ? ["Location"] : []), "Done"];
  const currentIndex = (() => {
    if (phase.type === 'clusters') return 0;
    if (phase.type === 'activities-combined' || phase.type === 'activities-chunk') return 1;
    if (phase.type === 'marine') return isMarineChosen ? 2 : 1;
    return items.length - 1;
  })();

  return (
    <>
      <ul className="steps w-full">
        {items.map((label, i) => (<li key={label} className={`step ${i <= currentIndex ? 'step-primary' : ''}`}>{label}</li>))}
      </ul>

      <div className="text-center space-y-1 mt-2">
        <h1 className="card-title justify-center text-2xl">
          {phase.type === 'clusters' ? '👋 Welcome to GoDaisy!' : phase.type === 'marine' ? 'Set a coastal spot 🌊' : phase.type === 'confirm' ? '🎉 All set!' : 'Fine‑tune 🎯'}
        </h1>
        <p className="text-base-content/70 text-sm">
          {phase.type === 'clusters' && "Choose a few areas you’re into — we’ll tailor the rest. You can change these anytime."}
          {phase.type === 'activities-combined' && "Great! Deselect anything that’s not your vibe. We’ve pre‑selected a few to get you started."}
          {phase.type === 'activities-chunk' && "Short lists, better choices. You can add more later."}
          {phase.type === 'marine' && "Helps us personalise tides, swell, and wind for sea activities."}
          {phase.type === 'confirm' && "We’ve saved your activities. You can always add more later."}
        </p>
      </div>

      {/* Screens */}
      {phase.type === 'clusters' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {TAXONOMY.map(c => {
            const active = selectedClusters.includes(c.key);
            return (
              <button key={c.key} className={`btn ${active ? 'btn-primary' : 'btn-outline'} h-20 flex flex-col gap-1 tooltip`} data-tip={active ? 'Selected' : 'Tap to select'} onClick={() => toggleCluster(c.key)}>
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs">{c.key}</span>
              </button>
            );
          })}
        </div>
      )}

      {phase.type === 'activities-combined' && (
        <>
          <div className="flex items-center justify-between -mb-1 mt-2">
            <span className="badge badge-ghost">All chosen subcategories</span>
            <button className="btn btn-ghost btn-sm" onClick={preselectPopular}>Preselect popular</button>
          </div>
          <div className="divider my-1"></div>
          <div className="grid grid-cols-2 gap-2">
            {combinedActivities.map(a => {
              const active = selectedActivities.includes(a);
              return (
                <button key={a} className={`btn ${active ? 'btn-primary' : 'btn-outline'} h-16`} onClick={() => toggleActivity(a)}>
                  {a.replaceAll('_', ' ')}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase.type === 'activities-chunk' && (
        <>
          <div className="flex flex-wrap gap-1 -mb-1 mt-2">
            {(subcatChunks[phase.chunkIndex] || []).map(sc => (<span key={sc} className="badge badge-outline">{sc}</span>))}
          </div>
          <div className="divider my-1"></div>
          <div className="grid grid-cols-2 gap-2">
            {(subcatChunks[phase.chunkIndex] || []).flatMap(scKey => activitiesBySubcat[scKey] || []).map(a => {
              const active = selectedActivities.includes(a);
              return (
                <button key={a} className={`btn ${active ? 'btn-primary' : 'btn-outline'} h-16`} onClick={() => toggleActivity(a)}>
                  {a.replaceAll('_', ' ')}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase.type === 'marine' && (
        <div className="space-y-3 mt-2">
          <input className="input input-bordered w-full" placeholder="Search or enter a coastal location" value={marineLocation} onChange={(e) => setMarineLocation(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <button className="btn btn-outline" onClick={() => setMarineLocation('Use current location')}>Use current location</button>
            <button className="btn" onClick={() => setOpenCoastalModal(true)}>Use map</button>
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
          <div>
            <p className="text-sm text-base-content/70">Your activities:</p>
            <ul className="text-sm list-disc list-inside">
              {selectedActivities.length > 0 ? (
                selectedActivities.map(a => <li key={a}>{a.replaceAll('_', ' ')}</li>)
              ) : (
                <li>No activities chosen yet — we’ll suggest a few to start.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button className="btn" onClick={() => {
          if (phase.type === 'clusters') {
            if (selectedClusters.length === 0) (setSelectedClusters(["Active Sports", "Fitness & Wellness"]));
            setStep(2);
          } else if (phase.type === 'confirm') {
            alert('✅ Saved! Your personalised feed is ready.');
          } else {
            setStep(s => s + 1);
          }
        }}>{phase.type === 'confirm' ? 'Start Exploring' : 'Next'}</button>
        <button className="btn btn-outline" onClick={() => {
          if (phase.type === 'clusters') { setSelectedClusters(["Active Sports"]); setStep(2); } else { setStep(s => Math.max(1, s - 1)); }
        }}>{phase.type === 'clusters' ? 'Skip (quick start)' : 'Back'}</button>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MOCK SCREENS GALLERY
function MockScreens() {
  // Precomputed selections for mocks
  const mockCombinedSubcats = ["Outdoor Sports", "Indoor Sports", "Water Sports"]; // ≤3 → combined
  const mockChunkedSubcats = ["Outdoor Sports", "Indoor Sports", "Water Sports", "Action Sports", "Winter Sports"]; // >3 → chunked
  const activitiesBySubcat: Record<string, string[]> = {};
  TAXONOMY.forEach(c => c.subcategories.forEach(sc => (activitiesBySubcat[sc.key] = sc.acts)));

  const combinedActivities = Array.from(new Set(mockCombinedSubcats.flatMap(sc => activitiesBySubcat[sc] || []))).slice(0, 12);
  const chunk1 = mockChunkedSubcats.slice(0, 3);
  const chunk1Activities = chunk1.flatMap(sc => activitiesBySubcat[sc] || []).slice(0, 12);

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Screen A: Welcome / Clusters */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body gap-3">
          <ul className="steps w-full">
            <li className="step step-primary">Choose areas</li>
            <li className="step">Activities</li>
            <li className="step">Done</li>
          </ul>
          <h2 className="card-title justify-center text-2xl">👋 Welcome to GoDaisy!</h2>
          <p className="text-sm text-base-content/70 text-center">Choose a few areas you’re into — we’ll tailor the rest.</p>
          <div className="grid grid-cols-2 gap-2">
            {TAXONOMY.map(c => (
              <button key={c.key} className="btn btn-outline h-20 flex flex-col gap-1">
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs">{c.key}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn">Next</button>
            <button className="btn btn-outline">Skip (quick start)</button>
          </div>
        </div>
      </div>

      {/* Screen B: Activities (Combined) */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body gap-3">
          <ul className="steps w-full">
            <li className="step step-primary">Choose areas</li>
            <li className="step step-primary">Activities</li>
            <li className="step">Done</li>
          </ul>
          <div className="flex items-center justify-between -mb-1 mt-1">
            <span className="badge badge-ghost">Outdoor • Indoor • Water</span>
            <button className="btn btn-ghost btn-sm">Preselect popular</button>
          </div>
          <div className="divider my-1"></div>
          <div className="grid grid-cols-2 gap-2">
            {combinedActivities.map(a => (
              <button key={a} className="btn btn-outline h-16">{a.replaceAll('_',' ')}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn">Next</button>
            <button className="btn btn-outline">Back</button>
          </div>
        </div>
      </div>

      {/* Screen C: Activities (Chunk 1 of N) */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body gap-3">
          <ul className="steps w-full">
            <li className="step step-primary">Choose areas</li>
            <li className="step step-primary">Activities</li>
            <li className="step">Location</li>
            <li className="step">Done</li>
          </ul>
          <div className="flex flex-wrap gap-1 -mb-1 mt-1">
            {chunk1.map(sc => (<span key={sc} className="badge badge-outline">{sc}</span>))}
          </div>
          <div className="divider my-1"></div>
          <div className="grid grid-cols-2 gap-2">
            {chunk1Activities.map(a => (
              <button key={a} className="btn btn-outline h-16">{a.replaceAll('_',' ')}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn">Next</button>
            <button className="btn btn-outline">Back</button>
          </div>
        </div>
      </div>

      {/* Screen D: Marine Location */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body gap-3">
          <ul className="steps w-full">
            <li className="step step-primary">Choose areas</li>
            <li className="step step-primary">Activities</li>
            <li className="step step-primary">Location</li>
            <li className="step">Done</li>
          </ul>
          <h3 className="card-title justify-center">Set a coastal spot 🌊</h3>
          <input className="input input-bordered w-full" placeholder="Search or enter a coastal location" />
          <div className="grid grid-cols-3 gap-2">
            <button className="btn btn-outline">Use current location</button>
            <button className="btn">Use map</button>
            <button className="btn btn-primary">Save & Continue</button>
          </div>
          <button className="btn btn-ghost btn-sm">Skip for now</button>
        </div>
      </div>

      {/* Screen E: Confirmation */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body gap-3">
          <ul className="steps w-full">
            <li className="step step-primary">Choose areas</li>
            <li className="step step-primary">Activities</li>
            <li className="step step-primary">Done</li>
          </ul>
          <h3 className="card-title justify-center">🎉 All set!</h3>
          <p className="text-sm text-base-content/70 text-center">We’ve saved your activities. You can always add more later.</p>
          <ul className="text-sm list-disc list-inside">
            {combinedActivities.slice(0,6).map(a => (<li key={a}>{a.replaceAll('_',' ')}</li>))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn">Start Exploring</button>
            <button className="btn btn-outline">Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
