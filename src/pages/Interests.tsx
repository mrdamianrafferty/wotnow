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
      if (cat === 'Uncategorised') {
        console.log('Uncategorised activity:', act);
      }
      acc[cat] = acc[cat] || [];
      acc[cat].push(act);
      console.log(`Activity: ${act.name}, Category: ${cat}`);
    });
    return acc;
  }, {});

  console.log('Detected categories:', Object.keys(grouped));
  console.log('Full grouped object:', grouped);

  return (
    <div>
      <h1>Choose Your Interests</h1>
      <div className="category-tabs">
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
          <h2 className="category-heading">{selectedCategory}</h2>
          <div className="cards-container">
            {grouped[selectedCategory].map(activity => (
              <div
                key={activity.id}
                className={`card ${interests.includes(activity.id) ? 'selected' : ''}`}
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
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
};

export default Interests;