import React, { useState, useEffect, useMemo } from "react";
// Removed unused Link import
import { activityTypes } from "../data/activityTypes";
import { useUserPreferences } from "../context/UserPreferencesContext";
import { useHasMounted } from "../utils/useHasMounted";
import CoastalLocationDialog from '../components/CoastalLocationDialog';
import AppHeader, { LocationLite } from '../components/AppHeader';

// The full set of activity IDs for each grouping—synchronize these with activityTypes!
const mainCategories = [
    {
        key: "Active Sports",
        icon: "🏃‍♂️",
        subcategories: [
            {
                key: "Team Sports",
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
                    "ice_hockey_us",
                ],
            },
            {
                key: "Individual Sports",
                icon: "🎾",
                acts: [
                    "golf",
                    "tennis",
                    "tennis_indoor",
                    "squash",
                    "badminton",
                    "table_tennis",
                    "archery",
                    "pickleball",
                    "volleyball_indoor",
                    "padel",
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
                    "gravel_biking",
                    "rock_climbing",
                    "indoor_climbing",
                    "skateboarding",
                    "rollerblading",
					"riding_motorbike",
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
                    "martial_arts",
                    "tai_chi",
                ],
            },
            {
                key: "Cardio & Running",
                icon: "🏃",
                acts: ["running", "trail_running", "cycling", "urban_exploring"],
            },
            {
                key: "Strength & Gym",
                icon: "🏋️‍♂️",
                acts: ["gym_workout", "outdoor_gym", "zumba", "boxing", "spinning"],
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
                key: "Recreation",
                icon: "🍔",
                acts: [
                    "picnicking",
                    "bbq",
                    "beach",
                    "geocaching",
                    "camping",
                    "outdoor_reading",
                    "dog_walking",
                    "outdoor_playground",
                    "outdoor_chess",
                    "outdoor_painting",
                    "outdoor_music",
                    "outdoor_gym",
                    "outdoor_meditation",
                    "outdoor_yoga",
                ],
            },
        ],
    },
    {
        key: "Winter Sports",
        icon: "❄️",
        subcategories: [
            {
                key: "Snow Sports",
                icon: "⛷️",
                acts: ["skiing", "snowboarding", "cross_country_skiing"],
            },
            {
                key: "Ice Sports",
                icon: "⛸️",
                acts: [
                    "ice_skating",
                    "curling",
                    "ice_hockey",
                    "ice_fishing",
                    "ice_hockey_indoor",
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
                ],
            },
            {
                key: "Music & Performance",
                icon: "🎷",
                acts: [
                    "playing_records",
                    "make_music",
                    "dance",
                    "outdoor_music",
                ],
            },
            {
                key: "Literature & Learning",
                icon: "📚",
                acts: ["reading", "outdoor_reading"],
            },
        ],
    },
    {
        key: "Indoor Recreation",
        icon: "🏠",
        subcategories: [
            {
                key: "Home Activities",
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
					
                ],
            },
            {
                key: "Social Activities",
                icon: "🍻",
                acts: [
                    "going_to_pub",
                    "table_tennis",
                    "playing_cards",
                    "watch_a_movie",
                    "cafe",
                    "cinema",
                    "museum",
                    "shopping",
                    "dance",
					"gallery",
					"bowling",
                ],
            },
            {
                key: "Indoor Sports",
                icon: "🏓",
                acts: [
                    "indoor_climbing",
                    "squash",
                    "badminton",
                    "tennis_indoor",
                    "indoor_swimming",
                    "gym_workout",
                    "pilates",
                    "yoga",
                    "meditation",
                ],
            },
        ],
    },
];

// These are the activity IDs that should trigger a coastal spot dialog if chosen
const waterActivityIds = [

    "canoeing",
    "surfing",
    
    "snorkeling",
    "kitesurfing",
    "windsurfing",
    "jet_skiing",
    "scuba_diving",
    "sailing",
    "sea_fishing_shore",
    "sea_fishing_boat",
    "beach",
    "beach_volleyball",
    "sea_swimming",
    "sup_sea",
    "sea_kayaking"
];

// ------------- BREADCRUMB -------------
const Breadcrumb: React.FC<{ path: string[]; onBack: () => void }> = ({ path, onBack }) => (
  <div className="flex items-center justify-between mb-6">
    {path.length > 1 ? (
      <button className="btn btn-sm btn-ghost" onClick={onBack}>
        ← Back
      </button>
    ) : <span />}
    <nav className="breadcrumbs text-sm" aria-label="breadcrumbs">
      <ul>
        {path.map((seg, i) => (
          <li key={`${seg}-${i}`}>{seg}</li>
        ))}
      </ul>
    </nav>
  </div>
);

