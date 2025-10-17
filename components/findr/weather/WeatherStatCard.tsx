import React from 'react';

interface WeatherStatCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function WeatherStatCard({
  title,
  subtitle,
  icon,
  value,
  badge,
  footer,
  children,
  className = '',
}: WeatherStatCardProps) {
  return (
    <div className={`card bg-base-200/40 border border-base-200/80 shadow-sm ${className}`}>
      <div className="card-body gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon ? <div className="bg-base-100 p-2 rounded-lg text-primary">{icon}</div> : null}
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              {subtitle ? <p className="text-xs text-base-content/60">{subtitle}</p> : null}
            </div>
          </div>
          {badge ? <span className="badge badge-outline badge-sm whitespace-nowrap">{badge}</span> : null}
        </div>

        {value ? <p className="text-3xl font-semibold tracking-tight">{value}</p> : null}

        {children}

        {footer ? <div className="mt-2 text-xs text-base-content/60">{footer}</div> : null}
      </div>
    </div>
  );
}

export default WeatherStatCard;
