import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';
import type { GardenAlertResult, Severity } from '../../lib/gardening/gardenAlerts';
import { useTranslationMap } from '../../lib/translation/useTranslationMap';

const severityOrder: Severity[] = ['high', 'warning', 'info'];

const severityLabels: Record<Severity, { label: string; badgeVariant: 'outline' | 'secondary' | 'destructive'; accent: string; border: string }> = {
  high: {
    label: 'Action now',
    badgeVariant: 'destructive',
    accent: 'from-red-50 via-rose-100 to-orange-50',
    border: 'border-red-500/70 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]',
  },
  warning: {
    label: 'Heads up',
    badgeVariant: 'outline',
    accent: 'from-amber-50 via-yellow-100 to-amber-50',
    border: 'border-amber-400/60 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]',
  },
  info: {
    label: 'Worth noting',
    badgeVariant: 'secondary',
    accent: 'from-sky-50 via-blue-100 to-slate-50',
    border: 'border-sky-300/60 shadow-[0_0_0_1px_rgba(14,165,233,0.2)]',
  },
  none: {
    label: 'All clear',
    badgeVariant: 'secondary',
    accent: 'from-muted/30 to-muted/10',
    border: 'border-muted-foreground/20',
  },
};

interface GardenAlertBoxProps {
  alerts: GardenAlertResult[];
  isLoading?: boolean;
}

export const GardenAlertBox: React.FC<GardenAlertBoxProps> = ({ alerts, isLoading = false }) => {
  const translationInputs = React.useMemo(() => {
    const staticStrings = [
      'Checking today\'s garden conditions...',
      'Nothing urgent in the garden right now. Enjoy the calm!',
      ...Object.values(severityLabels).map(meta => meta.label),
    ];

    const alertStrings = alerts.flatMap(alert => [alert.copy.title, alert.copy.message]);
    return [...staticStrings, ...alertStrings];
  }, [alerts]);

  const { t } = useTranslationMap(translationInputs);

  if (isLoading) {
    return (
      <Card className="border-dashed border-muted-foreground/40 bg-muted/20">
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t("Checking today's garden conditions...")}
        </CardContent>
      </Card>
    );
  }

  if (!alerts.length) {
    return (
      <Card className="border border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-50">
        <CardContent className="py-6 text-sm text-emerald-800 flex items-center gap-3">
          <span className="text-xl">🌿</span>
          {t('Nothing urgent in the garden right now. Enjoy the calm!')}
        </CardContent>
      </Card>
    );
  }

  const sorted = [...alerts].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
  const primary = sorted[0];
  const rest = sorted.slice(1);
  const primaryMeta = severityLabels[primary.severity];

  return (
    <Card
      className={cn(
        'border-2 bg-gradient-to-br transition-shadow duration-200',
        primaryMeta.accent,
        primaryMeta.border,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-2xl shadow-sm" aria-hidden>
              {primary.copy.emoji}
            </span>
            <span className="leading-tight">{t(primary.copy.title)}</span>
          </CardTitle>
          <Badge variant={primaryMeta.badgeVariant} className="uppercase tracking-wide text-xs">
            {t(primaryMeta.label)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t(primary.copy.message)}
        </p>
      </CardHeader>
      {rest.length > 0 && (
        <CardContent className="pt-0">
          <Separator className="mb-4 opacity-60" />
          <div className="space-y-3">
            {rest.map(alert => {
              const meta = severityLabels[alert.severity];
              return (
                <div key={alert.key} className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/60 p-3 text-sm shadow-sm">
                  <span className="text-lg" aria-hidden>
                    {alert.copy.emoji}
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{t(alert.copy.title)}</span>
                      <Badge variant={meta.badgeVariant} className="text-[0.65rem]">
                        {t(meta.label)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(alert.copy.message)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
