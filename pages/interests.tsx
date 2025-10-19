import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { getActivityName, ACTIVITY_NAME_MAP } from "../data/activityTypes";
import { useUserPreferences } from "../context/UserPreferencesContext";
import { useHasMounted } from "../utils/useHasMounted";
import AppHeader, { LocationLite } from '../components/AppHeader';
import { rankRecommendations } from '../app/settings/recommendations';
import { supabase } from '../lib/supabase/client';
import { getActivityEmoji } from '../data/emojiMap';

// The full set of activity IDs for each grouping
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
                    "rock_hopping",
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
                    "wild_swimming",
                    "outdoor_gardening",
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
          "outdoor_gardening",
          "gaming",
          "reading",
          "going_to_pub",
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

const RECO_DISMISSED_LS = 'godaisy.reco.dismissed';

// Popular activities to suggest when curated recommendations run out
// These are broad-appeal activities that work for most users
const POPULAR_FALLBACK_ACTIVITIES = [
  // Outdoor & Nature (universal appeal)
  'hiking',
  'beach',
  'picnicking',
  'dog_walking',
  'camping',
  'stargazing',
  'birdwatching',

  // Fitness & Wellness (low barrier to entry)
  'running',
  'cycling',
  'yoga',
  'gym_workout',
  'wild_swimming',
  'pilates',

  // Social & Leisure (broad appeal)
  'going_to_pub',
  'cafe',
  'cinema',
  'reading',
  'cooking',
  'bbq',
  'picnicking',

  // Sports (popular participation)
  'football_soccer',
  'tennis',
  'golf',
  'basketball_outdoor',
  'badminton',

  // Creative (accessible)
  'painting',
  'photography',
  'crafts',
  'outdoor_painting',

  // Indoor Recreation (weather-independent)
  'indoor_swimming',
  'museum',
  'gaming',
  'watch_a_movie',
  'gallery',
];

// Components
interface SelectedActivitiesBarProps {
  activities: Array<{ id: string; name: string; icon: React.ReactNode }>;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function SelectedActivitiesBar({ activities, onRemove, onClear }: SelectedActivitiesBarProps) {
  const [expanded, setExpanded] = useState(false);
  const displayLimit = 6;

  if (activities.length === 0) {
    return (
      <div className="alert alert-info">
        <span>👋 Start by selecting activities from the suggestions below or browse categories</span>
      </div>
    );
  }

  const visibleActivities = expanded ? activities : activities.slice(0, displayLimit);
  const hiddenCount = activities.length - displayLimit;

  return (
    <div className="card bg-base-200/50 border border-base-300">
      <div className="card-body py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <span className="font-semibold">Your Selected Activities ({activities.length})</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onClear}
          >
            Clear all
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleActivities.map(({ id, name, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onRemove(id)}
              className="btn btn-sm btn-primary gap-1 normal-case"
              title={`Remove ${name}`}
            >
              <span>{icon}</span>
              <span>{name}</span>
              <span className="ml-1">×</span>
            </button>
          ))}
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setExpanded(true)}
            >
              +{hiddenCount} more
            </button>
          )}
          {expanded && activities.length > displayLimit && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setExpanded(false)}
            >
              Show less
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface RecommendationsSectionProps {
  suggestions: string[];
  onAdd: (id: string) => void;
  onDismiss: (id: string) => void;
  hasFallbacks?: boolean;
}

