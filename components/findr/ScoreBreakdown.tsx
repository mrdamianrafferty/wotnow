import { Info, Thermometer, Waves, Sun, Moon, Wind, Droplets, MapPin } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

export interface ScoreBreakdownData {
  biteScore: number;
  confidence: number;
  tempScore?: number;
  tideScore?: number;
  lightScore?: number;
  lunarScore?: number;
  weatherScore?: number;
  bioBandScore?: number;
  habitatBonus?: number;
}

interface ScoreBreakdownProps {
  data: ScoreBreakdownData;
  speciesName: string;
}

interface FactorRowProps {
  icon: React.ReactNode;
  label: string;
  score: number | undefined;
  maxScore: number;
  description: string;
}

function FactorRow({ icon, label, score, maxScore, description }: FactorRowProps) {
  if (score === undefined || score === null) {
    return null;
  }

  const percentage = (score / maxScore) * 100;
  const barColor =
    percentage >= 75
      ? 'bg-success'
      : percentage >= 50
      ? 'bg-warning'
      : 'bg-error';

  return (
    <div className="py-2 border-b border-base-300 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base-content/70">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold">{score}</span>
      </div>
      <div className="w-full bg-base-300 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-base-content/60 mt-1">{description}</p>
    </div>
  );
}

export function ScoreBreakdown({ data, speciesName }: ScoreBreakdownProps) {
  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        className="btn btn-circle btn-ghost btn-xs"
        aria-label="View score breakdown"
      >
        <Info size={16} />
      </button>
      <div
        tabIndex={0}
        className="dropdown-content z-[1] card card-compact w-80 p-4 shadow-xl bg-base-100 border border-base-300 mt-2"
      >
        <div className="card-body p-0">
          <h4 className="font-bold text-base mb-2">
            <TranslatedText text={`Why ${data.biteScore}% for ${speciesName}?`} />
          </h4>

          <div className="space-y-2">
            <div className="bg-base-200 p-3 rounded-lg mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">
                  <TranslatedText text="Bite Score (Feeding Now)" />
                </span>
                <span className="text-2xl font-bold text-success">{data.biteScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-base-content/70">
                  <TranslatedText text="Confidence (Habitat Match)" />
                </span>
                <span className="text-sm font-semibold">{data.confidence}%</span>
              </div>
            </div>

            <FactorRow
              icon={<Thermometer size={14} />}
              label="Temperature"
              score={data.tempScore}
              maxScore={40}
              description="Water temperature match for species preference"
            />

            <FactorRow
              icon={<Waves size={14} />}
              label="Tide"
              score={data.tideScore}
              maxScore={40}
              description="Current tide stage and flow speed"
            />

            <FactorRow
              icon={<Sun size={14} />}
              label="Light/Time of Day"
              score={data.lightScore}
              maxScore={15}
              description="Dawn, dusk, day, or night feeding patterns"
            />

            <FactorRow
              icon={<Moon size={14} />}
              label="Moon Phase"
              score={data.lunarScore}
              maxScore={10}
              description="Lunar cycle effect on feeding behavior"
            />

            <FactorRow
              icon={<Wind size={14} />}
              label="Weather"
              score={data.weatherScore}
              maxScore={25}
              description="Wind speed and barometric pressure"
            />

            <FactorRow
              icon={<Droplets size={14} />}
              label="Water Quality"
              score={data.bioBandScore}
              maxScore={30}
              description="Oxygen, salinity, and chlorophyll levels"
            />

            <FactorRow
              icon={<MapPin size={14} />}
              label="Habitat Bonus"
              score={data.habitatBonus}
              maxScore={10}
              description="Species-specific location advantages"
            />
          </div>

          <p className="text-xs text-base-content/50 mt-3 italic">
            <TranslatedText text="Bite score predicts feeding activity right now. Confidence shows habitat suitability." />
          </p>
        </div>
      </div>
    </div>
  );
}
