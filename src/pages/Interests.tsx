import React, { useState } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { activityTypes } from '../data/activityTypes';

const Interests: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const { interests } = preferences;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Outdoor');

  const toggleInterest = (id: string, name: string) => {
    const isSelected = interests.includes(id);
    const newInterests = isSelected
      ? interests.filter(i => i !== id)
      : [...interests, id];
    setPreferences(prev => ({ ...prev, interests: newInterests }));
    setToastMessage(`${isSelected ? 'Removed' : 'Added'}: ${name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const grouped = activityTypes.reduce<Record<string, typeof activityTypes>>((acc, act) => {
    const categories = [act.category, act.secondaryCategory].filter(Boolean);
    categories.forEach(cat => {
      acc[cat] = acc[cat] || [];
      acc[cat].push(act);
    });
    return acc;
  }, {});

  return (
    <div className="interests-page">
      <h1 className="page-title">Choose Your Interests</h1>
      <div className="interests-category-tabs">
        {[
          'Outdoor',
          'Sports',
          'Hobbies',
          'Indoor',
          'Uncategorised',
          ...Object.keys(grouped).filter(c => !['Outdoor', 'Sports', 'Hobbies', 'Indoor', 'Uncategorised'].includes(c))
        ]
        .filter(category => grouped[category])
        .map(category => (
          <button
            key={category}
            className={category === selectedCategory ? 'active' : ''}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      {grouped[selectedCategory] && (
        <div className="category-group">
          <h2 className="interests-category-heading">{selectedCategory}</h2>
          {/* Container styled as a responsive CSS grid */}
          <div className="interests-cards-container interests-grid">
            {grouped[selectedCategory]
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(activity => (
                <div
                  key={activity.id}
                  className={`interest-card ${interests.includes(activity.id) ? 'selected' : ''}`}
                  onClick={() => toggleInterest(activity.id, activity.name)}
                  role="button"
                  aria-pressed={interests.includes(activity.id)}
                >
                  {activity.name}
                </div>
            ))}
          </div>
        </div>
      )}
      {toastMessage && <div className="interests-toast">{toastMessage}</div>}
    </div>
  );
};

export default Interests;