function RecommendationsSection({ suggestions, onAdd, onDismiss, hasFallbacks = false }: RecommendationsSectionProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="card bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
      <div className="card-body py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-semibold text-lg">
              {hasFallbacks ? 'Popular activities you might enjoy' : 'You might also like'}
            </h3>
            <p className="text-sm opacity-70">
              {hasFallbacks
                ? 'These popular activities are enjoyed by people with diverse interests'
                : "Based on your interests, we think you'd enjoy these activities"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {suggestions.map((id) => {
            const icon = getActivityEmoji(id);
            const name = getActivityName(id);

            return (
              <div key={id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAdd(id)}
                  className="btn btn-outline justify-start h-10 normal-case rounded-xl flex items-center gap-2 border-accent text-accent hover:bg-accent/10 flex-1"
                  title="Add to your interests"
                >
                  <span className="text-accent font-bold">+</span>
                  {icon && <span>{icon}</span>}
                  <span className="truncate">{name}</span>
                </button>

                <button
                  type="button"
                  aria-label="Dismiss suggestion"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onDismiss(id)}
                  title="Not interested"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-xs opacity-60 mt-2">
          💡 Tip: Dismiss suggestions you&apos;re not interested in right now - they&apos;ll come back later
        </div>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: typeof mainCategories[0];
  selectedCount: number;
  expanded: boolean;
  onToggle: () => void;
  hasSelections: boolean;
  children: React.ReactNode;
}

function CategoryCard({ category, selectedCount, expanded, onToggle, hasSelections, children }: CategoryCardProps) {
  return (
    <div className={`card bg-base-100 border ${hasSelections ? 'border-primary/30' : 'border-base-300'}`}>
      <div className="card-body p-0">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-between p-4 hover:bg-base-200/50 transition-colors"
          style={{ color: 'rgb(31, 41, 55)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{category.icon}</span>
            <div className="text-left">
              <span className="font-semibold text-lg">{category.key}</span>
              {selectedCount > 0 && (
                <span className="ml-2 badge badge-primary badge-sm">
                  {selectedCount} selected
                </span>
              )}
            </div>
          </div>
          <span className="text-xl">{expanded ? '▼' : '▶'}</span>
        </button>

        {expanded && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

interface SubcategorySectionProps {
  subcategory: { key: string; icon: string; acts: string[] };
  selectedIds: string[];
  onToggle: (id: string) => void;
}

function SubcategorySection({ subcategory, selectedIds, onToggle }: SubcategorySectionProps) {
  const selectedSet = new Set(selectedIds);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{subcategory.icon}</span>
        <span className="font-medium" style={{ color: 'rgb(31, 41, 55)' }}>{subcategory.key}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {subcategory.acts.map((actId) => {
          const selected = selectedSet.has(actId);
          const icon = getActivityEmoji(actId);
          const name = getActivityName(actId);

          return (
            <button
              key={actId}
              type="button"
              onClick={() => onToggle(actId)}
              className={`btn btn-sm justify-start gap-2 normal-case ${
                selected ? 'btn-primary' : 'btn-outline'
              }`}
              style={!selected ? { color: 'rgb(31, 41, 55)' } : undefined}
            >
              {selected && <span>✓</span>}
              {icon && <span>{icon}</span>}
              <span className="truncate">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Main page component
const InterestsTest: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [dismissedRecos, setDismissedRecos] = useState<Record<string, number>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const hasMounted = useHasMounted();

  const interests = useMemo(() => preferences.interests || [], [preferences.interests]);

  // Load dismissed recommendations from localStorage (map of activityId -> timestamp)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECO_DISMISSED_LS);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Handle both old format (array) and new format (object with timestamps)
        if (Array.isArray(parsed)) {
          // Convert old format to new format with current timestamp
          const now = Date.now();
          const dismissedMap: Record<string, number> = {};
          parsed.forEach((id: string) => {
            dismissedMap[id] = now;
          });
          setDismissedRecos(dismissedMap);
          // Update localStorage to new format
          localStorage.setItem(RECO_DISMISSED_LS, JSON.stringify(dismissedMap));
        } else if (typeof parsed === 'object' && parsed !== null) {
          setDismissedRecos(parsed);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Generate suggestions using the recommendation engine with fallback to popular activities
  const { suggestions, hasFallbacks } = useMemo(() => {
    const selectedSet = new Set(interests);
    const TARGET_SUGGESTIONS = 6;

    // Sort by dismissal timestamp (not dismissed first, then oldest dismissals first)
    const sortByDismissal = (items: string[]) => {
      return [...items].sort((a, b) => {
        const aTime = dismissedRecos[a] || 0;
        const bTime = dismissedRecos[b] || 0;
        // Not dismissed (0) comes before dismissed
        // Among dismissed, older (smaller timestamp) comes first
        return aTime - bTime;
      });
    };

    // If no interests selected, show popular activities to get started
    if (interests.length === 0) {
      const fallbackPool = POPULAR_FALLBACK_ACTIVITIES.filter(
        id => !selectedSet.has(id)
      );
      const sorted = sortByDismissal(fallbackPool);
      return {
        suggestions: sorted.slice(0, TARGET_SUGGESTIONS),
        hasFallbacks: true,
      };
    }

    // First, try curated recommendations based on user's interests
    const curatedPool = rankRecommendations(interests, {
      limit: 50, // Get more to work with after sorting
      labelMap: ACTIVITY_NAME_MAP,
    });

    const curatedFiltered = curatedPool.filter(
      id => !selectedSet.has(id)
    );

    // Sort curated by dismissal (non-dismissed first, then by oldest dismissal)
    const curatedSorted = sortByDismissal(curatedFiltered);

    // If we have enough curated suggestions, use them
    if (curatedSorted.length >= TARGET_SUGGESTIONS) {
      return {
        suggestions: curatedSorted.slice(0, TARGET_SUGGESTIONS),
        hasFallbacks: false,
      };
    }

    // Not enough curated suggestions - add popular fallbacks
    const fallbackPool = POPULAR_FALLBACK_ACTIVITIES.filter(
      id => !selectedSet.has(id) && !curatedFiltered.includes(id)
    );

    // Sort fallbacks by dismissal
    const fallbackSorted = sortByDismissal(fallbackPool);

    // Combine curated + fallback, both already sorted
    const combined = [...curatedSorted, ...fallbackSorted];

    return {
      suggestions: combined.slice(0, TARGET_SUGGESTIONS),
      hasFallbacks: fallbackSorted.length > 0 && combined.length > curatedSorted.length,
    };
  }, [interests, dismissedRecos]);

  // Calculate selected counts per category
  const selectedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    mainCategories.forEach(cat => {
      const catActivities = cat.subcategories.flatMap(sub => sub.acts);
      counts[cat.key] = catActivities.filter(id => interests.includes(id)).length;
    });
    return counts;
  }, [interests]);

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleInterest = (id: string) => {
    setPreferences(prev => {
      const chosen = prev.interests ?? [];
      const newList = chosen.includes(id)
        ? chosen.filter((i) => i !== id)
        : [...chosen, id];
      return { ...prev, interests: newList };
    });
  };

  const dismissSuggestion = (id: string) => {
    setDismissedRecos(prev => {
      const next = { ...prev, [id]: Date.now() };
      try {
        localStorage.setItem(RECO_DISMISSED_LS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const addActivity = (id: string) => {
    toggleInterest(id);
    dismissSuggestion(id); // Move to back of queue after adding
    showSuccessToast(`Added ${getActivityName(id)}!`);
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSave = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // User is signed in - save to Supabase profiles table
        const { error } = await supabase
          .from('profiles')
          .update({ activities: interests })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving to Supabase:', error);
          showSuccessToast('Saved locally! (Supabase sync failed)');
        } else {
          showSuccessToast('Your interests have been saved!');
        }
      } else {
        // User not signed in - just localStorage (already handled by setPreferences)
        showSuccessToast('Your interests have been saved locally!');
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      showSuccessToast('Your interests have been saved locally!');
    }

    // Redirect after toast
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = "/";
      }
    }, 1500);
  };

  if (!hasMounted) {
    return (
      <>
        <Head>
          <title>My Interests - Go Daisy</title>
        </Head>
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
      <Head>
        <title>My Interests - Go Daisy</title>
      </Head>
      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content">
        <AppHeader
          homeLocation={preferences.locations?.find((loc) => loc.type === 'home') as LocationLite | undefined}
          coastalLocation={preferences.locations?.find((loc) => loc.type === 'coastal') as LocationLite | undefined}
          onOpenHomeDialog={() => {}}
          onOpenCoastDialog={() => {}}
        />

        <div className="container mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Your Interests</h1>
            <p className="text-base-content/70">
              Select activities you enjoy or want to try. We&apos;ll suggest the best days for each.
            </p>
          </div>

          {/* Sticky Selected Bar */}
          <div className="sticky top-16 z-10 bg-base-100/95 backdrop-blur pb-4">
            <SelectedActivitiesBar
              activities={interests.map(id => ({
                id,
                name: getActivityName(id),
                icon: getActivityEmoji(id),
              }))}
              onRemove={toggleInterest}
              onClear={() => setPreferences(prev => ({ ...prev, interests: [] }))}
            />
          </div>

          {/* Recommendations Section */}
          <div className="mt-4">
            <RecommendationsSection
              suggestions={suggestions}
              onAdd={addActivity}
              onDismiss={dismissSuggestion}
              hasFallbacks={hasFallbacks}
            />
          </div>

          {/* Category Accordion */}
          <div className="space-y-3 mt-6">
            {mainCategories.map(category => {
              const isExpanded = expandedCategories.includes(category.key);
              const selectedCount = selectedCountByCategory[category.key] || 0;
              const hasSelections = selectedCount > 0;

              return (
                <CategoryCard
                  key={category.key}
                  category={category}
                  selectedCount={selectedCount}
                  expanded={isExpanded}
                  onToggle={() => toggleCategory(category.key)}
                  hasSelections={hasSelections}
                >
                  {category.subcategories.map(sub => (
                    <SubcategorySection
                      key={sub.key}
                      subcategory={sub}
                      selectedIds={interests}
                      onToggle={toggleInterest}
                    />
                  ))}
                </CategoryCard>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center mt-8">
            <button onClick={handleSave} className="btn btn-primary btn-lg">
              ✅ Save Changes
            </button>
          </div>
        </div>

        {/* Toast */}
        {showToast && (
          <div className="toast toast-top toast-center z-50">
            <div className="alert alert-success">
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default InterestsTest;

// Disable static generation
export async function getServerSideProps() {
  return { props: {} };
}
