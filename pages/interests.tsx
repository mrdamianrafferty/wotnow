// pages/interests.tsx
import React, { useState } from 'react';
import { activityTypes } from '../data/activityTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';

// --- Category Hierarchy with Subcategory Emoticons ---
const hierarchy = {
  'Active Sports': {
    icon: '🏃‍♂️',
    sub: {
      'Team Sports': { icon: '🤾‍♂️', acts: ['football_soccer', 'cricket', 'rugby', 'basketball_outdoor', 'beach_volleyball', 'american_football', 'baseball', 'hurling', 'gaelic_football', 'hockey', 'netball'] },
      'Individual Sports': { icon: '🎾', acts: ['golf', 'tennis', 'squash', 'badminton', 'table_tennis', 'archery', 'pickleball', 'padel'] },
      'Water Sports': { icon: '🛶', acts: ['kayaking', 'canoeing', 'surfing', 'stand_up_paddleboarding', 'snorkeling', 'swimming'] },
      'Action Sports': { icon: '🚵‍♂️', acts: ['mountain_biking', 'rock_climbing', 'skateboarding', 'rollerblading'] },
    },
  },
  'Fitness & Wellness': {
    icon: '💪',
    sub: {
      'Cardio & Running': { icon: '🏃‍♂️', acts: ['running', 'trail_running', 'road_cycling', 'urban_exploring'] },
      'Strength & Gym': { icon: '🏋️‍♂️', acts: ['gym_workout', 'outdoor_gym'] },
      Mindfulness: { icon: '🧘‍♂️', acts: ['yoga', 'outdoor_yoga', 'meditation', 'outdoor_meditation', 'pilates', 'martial_arts', 'tai_chi'] },
    },
  },
  'Outdoor Activities': {
    icon: '🌲',
    sub: {
      'Nature Activities': { icon: '🌳', acts: ['hiking', 'birdwatching', 'photography', 'foraging', 'mushroom_hunting', 'stargazing'] },
      Fishing: { icon: '🎣', acts: ['fly_fishing_freshwater', 'coarse_fishing', 'sea_fishing_shore', 'sea_fishing_boat', 'ice_fishing'] },
      Recreation: { icon: '🍔', acts: ['picnicking', 'bbq', 'geocaching', 'camping', 'outdoor_reading', 'dog_walking', 'outdoor_playground', 'outdoor_chess'] },
    },
  },
  'Winter Sports': {
    icon: '❄️',
    seasonal: true,
    sub: {
      'Snow Sports': { icon: '⛷️', acts: ['skiing', 'snowboarding', 'cross_country_skiing'] },
      'Ice Sports': { icon: '⛸️', acts: ['ice_skating', 'curling', 'ice_hockey'] },
    },
  },
  'Creative & Arts': {
    icon: '🎨',
    sub: {
      'Visual Arts': { icon: '🎨', acts: ['painting', 'outdoor_painting', 'crafts', 'photography', 'knitting', 'diy'] },
      'Music & Performance': { icon: '🎷', acts: ['playing_records', 'make-music', 'dance', 'outdoor_music'] },
      'Literature & Learning': { icon: '📚', acts: ['reading', 'outdoor_reading'] },
    },
  },
  'Indoor Recreation': {
    icon: '🏠',
    sub: {
      'Home Activities': { icon: '🧶', acts: ['crafts', 'knitting', 'reading', 'diy', 'playing_records'] },
      'Social Activities': { icon: '🍻', acts: ['going_to_pub', 'table_tennis', 'playing_cards', 'watch_a_movie'] },
      'Indoor Sports': { icon: '🏓', acts: ['indoor_climbing', 'squash', 'badminton', 'tennis_indoor', 'indoor_swimming', 'gym_workout'] },
    },
  },
};

// --- Breadcrumb Component ---
const Breadcrumb: React.FC<{ path: string[]; onBack: () => void }> = ({ path, onBack }) => (
  <div className="breadcrumb" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
    {path.length > 1 && (
      <button className="back-button" onClick={onBack} style={{ marginRight: 8 }}>
        ← Back
      </button>
    )}
    <span>{path.join(' / ')}</span>
  </div>
);

