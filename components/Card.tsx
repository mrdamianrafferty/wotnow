import React from 'react';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';

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
  const bgUrl = getActivityBg(activityId);

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
            {marineData.waveHeight && <span>🌊 {marineData.waveHeight}m</span>}
            {marineData.windSpeed && <span>💨 {marineData.windSpeed}km/h</span>}
            {marineData.waterTemperature && <span>🏊‍♂️ {marineData.waterTemperature.toFixed(1)}°C</span>}
          </div>
        )}
        <div className="card__score">Score: {score}%</div>
      </div>
    </article>
  );
};

export default Card;

<Card
  key={heroActivity.activityId}
  activityId={heroActivity.activityId}
  title={heroActivity.activityId.replace(/_/g, ' ')}
  score={heroActivity.score}
  category={heroActivity.score >= 80 ? 'perfect' : heroActivity.score >= 60 ? 'good' : 'fair'}
  description={heroActivity.reasoning || ''}
  marineData={{
    waveHeight: day.waveHeight,
    windSpeed: day.wind_speed,
    waterTemperature: day.waterTemperature,
  }}
  onClick={() => setPopupActivity({
    activityId: heroActivity.activityId,
    category: heroActivity.score >= 80 ? 'perfect' : heroActivity.score >= 60 ? 'good' : 'fair',
    reasons: buildReasons(day, heroActivity.activityId),
    marineData: {
      waveHeight: day.waveHeight,
      windSpeed: day.wind_speed,
      waterTemperature: day.waterTemp,
    },
  })}
/>

/* Activity Card */
.activity-card-enhanced {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 22px;
  color: #fff;
  overflow: hidden;
  position: relative;
  min-height: 180px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.activity-card-enhanced.hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Overlay */
.activity-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 22px;
  z-index: 1;
}

/* Content */
.activity-card-content {
  position: relative;
  z-index: 2;
  padding: 8px 12px 14px 12px;
}