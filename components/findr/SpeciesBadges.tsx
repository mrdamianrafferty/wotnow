import * as React from "react";
import { resolveBadgeMeta } from "../../lib/findr/speciesBadges";

type Props = {
  badges: string[] | null | undefined;
  size?: "xs" | "sm" | "md";
  condensed?: boolean; // true = emojis only
};

export function SpeciesBadges({ badges, size = "sm", condensed = false }: Props) {
  const meta = resolveBadgeMeta(badges);

  if (!meta.length) return null;

  const sizeClass = size === "xs" ? "text-xs px-2 py-[2px]" :
                    size === "sm" ? "text-sm px-2 py-[3px]" :
                                     "text-base px-3 py-1";

  return (
    <div className="flex flex-wrap gap-1">
      {meta.map(b => (
        <div
          key={b.key}
          className={`badge ${b.color ? `badge-${b.color}` : ""} ${sizeClass} gap-1`} style={{ boxShadow: 'none', filter: 'none' }}
          title={b.tooltip ?? b.label}
          aria-label={b.label}
        >
          <span aria-hidden>{b.emoji}</span>
          {!condensed && <span className="leading-none">{b.label}</span>}
        </div>
      ))}
    </div>
  );
}