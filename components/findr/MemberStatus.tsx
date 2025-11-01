/**
 * Member Status Component
 *
 * Displays user medals based on activity and tenure.
 * Replaces the "Stock Photos" stat box.
 */

import { Shield } from 'lucide-react';
import { TranslatedText } from '@/components/translation/TranslatedFishCard';
import { useUserStatus } from '@/hooks/useUserStatus';
import type { CatchSession } from '@/lib/findr/badgeDefinitions';
import type { StatusMedal } from '@/lib/findr/statusMedals';

interface MemberStatusProps {
  sessions: CatchSession[];
}

function MedalDisplay({ medal }: { medal: StatusMedal }) {
  const Icon = medal.status.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${medal.bgColor} ${medal.borderClass}`}
      title={medal.status.description}
    >
      <Icon className={`w-5 h-5 ${medal.color}`} />
      <div className="flex flex-col">
        <span className={`text-sm font-semibold ${medal.color}`}>
          {medal.status.label}
        </span>
        <span className="text-xs opacity-70">{medal.status.description}</span>
      </div>
    </div>
  );
}

export function MemberStatus({ sessions }: MemberStatusProps) {
  const { medals, isLoading } = useUserStatus(sessions);

  if (isLoading) {
    return (
      <div className="stat bg-base-100 shadow rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-base-content/50" />
          <div className="stat-title">
            <TranslatedText text="Member Status" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center py-4">
          <span className="loading loading-spinner loading-sm"></span>
        </div>
      </div>
    );
  }

  const medalsList = [medals.gold, medals.silver, medals.bronze].filter(Boolean) as StatusMedal[];

  return (
    <div className="stat bg-base-100 shadow rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-6 h-6 text-primary" />
        <div className="stat-title">
          <TranslatedText text="Member Status" />
        </div>
      </div>

      {/* Medals */}
      {medalsList.length > 0 ? (
        <div className="flex flex-col gap-2">
          {medalsList.map((medal, idx) => (
            <MedalDisplay key={idx} medal={medal} />
          ))}
        </div>
      ) : (
        <div className="bg-base-200 rounded-lg p-3 text-center">
          <div className="text-xs opacity-60">
            <TranslatedText text="Log catches to earn medals!" />
          </div>
        </div>
      )}
    </div>
  );
}
