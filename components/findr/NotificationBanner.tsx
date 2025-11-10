/**
 * NotificationBanner Component
 *
 * Call-to-action banner for managing notification preferences on the favourites page.
 * Encourages users to set up fishing alerts and email digests for their favourite species.
 */

'use client';

import React from 'react';
import { Bell, ArrowRight, AlertCircle, Mail, TrendingUp } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

interface NotificationBannerProps {
  onManageSettings: () => void;
  className?: string;
}

export function NotificationBanner({
  onManageSettings,
  className = '',
}: NotificationBannerProps) {
  return (
    <div
      className={`card bg-gradient-to-r from-primary/10 via-info/10 to-success/10 border border-primary/20 overflow-hidden ${className}`}
    >
      <div className="card-body p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Bell size={24} className="text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-base-content mb-2 flex items-center gap-2 flex-wrap">
              <TranslatedText text="Never Miss a Hot Bite" />
              <span className="badge badge-primary badge-sm">
                <TranslatedText text="New" />
              </span>
            </h3>
            <p className="text-sm md:text-base text-base-content/70 mb-3">
              <TranslatedText text="Get instant alerts when your favourite species reach 85%+ confidence, plus daily email digests and weekly forecasts to plan the perfect fishing trip." />
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="badge badge-sm badge-outline gap-1">
                <AlertCircle size={12} />
                <span className="text-xs">
                  <TranslatedText text="Hot Bite Alerts" />
                </span>
              </div>
              <div className="badge badge-sm badge-outline gap-1">
                <Mail size={12} />
                <span className="text-xs">
                  <TranslatedText text="Daily Digest" />
                </span>
              </div>
              <div className="badge badge-sm badge-outline gap-1">
                <TrendingUp size={12} />
                <span className="text-xs">
                  <TranslatedText text="Weekly Forecast" />
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onManageSettings}
              className="btn btn-primary btn-sm gap-2"
            >
              <Bell size={16} />
              <TranslatedText text="Manage Notifications" />
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationBanner;
