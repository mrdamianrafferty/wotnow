import React, { useMemo } from 'react';
import { ArrowUpToLine, ArrowDownToLine, Anchor } from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatDisplayTime, formatRelativeTime, formatTideHeight } from '../../../lib/findr/weatherFormatting';
import { TranslatedText } from '../../translation/TranslatedFishCard';

interface TideSummaryCardProps {
  nextHighIso?: string | null;
  nextLowIso?: string | null;
  lastTideHeight?: number | null;
  upcomingTideHeight?: number | null;
}

export function TideSummaryCard({ nextHighIso, nextLowIso, lastTideHeight, upcomingTideHeight }: TideSummaryCardProps) {
  const highLabel = formatDisplayTime(nextHighIso ?? undefined);
  const highRelative = formatRelativeTime(nextHighIso ?? undefined);
  const lowLabel = formatDisplayTime(nextLowIso ?? undefined);
  const lowRelative = formatRelativeTime(nextLowIso ?? undefined);

  const headline = useMemo(() => {
    if (highRelative) return `High tide ${highRelative}`;
    if (lowRelative) return `Low tide ${lowRelative}`;
    return undefined;
  }, [highRelative, lowRelative]);

  const footerText = useMemo(() => {
    if (lastTideHeight != null) {
      return `${formatTideHeight(lastTideHeight)} last cycle`;
    }
    return undefined;
  }, [lastTideHeight]);

  return (
    <WeatherStatCard
      title={<TranslatedText text="Tides" />}
      subtitle={<TranslatedText text="Next tidal windows" />}
      icon={<Anchor className="size-5" />}
      value={headline ? <TranslatedText text={headline} /> : undefined}
      footer={footerText ? <TranslatedText text={footerText} /> : undefined}
    >
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-base-100 border border-base-200/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-sm">
              <ArrowUpToLine className="size-3 text-primary" />
            </span>
            {lastTideHeight != null ? <span className="badge badge-ghost badge-xs">{formatTideHeight(lastTideHeight)}</span> : null}
          </div>
          <p className="text-base-content/80 text-sm">{highLabel}</p>
          {highRelative ? <p className="text-base-content/60"><TranslatedText text={highRelative} /></p> : null}
        </div>
        <div className="p-3 rounded-lg bg-base-100 border border-base-200/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-sm">
              <ArrowDownToLine className="size-3 text-secondary" />
            </span>
            {upcomingTideHeight != null ? <span className="badge badge-ghost badge-xs">{formatTideHeight(upcomingTideHeight)}</span> : null}
          </div>
          <p className="text-base-content/80 text-sm">{lowLabel}</p>
          {lowRelative ? <p className="text-base-content/60"><TranslatedText text={lowRelative} /></p> : null}
        </div>
      </div>
    </WeatherStatCard>
  );
}

export default TideSummaryCard;