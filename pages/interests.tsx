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
    <div className="breadcrumb" style={{ marginBottom: 23 }}>
        {path.length > 1 && (
            <button className="btn btn-primary" onClick={onBack}>
                ← Back
            </button>
        )}
        <span>{path.join(" / ")}</span>
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
            <div className="main-categories-grid">
                {mainCategories.map((cat) => (
                    <div
                        key={cat.key}
                        className="btn btn-primary"
                        onClick={() => setMainCat(cat.key)}
                    >
                        <span className="category-icon">{cat.icon}</span>
                        <span className="category-name">{cat.key}</span>
                    </div>
                ))}
            </div>
        );
    } else if (!subCat) {
        const mainObj = mainCategories.find((c) => c.key === mainCat)!;
        content = (
            <div className="subcategories-grid">
                {mainObj.subcategories.map((sub) => (
                    <div
                        key={sub.key}
                        className="btn btn-primary"
                        onClick={() => setSubCat(sub.key)}
                    >
                        <span className="btn btn-primary">{sub.icon}</span>
                        <h3
                            style={{
                                display: "inline-block",
                                marginRight: 12,
                            }}
                        >
                            {sub.key}
                        </h3>
                        <span
                            style={{
                                color: "#000000",
                                fontSize: 14,
                            }}
                        >
                            {sub.acts.length} activities
                        </span>
                    </div>
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
            <div className="interests-grid">
                {acts.map((act) => {
                    const selected = interests.includes(act!.id);
                    return (
                        <button
                            key={act!.id}
                            type="button"
                            className={`btn w-full normal-case ${selected ? 'btn-primary' : 'btn-outline btn-primary'}`}
                            onClick={() => toggleInterest(act!.id)}
                        >
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
                {/* Header banner */}
                <AppHeader
                  homeLocation={preferences.locations?.find((loc) => loc.type === 'home') as LocationLite | undefined}
                  coastalLocation={preferences.locations?.find((loc) => loc.type === 'coastal') as LocationLite | undefined}
                  onOpenHomeDialog={() => setShowCoastDialog(true)}
                  onOpenCoastDialog={() => setShowCoastDialog(true)}
                />
                {/* Loading state */}
                <div className="interests-page" style={{ maxWidth: 650, margin: "0 auto", padding: "32px 18px" }}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>⏳</div>
                        <div>Loading your interests...</div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Header banner */}
            <AppHeader
              homeLocation={preferences.locations?.find((loc) => loc.type === 'home') as LocationLite | undefined}
              coastalLocation={preferences.locations?.find((loc) => loc.type === 'coastal') as LocationLite | undefined}
              onOpenHomeDialog={() => setShowCoastDialog(true)}
              onOpenCoastDialog={() => setShowCoastDialog(true)}
            />

        <div
            className="interests-page"
            style={{
                maxWidth: 650,
                margin: "0 auto",
                padding: "32px 18px",
            }}
        >

            <Breadcrumb path={["Interests", ...path]} onBack={handleBack} />
            {content}

            {/* Selected activities */}
            {interests.length > 0 && (
                <section
                    className="selected-activities-container"
                    aria-label="Your Selected Activities"
                    style={{ marginTop: 28, justifyContent: "center" }}
                >
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
                                <span>×</span>
                            </button>
                        ))}
                </section>
            )}

            {/* Buttons below */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 24,
                    marginTop: 42,
                }}
            >
                {(mainCat || subCat) && (
                    <button className="btn btn-primary"
                        onClick={() => {
                            setMainCat(null);
                            setSubCat(null);
                        }}
                        
                        style={{
                            padding: "12px 28px",
                            borderRadius: 9,
                            fontSize: "1.08rem",
                            // background handled by class
                            // background: "#3b82f6",
                            // color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        ➕ Add More Interests
                    </button>
                )}
                <button
                    onClick={handleDone}
                    className="btn-outline"
                    style={{
                        padding: "12px 28px",
                        borderRadius: 9,
                        fontSize: "1.08rem",

                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    ✅ I'm Done
                </button>
            </div>

            {showToast && (
                <div
                    className="custom-toast show"
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                        position: "fixed",
                        bottom: "2.5rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#059669",
                        color: "#fff",
                        padding: "1.1rem 2.2rem",
                        borderRadius: 15,
                        fontSize: "1.14rem",
                        zIndex: 1009,
                        fontWeight: 600,
                    }}
                >
                    You've chosen a fine array of activities. It's good to be you!
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
        </>
    );
};

export default Interests;
