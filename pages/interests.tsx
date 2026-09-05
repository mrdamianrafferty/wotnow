import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { getActivityName, ACTIVITY_NAME_MAP } from "../data/activityTypes";
import { useUserPreferences } from "../context/UserPreferencesContext";
import { useHasMounted } from "../utils/useHasMounted";
import AppHeader, { LocationLite } from '../components/AppHeader';
import { rankRecommendations } from '../app/settings/recommendations';
import { supabase } from '../lib/supabase/client';
import { getActivityEmoji } from '../data/emojiMap';
import { useUIText } from '../hooks/useUIText';
import { useTranslationMap } from '../lib/translation/useTranslationMap';
import { ACTIVITY_GROUPS } from '@/data/activityGroups';

// The curated grouping now lives in data/activityGroups.ts so /start can
// order its expanded list the same way. `mainCategories` is kept as a local
// alias so the rest of this page reads unchanged.
const mainCategories = ACTIVITY_GROUPS;

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

  // Translation hooks
  const startSelectingText = useUIText('interests.paragraph._start_by_selecting_activities_337',
    '👋 Start by selecting activities from the suggestions below or browse categories');
  const yourSelectedText = useUIText('interests.label.your_selected_activities',
    'Your Selected Activities');
  const clearAllText = useUIText('interests.button.clear_all', 'Clear all');
  const moreText = useUIText('interests.button.more', 'more');
  const showLessText = useUIText('interests.button.show_less', 'Show less');
  const removeText = useUIText('interests.button.remove', 'Remove');

  if (activities.length === 0) {
    return (
      <div className="alert alert-info">
        <span>{startSelectingText}</span>
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
            <span className="font-semibold">{yourSelectedText} ({activities.length})</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onClear}
          >
            {clearAllText}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleActivities.map(({ id, name, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onRemove(id)}
              className="btn btn-sm btn-primary gap-1 normal-case"
              title={`${removeText} ${name}`}
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
              +{hiddenCount} {moreText}
            </button>
          )}
          {expanded && activities.length > displayLimit && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setExpanded(false)}
            >
              {showLessText}
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
  getTranslatedName: (id: string) => string;
}