// --- Main Category Grid ---
const MainCategories: React.FC<{ onSelect: (main: string) => void }> = ({ onSelect }) => (
  <div className="main-categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 20, margin: '32px 0' }}>
    {Object.entries(hierarchy).map(([main, meta]) => (
      <div
        key={main}
        className={`main-category-card${meta.seasonal ? ' seasonal' : ''}`}
        onClick={() => onSelect(main)}
        style={{
          border: `2px solid ${meta.seasonal ? '#06b6d4' : '#e5e7eb'}`,
          borderRadius: 12,
          padding: 24,
          cursor: 'pointer',
          textAlign: 'center',
          position: 'relative',
          transition: 'border-color 0.2s'
        }}
      >
        <span className="category-icon" style={{ fontSize: '2.2rem', display: 'block', marginBottom: 10 }}>{meta.icon}</span>
        <span className="category-name" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{main}</span>
        {meta.seasonal && <span className="seasonal-badge" style={{
          position: 'absolute', top: -6, right: -6, background: '#0891b2', color: 'white',
          borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
        }}>❄️</span>}
      </div>
    ))}
  </div>
);

// --- Subcategory Grid ---
const SubCategories: React.FC<{ main: string; onSelect: (sub: string) => void }> = ({ main, onSelect }) => {
  const subs = hierarchy[main].sub;
  return (
    <div className="subcategories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, margin: '32px 0' }}>
      {Object.entries(subs).map(([sub, entry]) => (
        <div key={sub} className="subcategory-card" onClick={() => onSelect(sub)}
          style={{
            border: '1px solid #d1d5db', borderRadius: 8, padding: 20, cursor: 'pointer',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
        >
          <span style={{fontSize:'1.5rem', marginRight:8}}>{entry.icon}</span>
          <h3 style={{display:'inline-block'}}>{sub}</h3>
          <p style={{ color: '#6b7280', fontSize: 14 }}>{entry.acts.length} activities</p>
        </div>
      ))}
    </div>
  );
};

// --- Activities Grid ---
const ActivitiesGrid: React.FC<{
  ids: string[];
  interests: string[];
  toggle: (id: string, name: string) => void;
}> = ({ ids, interests, toggle }) => {
  const activities = ids
    .map(id => activityTypes.find(a => a.id === id)!)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="interests-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {activities.map(act => (
        <div
          key={act.id}
          className={`interest-card${interests.includes(act.id) ? ' selected' : ''}`}
          onClick={() => toggle(act.id, act.name)}
          role="button"
          aria-pressed={interests.includes(act.id)}
          title={act.name}
          style={{
            border: `2px solid ${interests.includes(act.id) ? '#2563eb' : '#bbb'}`,
            borderRadius: 18,
            background: interests.includes(act.id) ? '#2563eb' : '#fff',
            color: interests.includes(act.id) ? '#fff' : '#222',
            padding: '10px 20px', fontWeight: 500, fontSize: 15, minWidth: 110, minHeight: 44,
            cursor: 'pointer'
          }}
        >
          {act.name}
        </div>
      ))}
    </div>
  );
};

// --- Live Event Preferences Step ---
const EVENT_TYPES = [
  { key: 'sport', label: 'Sporting Events', icon: '🏟️' },
  { key: 'music', label: 'Music Concerts', icon: '🎵' },
  { key: 'arts', label: 'Arts & Theatre', icon: '🎭' },
];
const MUSIC_GENRES = [
  'Rock','Pop','Jazz','Hip-Hop/Rap','Dance/Electronic','Folk',
  'Indie','Classical','Metal'
];

type EventPrefs = { sport: boolean; music: boolean; arts: boolean; genres: string[] };

