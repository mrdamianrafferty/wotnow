// /pages/demo/lucide-gradient.tsx
import React from "react";
import * as Lucide from "lucide-react";

export default function LucideGradientDemo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 text-slate-700 p-6">
      <LucideGradientDefs id="ocean" />
      <h1 className="text-2xl font-semibold mb-6">Lucide React Gradient Demo</h1>
      <div className="flex gap-10">
        <LucideIconGradient name="Fish" strokeWidth={0.5} gradientId="ocean" size={120} />
        <LucideIconGradient name="Anchor" gradientId="ocean" size={120} />
        <LucideIconGradient name="Waves" gradientId="ocean" size={120} />
      </div>
    </div>
  );
}



function LucideGradientDefs({ id = "ocean" }) {
  return (
    <svg aria-hidden className="absolute w-0 h-0 overflow-hidden">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0077ff">
            <animate attributeName="stop-color" values="#0077ff;#00ffaa;#0077ff" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#00ffaa">
            <animate attributeName="stop-color" values="#00ffaa;#0077ff;#00ffaa" dur="6s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
    </svg>
  );
}

type LucideIconName = {
  [K in keyof typeof Lucide]: typeof Lucide[K] extends Lucide.LucideIcon ? K : never;
}[keyof typeof Lucide];

type LucideIconGradientProps = {
  name: LucideIconName;
  gradientId: string;
  size?: number;
  strokeWidth?: number;
};

function LucideIconGradient({ name, gradientId, size = 96, strokeWidth = 2.5 }: LucideIconGradientProps) {
  const Icon = Lucide[name] as Lucide.LucideIcon | undefined;
  if (!Icon) {
    return null;
  }
  return <Icon size={size} stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} />;
}