function RecommendationsSection({ suggestions, onAdd, onDismiss, hasFallbacks = false, getTranslatedName }: RecommendationsSectionProps) {
  // Translation hooks
  const youMightAlsoLike = useUIText('interests.label.you_might_also_like_343', 'You might also like');
  const popularActivities = useUIText('interests.label.popular_activities_you_might_enj_344', 'Popular activities you might enjoy');
  const basedOnInterests = useUIText('interests.paragraph.based_on_your_interests_we_th_345',
    "Based on your interests, we think you'd enjoy these activities");
  const thesePopular = useUIText('interests.paragraph.these_popular_activities_are_e_346',
    'These popular activities are enjoyed by people with diverse interests');
  const addToInterests = useUIText('interests.button.add_to_your_interests_347', 'Add to your interests');
  const dismissSuggestion = useUIText('interests.label.dismiss_suggestion_349', 'Dismiss suggestion');
  const notInterested = useUIText('interests.label.not_interested_350', 'Not interested');
  const tipDismiss = useUIText('interests.paragraph.tip_dismiss_suggestions_you_re_351',
    "💡 Tip: Dismiss suggestions you're not interested in right now - they'll come back later");

  if (suggestions.length === 0) return null;

  return (
    <div className="card bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
      <div className="card-body py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-semibold text-lg">
              {hasFallbacks ? popularActivities : youMightAlsoLike}
            </h3>
            <p className="text-sm opacity-70">
              {hasFallbacks ? thesePopular : basedOnInterests}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {suggestions.map((id) => {
            const icon = getActivityEmoji(id);
            const name = getTranslatedName(id);

            return (
              <div key={id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAdd(id)}
                  className="btn btn-outline justify-start h-10 normal-case rounded-xl flex items-center gap-2 border-accent text-accent hover:bg-accent/10 flex-1"
                  title={addToInterests}
                >
                  <span className="text-accent font-bold">+</span>
                  {icon && <span>{icon}</span>}
                  <span className="truncate">{name}</span>
                </button>

                <button
                  type="button"
                  aria-label={dismissSuggestion}
                  className="btn btn-ghost btn-xs"
                  onClick={() => onDismiss(id)}
                  title={notInterested}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-xs opacity-60 mt-2">
          {tipDismiss}
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
  // Translation hooks
  const selectedLabel = useUIText('interests.label.selected_352', 'selected');

  // Category translations - map category key to translation
  const categoryTranslations: Record<string, string> = {
    'Active Sports': useUIText('interests.label.active_sports_314', 'Active Sports'),
    'Fitness & Wellness': useUIText('interests.label.fitness_wellness_319', 'Fitness & Wellness'),
    'Outdoor Activities': useUIText('interests.label.outdoor_activities_322', 'Outdoor Activities'),
    'Winter Sports': useUIText('interests.label.winter_sports_325', 'Winter Sports'),
    'Creative & Arts': useUIText('interests.label.creative_arts_328', 'Creative & Arts'),
    'Indoor Recreation': useUIText('interests.label.indoor_recreation_332', 'Indoor Recreation'),
  };

  const translatedCategoryName = categoryTranslations[category.key] || category.key;

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
              <span className="font-semibold text-lg">{translatedCategoryName}</span>
              {selectedCount > 0 && (
                <span className="ml-2 badge badge-primary badge-sm">
                  {selectedCount} {selectedLabel}
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
  getTranslatedName: (id: string) => string;
}

function SubcategorySection({ subcategory, selectedIds, onToggle, getTranslatedName }: SubcategorySectionProps) {
  const selectedSet = new Set(selectedIds);

  // Subcategory translations
  const subcategoryTranslations: Record<string, string> = {
    'Team Sports': useUIText('interests.label.team_sports_315', 'Team Sports'),
    'Individual Sports': useUIText('interests.label.individual_sports_316', 'Individual Sports'),
    'Water Sports': useUIText('interests.label.water_sports_317', 'Water Sports'),
    'Action Sports': useUIText('interests.label.action_sports_318', 'Action Sports'),
    'Mindfulness': useUIText('interests.label.mindfulness_336', 'Mindfulness'),
    'Cardio & Running': useUIText('interests.label.cardio_running_320', 'Cardio & Running'),
    'Strength & Gym': useUIText('interests.label.strength_gym_321', 'Strength & Gym'),
    'Nature Activities': useUIText('interests.label.nature_activities_323', 'Nature Activities'),
    'Fishing': useUIText('interests.label.fishing_338', 'Fishing'),
    'Kicking Back and Relaxing': useUIText('interests.label.kicking_back_and_relaxing_324', 'Kicking Back and Relaxing'),
    'Snow Sports': useUIText('interests.label.snow_sports_326', 'Snow Sports'),
    'Ice Sports': useUIText('interests.label.ice_sports_327', 'Ice Sports'),
    'Visual Arts': useUIText('interests.label.visual_arts_329', 'Visual Arts'),
    'Music & Performance': useUIText('interests.label.music_performance_330', 'Music & Performance'),
    'Literature & Learning': useUIText('interests.label.literature_learning_331', 'Literature & Learning'),
    'Home Activities': useUIText('interests.label.home_activities_333', 'Home Activities'),
    'Social Activities': useUIText('interests.label.social_activities_334', 'Social Activities'),
    'Indoor Sports': useUIText('interests.label.indoor_sports_335', 'Indoor Sports'),
  };

  const translatedSubcategoryName = subcategoryTranslations[subcategory.key] || subcategory.key;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{subcategory.icon}</span>
        <span className="font-medium" style={{ color: 'rgb(31, 41, 55)' }}>{translatedSubcategoryName}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {subcategory.acts.map((actId) => {
          const selected = selectedSet.has(actId);
          const icon = getActivityEmoji(actId);
          const name = getTranslatedName(actId);

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

  // Translation hooks
  const pageTitle = useUIText('interests.heading.your_interests_360', 'Your Interests');
  const pageDescription = useUIText('interests.paragraph.select_activities_you_enjoy_or__361',
    "Select activities you enjoy or want to try. We'll suggest the best days for each.");
  const loadingInterests = useUIText('interests.label.loading_your_interests__359', 'Loading your interests…');
  const saveChangesButton = useUIText('interests.button.save_changes', '✅ Save Changes');
  const addedActivity = useUIText('interests.message.added_activity', 'Added');
  const savedLocallySupabaseFail = useUIText('interests.button.saved_locally_supabase_sync_fa_354', 'Saved locally! (Supabase sync failed)');
  const interestsSaved = useUIText('interests.paragraph.your_interests_have_been_saved_355', 'Your interests have been saved!');
  const interestsSavedLocally = useUIText('interests.paragraph.your_interests_have_been_saved_356', 'Your interests have been saved locally!');

  const interests = useMemo(() => preferences.interests || [], [preferences.interests]);

  // Translate all activity names
  const allActivityNames = useMemo(() => Object.values(ACTIVITY_NAME_MAP), []);
  const { t: translateActivity } = useTranslationMap(allActivityNames);

  // Helper to get translated activity name
  const getTranslatedActivityName = (id: string) => {
    const englishName = getActivityName(id);
    return translateActivity(englishName);
  };

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
      const isRemoving = chosen.includes(id);

      const newList = isRemoving
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
    showSuccessToast(`${addedActivity} ${getTranslatedActivityName(id)}!`);
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
          showSuccessToast(savedLocallySupabaseFail);
        } else {
          showSuccessToast(interestsSaved);
        }
      } else {
        // User not signed in - just localStorage (already handled by setPreferences)
        showSuccessToast(interestsSavedLocally);
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      showSuccessToast(interestsSavedLocally);
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
          <title>{pageTitle} - Go Daisy</title>
        </Head>
        <AppHeader />
        <div data-theme="light" className="min-h-[60vh] bg-base-100 text-base-content">
          <div className="container mx-auto max-w-3xl px-4 py-12">
            <div className="text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p>{loadingInterests}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle} - Go Daisy</title>
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
            <h1 className="text-3xl font-bold">{pageTitle}</h1>
            <p className="text-base-content/70">
              {pageDescription}
            </p>
          </div>

          {/* Sticky Selected Bar */}
          <div className="sticky top-16 z-10 bg-base-100/95 backdrop-blur pb-4">
            <SelectedActivitiesBar
              activities={interests.map(id => ({
                id,
                name: getTranslatedActivityName(id),
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
              getTranslatedName={getTranslatedActivityName}
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
                      getTranslatedName={getTranslatedActivityName}
                    />
                  ))}
                </CategoryCard>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center mt-8">
            <button onClick={handleSave} className="btn btn-primary btn-lg">
              {saveChangesButton}
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