function EventPreferencesStep({
  eventPrefs,
  setEventPrefs,
  onBack,
  onDone
}: {
  eventPrefs: EventPrefs,
  setEventPrefs: (e: EventPrefs) => void,
  onBack: () => void,
  onDone: () => void,
}) {
  const toggleType = (key: keyof EventPrefs) =>
    setEventPrefs(prev => ({
      ...prev,
      [key]: key !== 'genres' ? !prev[key] : prev[key],
      genres: key === 'music' && !eventPrefs.music ? [] : prev.genres
    }));

  const toggleGenre = (g: string) =>
    setEventPrefs(prev => ({
      ...prev,
      genres: prev.genres.includes(g)
        ? prev.genres.filter(val => val !== g)
        : [...prev.genres, g]
    }));

  return (
    <div className="event-interests-section" style={{marginTop:32, maxWidth:430}}>
      <h2 style={{marginBottom:8}}>Are you interested in going to live local events?</h2>
      <div className="event-preferences-row" style={{display:'flex', gap:16}}>
        {EVENT_TYPES.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleType(key as keyof EventPrefs)}
            className={`event-chip${eventPrefs[key as keyof EventPrefs] ? ' selected' : ''}`}
            aria-pressed={eventPrefs[key as keyof EventPrefs]}
            style={{
              padding: '12px 16px', minHeight: 44, fontWeight:'bold',
              border:`2px solid ${eventPrefs[key as keyof EventPrefs] ? '#2563eb' : '#bbb'}`,
              borderRadius:24, background: eventPrefs[key as keyof EventPrefs] ? '#2563eb' : '#fff',
              color: eventPrefs[key as keyof EventPrefs] ? '#fff' : '#222', fontSize: 18, cursor:'pointer'
            }}
          >
            <span style={{marginRight:8}}>{icon}</span>{label}
          </button>
        ))}
      </div>
      {eventPrefs.music && (
        <div style={{marginTop:24}}>
          <h3 style={{marginBottom:4}}>What genres of music do you enjoy?</h3>
          <div style={{display:'flex', flexWrap:'wrap', gap:12, marginTop:8}}>
            {MUSIC_GENRES.map(g => (
              <button
                key={g} onClick={() => toggleGenre(g)}
                aria-pressed={eventPrefs.genres.includes(g)}
                className={`genre-chip${eventPrefs.genres.includes(g) ? ' selected' : ''}`}
                style={{
                  padding:'8px 14px', border: eventPrefs.genres.includes(g) ? '2px solid #db2777' : '2px solid #bbb',
                  borderRadius:16, background: eventPrefs.genres.includes(g) ? '#db2777' : '#fff', color: eventPrefs.genres.includes(g) ? '#fff' : '#222',
                  fontWeight:'bold', cursor:'pointer', fontSize:15
                }}
              >{g}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{display:'flex', justifyContent: 'space-between', marginTop:40}}>
        <button
          type="button" style={{background:'#e5e7eb', color:'#222', fontWeight:'bold', border:'none', borderRadius:8, padding:'10px 24px'}}
          onClick={onBack}
        >Back</button>
        <button
          type="button" style={{background:'#059669', color:'#fff', fontWeight:'bold', border:'none', borderRadius:8, padding:'10px 24px'}}
          onClick={onDone}
        >Finish</button>
      </div>
    </div>
  );
}

// --- Main Page ---
const Interests: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const [mainCat, setMainCat] = useState<string | null>(null);
  const [subCat, setSubCat] = useState<string | null>(null);
  const [step, setStep] = useState<1|2|3>(1); // 1=activities, 2=event prefs, 3=done
  const path = [mainCat, subCat].filter(Boolean) as string[];

  const [eventPrefs, setEventPrefs] = useState<EventPrefs>(
    preferences.eventPreferences || {sport:false, music:false, arts:false, genres:[]}
  );

  const toggleInterest = (id: string, name: string) => {
    setPreferences(prev => {
      const chosen = prev.interests ?? [];
      const newList = chosen.includes(id) ? chosen.filter(i => i !== id) : [...chosen, id];
      return { ...prev, interests: newList };
    });
  };

  let content: React.ReactNode;
  if (step === 1) {
    if (!mainCat) content = <MainCategories onSelect={setMainCat} />;
    else if (!subCat) content = <SubCategories main={mainCat} onSelect={setSubCat} />;
    else if (
      hierarchy[mainCat] &&
      hierarchy[mainCat].sub &&
      hierarchy[mainCat].sub[subCat]
    ) {
      const ids = hierarchy[mainCat].sub[subCat].acts;
      content = (
        <>
          <ActivitiesGrid ids={ids} interests={preferences.interests || []} toggle={toggleInterest} />
          <div style={{marginTop:24, textAlign:'right'}}>
            <button
              style={{
                minWidth:110, fontWeight:'bold', fontSize:'1.1rem', padding:'12px 24px',
                borderRadius:8, background:'#2563eb', color:'#fff', border:'none'
              }}
              onClick={() => setStep(2)}
            >Continue</button>
          </div>
        </>
      );
    }
  } else if (step === 2) {
    content = (
      <EventPreferencesStep
        eventPrefs={eventPrefs}
        setEventPrefs={setEventPrefs}
        onBack={() => setStep(1)}
        onDone={() => {
          setPreferences(prev => ({ ...prev, eventPreferences: eventPrefs }));
          setStep(3);
        }}
      />
    );
  } else if (step === 3) {
    content = (
      <div style={{textAlign:'center', marginTop:48}}>
        <h2>🎉 Preferences saved!</h2>
        <p>You’ll now get tailored ideas for activities and live events.</p>
      </div>
    );
  }

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (subCat) setSubCat(null);
    else if (mainCat) setMainCat(null);
  };

  return (
    <div className="interests-page" style={{ maxWidth: 630, margin: '0 auto', padding: '32px 18px' }}>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 700 }}>Choose Your Interests</h1>
      <Breadcrumb path={['Interests', ...path]} onBack={handleBack} />
      {content}
    </div>
  );
};

export default Interests;
