import React from 'react';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { getOptimizedImageSrc, isImageOptimized } from '../data/bgMapOptimized';

interface CardProps {
  activityId: string;
  title: string;
  score: number;
  category: 'perfect' | 'good' | 'fair' | 'poor';
  description: string;
  marineData?: {
    waveHeight?: number;
    windSpeed?: number;
    waterTemperature?: number;
  };
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({ activityId, title, score, category, description, marineData, onClick }) => {
  // Use optimized image if available, otherwise fallback to original
  const bgUrl = isImageOptimized(activityId) 
    ? getOptimizedImageSrc(activityId, 'webpMobile') // Cards are smaller, use mobile version
    : getActivityBg(activityId);

  return (
    <article
      className={`card card--${category} activity-card-enhanced`}
      style={{ backgroundImage: `url(${bgUrl})` }}
      onClick={onClick}
    >
      <div className="activity-card-overlay"></div>
      <div className="card__content activity-card-content">
        <div className="card__header">
          <span className="card__emoji">{getActivityEmoji(activityId)}</span>
          <h3 className="card__title">{title}</h3>
        </div>
        <p className="card__description">{description}</p>
        {marineData && (
          <div className="card__marine-data">
            {marineData.waveHeight !== undefined && (
              (() => {
                const wave = marineData.waveHeight;
                let key = '';
                if (wave <= 0.5) {
                  key = 'Calm: Safe for swimming, kids, casual paddle sports.';
                } else if (wave <= 1.0) {
                  key = 'Choppy / Manageable: Fun for confident swimmers, bodyboarders; tiring for casual bathers.';
                } else if (wave <= 2.0) {
                  key = 'Strong surf: Powerful waves; risky for swimmers, good for experienced surfers.';
                } else if (wave <= 3.0) {
                  key = 'Heavy surf / Hazardous: Dangerous for swimming; only skilled surfers or sport with safety cover.';
                } else {
                  key = 'Extreme seas: Unsafe for general recreation; specialist conditions only.';
                }
                return (
                  <span title={`Wave Height: ${wave.toFixed(1)}m\n${key}`}>🌊 {wave.toFixed(1)}m</span>
                );
              })()
            )}
            {marineData.windSpeed !== undefined && (
              (() => {
                const windMs = marineData.windSpeed;
                // Convert m/s to knots for display
                const knots = (windMs * 1.94384);
                const beaufort = Math.round(
                  windMs < 0.3 ? 0 :
                  windMs < 1.6 ? 1 :
                  windMs < 3.4 ? 2 :
                  windMs < 5.5 ? 3 :
                  windMs < 8.0 ? 4 :
                  windMs < 10.8 ? 5 :
                  windMs < 13.9 ? 6 :
                  windMs < 17.2 ? 7 :
                  windMs < 20.8 ? 8 :
                  windMs < 24.5 ? 9 :
                  windMs < 28.5 ? 10 :
                  windMs < 32.7 ? 11 : 12
                );
                const beaufortDescriptions = [
                  'Calm: Smoke rises vertically.', // 0
                  'Light Air: Ripples, leaves still.', // 1
                  'Light Breeze: Leaves rustle, wind felt on face.', // 2
                  'Gentle Breeze: Leaves and twigs in motion.', // 3
                  'Moderate Breeze: Raises dust, small branches move.', // 4
                  'Fresh Breeze: Small trees sway.', // 5
                  'Strong Breeze: Large branches move, whistling in wires.', // 6
                  'Near Gale: Whole trees in motion.', // 7
                  'Gale: Twigs break off trees.', // 8
                  'Strong Gale: Slight structural damage.', // 9
                  'Storm: Trees uprooted, damage.', // 10
                  'Violent Storm: Widespread damage.', // 11
                  'Hurricane: Severe damage.', // 12
                ];
                const windDesc = beaufortDescriptions[Math.max(0, Math.min(beaufort, 12))];
                return (
                  <span title={`Wind: Beaufort ${beaufort}\n${windDesc}`}>💨 {knots.toFixed(1)}kn</span>
                );
              })()
            )}
            {marineData.waterTemperature !== undefined && (
              (() => {
                const temp = marineData.waterTemperature;
                let key = '';
                if (temp < 10) {
                  key = 'Very Cold / Dangerous: Immediate cold shock risk; hypothermia within minutes. Only for trained/drysuit users.';
                } else if (temp < 16) {
                  key = 'Cold: Wetsuit strongly recommended. Cold shock possible; hypothermia within 30–60 mins.';
                } else if (temp < 20) {
                  key = 'Cool: Bracing for swimming; wetsuit advised for long sessions. Comfortable for surfing/kayaking in gear.';
                } else if (temp < 24) {
                  key = 'Mild / Comfortable: Good for most swimmers without wetsuits; pleasant for water sports.';
                } else if (temp < 28) {
                  key = 'Warm: Very comfortable for swimming and sport. Little thermal stress.';
                } else {
                  key = 'Hot / Tropical: Comfortable but can feel overheated during exertion. Monitor hydration and sun risk.';
                }
                return (
                  <span title={`Sea Water: ${temp.toFixed(1)}°C\n${key}`}>🏊‍♂️ {temp.toFixed(1)}°C</span>
                );
              })()
            )}
          </div>
        )}
        <div className="card__score">Score: {score}%</div>
      </div>
    </article>
  );
};

export default Card;

