import React, { useState, useEffect } from "react";
import { activityTypes } from "../data/activityTypes";
import { useUserPreferences } from "../context/UserPreferencesContext";
import { useHasMounted } from "../utils/useHasMounted";
import CoastalLocationDialog from '../components/CoastalLocationDialog';

// The full set of activity IDs for each grouping—synchronize these with activityTypes!
const mainCategories = [
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
        key: "Relaxing Outdoors",
        icon: "🪵",
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
          "live_music",
          "theatre",
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
          "live_music",
          "theatre",
            "comedy",
                ],
            },
        ],
    },
];

// These are the activity IDs that should trigger a coastal spot dialog if chosen
const waterActivityIds = [
    "sea_kayaking",
    "canoeing",
    "surfing",
    "sup_sea",
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
];

// ------------- BREADCRUMB -------------
const Breadcrumb: React.FC<{ path: string[]; onBack: () => void }> = ({ path, onBack }) => (
    <div className="breadcrumb" style={{ marginBottom: 23 }}>
        {path.length > 1 && (
            <button className="back-button" onClick={onBack}>
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
    const [menuOpen, setMenuOpen] = useState(false);
    const hasMounted = useHasMounted();

    // Path for breadcrumb
    const path = [mainCat, subCat].filter(Boolean);

    // Use the up-to-date interests from preferences
    const interests: string[] = preferences.interests || [];

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
                        className="main-category-card"
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
                        className="subcategory-card"
                        onClick={() => setSubCat(sub.key)}
                    >
                        <span className="category-icon">{sub.icon}</span>
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
                                color: "#6b7280",
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
                {acts.map((act) => (
                    <div
                        key={act!.id}
                        className={`interest-card${
                            interests.includes(act!.id) ? " selected" : ""
                        }`}
                        onClick={() => toggleInterest(act!.id)}
                    >
                        {act!.name}
                    </div>
                ))}
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
                <header
                    className="homepage-banner"
                    style={{
                        position: 'relative',
                        minHeight: 60,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 0 8px 0',
                        background: '#fff',
                        borderBottom: '1px solid #e5e7eb',
                    }}
                >
                    {/* Hamburger icon: left */}
                    <img
                        src="/burger-menu-svgrepo-com.svg"
                        alt="Open menu"
                        className="burger-menu-icon"
                        style={{
                            width: 36,
                            height: 36,
                            cursor: 'pointer',
                            marginLeft: 12,
                            marginRight: 12,
                            zIndex: 10,
                            display: 'block',
                        }}
                        onClick={() => setMenuOpen(true)}
                    />

                    {/* Logo: left-aligned, next to hamburger */}
                    <a href="/" style={{ display: 'block' }}>
                        <img
                            src="/wotnow-horizontal.png"
                            alt="WotNow Logo"
                            className="homepage-banner__logo"
                            style={{
                                display: 'block',
                                maxWidth: 180,
                                height: 'auto',
                            }}
                        />
                    </a>

                    {/* Spacer to push content to right */}
                    <div style={{ flex: 1 }} />

                    {/* Page-specific text */}
                    <div className="homepage-banner__text" style={{ textAlign: 'right', paddingRight: '12px' }}>
                        <h2 className="homepage-banner__title" style={{ fontSize: '1.5rem', margin: 0, color: '#1f2937' }}>
                            Choose Your Interests
                        </h2>
                        <p className="homepage-banner__subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#6b7280' }}>
                            Pick activities you love
                        </p>
                    </div>

                    <style>{`
                        @media (max-width: 800px) {
                            .homepage-banner__text {
                                display: none !important;
                            }
                        }
                    `}</style>
                </header>
                
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
            <header
                className="homepage-banner"
                style={{
                    position: 'relative',
                    minHeight: 60,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0 8px 0',
                    background: '#fff',
                    borderBottom: '1px solid #e5e7eb',
                }}
            >
                {/* Hamburger icon: left */}
                <img
                    src="/burger-menu-svgrepo-com.svg"
                    alt="Open menu"
                    className="burger-menu-icon"
                    style={{
                        width: 36,
                        height: 36,
                        cursor: 'pointer',
                        marginLeft: 12,
                        marginRight: 12,
                        zIndex: 10,
                        display: 'block',
                    }}
                    onClick={() => setMenuOpen(true)}
                />

                {/* Logo: left-aligned, next to hamburger */}
                <a href="/" style={{ display: 'block' }}>
                    <img
                        src="/wotnow-horizontal.png"
                        alt="WotNow Logo"
                        className="homepage-banner__logo"
                        style={{
                            display: 'block',
                            maxWidth: 180,
                            height: 'auto',
                        }}
                    />
                </a>

                {/* Spacer to push content to right */}
                <div style={{ flex: 1 }} />

                {/* Page-specific text */}
                <div className="homepage-banner__text" style={{ textAlign: 'right', paddingRight: '12px' }}>
                    <h2 className="homepage-banner__title" style={{ fontSize: '1.5rem', margin: 0, color: '#1f2937' }}>
                        Choose Your Interests
                    </h2>
                    <p className="homepage-banner__subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#6b7280' }}>
                        Pick activities you love
                    </p>
                </div>

                <style>{`
                    @media (max-width: 800px) {
                        .homepage-banner__text {
                            display: none !important;
                        }
                    }
                `}</style>
            </header>

            {/* Mobile Navigation Menu */}
            {menuOpen && (
                <>
                  {/* Invisible overlay to detect clicks outside the menu */}
                  <div 
                    className="menu-overlay"
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 999,
                      cursor: 'default'
                    }}
                    onClick={() => setMenuOpen(false)}
                  />
                  
                  {/* Menu container */}
                  <nav
                    className="navigation-menu"
                    style={{
                      position: 'fixed',
                      zIndex: 1000,
                      top: 0,
                      left: 0
                    }}
                  >
                    {/* Menu content with properly rounded corners */}
                    <div 
                      className="menu-content"
                      style={{
                        background: '#2b323c',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        padding: '12px 24px',
                        minWidth: '220px',
                        maxWidth: '280px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        margin: '12px'
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent clicks from closing menu
                    >
                      <a href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Home</a>
        <a href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Manage my interests</a>
        <a href="/activities" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Scan my interests</a>
        <a href="/weather" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Local weather in detail</a>
        <button
                        onClick={() => setMenuOpen(false)}
                        style={{
                          marginTop: 24,
                          background: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#000'
                        }}
                      >
                        Close
                      </button>
                    </div>

                    <style jsx>{`
                      @media (min-width: 800px) {
                        .navigation-menu {
                          top: 60px; /* Position below header on desktop */
                        }
                        
                        .menu-content {
                          margin: 0 0 0 12px;
                          border-radius: 0 0 12px 12px !important; /* Only round bottom corners on desktop */
                        }
                        
                        .menu-content a:hover {
                          text-decoration: underline;
                        }
                        
                        .menu-content button {
                          display: none; /* Hide close button on desktop */
                        }
                      }
                      
                      @media (max-width: 799px) {
                        .menu-overlay {
                          background: rgba(0,0,0,0.7);
                        }
                      }
                    `}</style>
                  </nav>
                </>
            )}

        <div
            className="interests-page"
            style={{
                maxWidth: 650,
                margin: "0 auto",
                padding: "32px 18px",
            }}
        >

            <Breadcrumb path={["Interests", ...(path as string[])]} onBack={handleBack} />
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
                                className="selected-activity-btn"
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
                    <button
                        onClick={() => {
                            setMainCat(null);
                            setSubCat(null);
                        }}
                        style={{
                            padding: "12px 28px",
                            borderRadius: 9,
                            fontSize: "1.08rem",
                            background: "#3b82f6",
                            border: "none",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        ➕ Add More Interests
                    </button>
                )}
                <button
                    onClick={handleDone}
                    style={{
                        padding: "12px 28px",
                        borderRadius: 9,
                        fontSize: "1.08rem",
                        background: "#059669",
                        border: "none",
                        color: "#fff",
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