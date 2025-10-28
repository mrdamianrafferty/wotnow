import { Waves } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

export interface TideInfo {
  stage: 'early_flood' | 'mid_flood' | 'high' | 'early_ebb' | 'mid_ebb' | 'low_slack';
  flowSpeedMS: number | null;
}

interface TideConditionsProps {
  tide: TideInfo | null;
  className?: string;
}

const TIDE_LABELS: Record<TideInfo['stage'], { label: string; color: string; icon: string }> = {
  early_flood: { label: 'Early Flood (Rising)', color: 'text-info', icon: '↗️' },
  mid_flood: { label: 'Mid Flood (Rising Fast)', color: 'text-success', icon: '⬆️' },
  high: { label: 'High Tide (Slowing)', color: 'text-warning', icon: '➡️' },
  early_ebb: { label: 'Early Ebb (Falling)', color: 'text-warning', icon: '↘️' },
  mid_ebb: { label: 'Mid Ebb (Falling Fast)', color: 'text-error', icon: '⬇️' },
  low_slack: { label: 'Low Slack (Slow)', color: 'text-base-content/50', icon: '➡️' },
};

export function TideConditions({ tide, className = '' }: TideConditionsProps) {
  if (!tide) {
    return null;
  }

  const tideDisplay = TIDE_LABELS[tide.stage];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Waves size={16} className={tideDisplay.color} />
      <div className="flex flex-col">
        <span className={`text-xs font-semibold ${tideDisplay.color}`}>
          {tideDisplay.icon} <TranslatedText text={tideDisplay.label} />
        </span>
        {tide.flowSpeedMS !== null && (
          <span className="text-xs text-base-content/60">
            <TranslatedText text={`Flow: ${tide.flowSpeedMS.toFixed(1)} m/s`} />
          </span>
        )}
      </div>
    </div>
  );
}