// ------------- MAIN PAGE COMPONENT -------------
const Interests: React.FC = () => {
    const { preferences, setPreferences } = useUserPreferences();
    const [mainCat, setMainCat] = useState<string | null>(null);
    const [subCat, setSubCat] = useState<string | null>(null);
    const [showCoastDialog, setShowCoastDialog] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const hasMounted = useHasMounted();

    // Path for breadcrumb
    const path = [mainCat, subCat].filter(Boolean) as string[];

    // Use the up-to-date interests from preferences
    const interests: string[] = useMemo(() => preferences.interests || [], [preferences.interests]);

    // Dialog logic for coastal activities
    useEffect(() => {
        const wantsCoast = interests.some((id) => waterActivityIds.includes(id));
        const hasCoast = preferences.locations?.some((l) => l.type === "coastal");
        if (wantsCoast && !hasCoast) setShowCoastDialog(true);
    }, [interests, preferences.locations]);

    // Add this effect to log current interests
    useEffect(() => {
      console.log('Current interests from preferences:', preferences.interests);
    }, [preferences.interests]);

    const handleCoastSave = (loc: { name: string; lat: number; lon: number }) => {
        setPreferences((prev) => ({
            ...prev,
            locations: [...(prev.locations || []), { ...loc, type: "coastal" }],
        }));
        setShowCoastDialog(false);
    };

    const toggleInterest = (id: string) => {
        setPreferences((prev) => {
            const chosen = prev.interests ?? [];
            const newList = chosen.includes(id)
                ? chosen.filter((i) => i !== id)
                : [...chosen, id];
            console.log('Updated interests list:', newList);
            return { ...prev, interests: newList };
        });
    };

    const handleBack = () => {
        if (subCat) setSubCat(null);
        else if (mainCat) setMainCat(null);
    };

    // Render content according to step
    let content: React.ReactNode;
    if (!mainCat) {
      content = (
        <div className="grid gap-3 sm:grid-cols-2">
          {mainCategories.map((cat) => (
            <button
              key={cat.key}
              className="btn btn-lg btn-outline justify-start gap-3"
              onClick={() => setMainCat(cat.key)}
              type="button"
            >
              <span className="text-2xl" aria-hidden>{cat.icon}</span>
              <span className="font-semibold">{cat.key}</span>
            </button>
          ))}
        </div>
      );
    } else if (!subCat) {
      const mainObj = mainCategories.find((c) => c.key === mainCat)!;
      content = (
        <div className="grid gap-3 sm:grid-cols-2">
          {mainObj.subcategories.map((sub) => (
            <button
              key={sub.key}
              className="btn btn-outline justify-between"
              onClick={() => setSubCat(sub.key)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>{sub.icon}</span>
                <span className="font-semibold">{sub.key}</span>
              </span>
              <span className="text-xs opacity-70">{sub.acts.length} activities</span>
            </button>
          ))}
        </div>
      );
    } else {
      const mainObj = mainCategories.find((c) => c.key === mainCat)!;
      const subObj = mainObj.subcategories.find((s) => s.key === subCat)!;
      const acts = subObj.acts
        .map((id) => activityTypes.find((a) => a.id === id))
        .filter(Boolean)
        .sort((a, b) => a!.name.localeCompare(b!.name));
      content = (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {acts.map((act) => {
            const selected = interests.includes(act!.id);
            return (
              <button
                key={act!.id}
                type="button"
                className={`btn w-full normal-case ${selected ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => toggleInterest(act!.id)}
              >
                {selected && <span className="mr-1">✓</span>}
                {act!.name}
              </button>
            );
          })}
        </div>
      );
    }

    const handleDone = () => {
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
            if (typeof window !== 'undefined') {
                window.location.href = "/";
            }
        }, 2200);
    };

    // Remove the early hydration check that's causing hook ordering issues
    if (!hasMounted) {
      return (
        <>
          <AppHeader />
          <div data-theme="light" className="min-h-[60vh] bg-base-100 text-base-content">
            <div className="container mx-auto max-w-3xl px-4 py-12">
              <div className="text-center">
                <div className="text-3xl mb-2">⏳</div>
                <p>Loading your interests…</p>
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {/* Header banner */}
        <div data-theme="light" className="min-h-screen bg-base-100 text-base-content">
          <AppHeader
            homeLocation={preferences.locations?.find((loc) => loc.type === 'home') as LocationLite | undefined}
            coastalLocation={preferences.locations?.find((loc) => loc.type === 'coastal') as LocationLite | undefined}
            onOpenHomeDialog={() => setShowCoastDialog(true)}
            onOpenCoastDialog={() => setShowCoastDialog(true)}
          />

          <div className="container mx-auto max-w-3xl px-4 py-8">
            <Breadcrumb path={["Interests", ...path]} onBack={handleBack} />
            {content}

            {interests.length > 0 && (
              <section className="mt-7 flex flex-wrap gap-2 justify-center" aria-label="Your Selected Activities">
                {interests
                  .map((id) => activityTypes.find((a) => a.id === id))
                  .filter(Boolean)
                  .map((act) => (
                    <button
                      key={act!.id}
                      onClick={() => toggleInterest(act!.id)}
                      className="btn btn-outline btn-primary btn-sm rounded-full"
                      aria-label={`Remove ${act!.name} from selected interests`}
                    >
                      {act!.name}
                      <span className="ml-1">×</span>
                    </button>
                  ))}
              </section>
            )}

            <div className="flex justify-center gap-4 mt-10">
              {(mainCat || subCat) && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setMainCat(null);
                    setSubCat(null);
                  }}
                >
                  ➕ Add More Interests
                </button>
              )}
              <button onClick={handleDone} className="btn btn-outline">
                ✅ I&apos;m Done
              </button>
            </div>

            {showToast && (
              <div className="toast toast-bottom toast-center">
                <div className="alert alert-success">
                  <span>You&apos;ve chosen a fine array of activities. It&apos;s good to be you!</span>
                </div>
              </div>
            )}

            <CoastalLocationDialog
              open={showCoastDialog}
              onClose={() => setShowCoastDialog(false)}
              title="Pick your beach or coastal spot"
              onSave={handleCoastSave}
              homeLocation={preferences.locations?.find((loc) => loc.type === 'home')}
              coastalLocation={preferences.locations?.find((loc) => loc.type === 'coastal')}
              setHomeLocation={(loc) => {
                setPreferences((prev) => ({
                  ...prev,
                  locations: [...(prev.locations || []), { ...loc, type: "home" }],
                }));
              }}
              setCoastalLocation={(loc) => {
                setPreferences((prev) => ({
                  ...prev,
                  locations: [...(prev.locations || []), { ...loc, type: "coastal" }],
                }));
              }}
            />
          </div>
        </div>
      </>
    );
};

export default Interests;
