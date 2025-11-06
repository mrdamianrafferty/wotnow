/**
 * Fishing Notifications Management Page
 *
 * Displays and manages all scheduled fishing alerts and reminders
 */

import React from 'react';
import SEO from '../../components/SEO';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { NotificationManager } from '../../components/findr/NotificationManager';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <>
      <SEO
        title="Fishing Alerts - findr"
        description="Manage your fishing alerts and reminders. View and cancel scheduled notifications for hot bites and peak fishing conditions."
        url="https://fishfindr.eu/findr/notifications"
      />
      <main className="min-h-screen bg-base-200 pb-20">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="container mx-auto pt-6 px-4 max-w-3xl">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-3 mb-2">
              <Bell size={28} className="text-primary" />
              <TranslatedText text="Fishing Alerts" />
            </h1>
            <p className="text-sm text-base-content/70">
              <TranslatedText text="Manage your scheduled fishing alerts and reminders" />
            </p>
          </div>

          {/* Notification Manager Component */}
          <NotificationManager />

          {/* Help Text */}
          <div className="mt-8 card bg-base-100 border border-base-300 p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <TranslatedText text="How Fishing Alerts Work" />
            </h3>
            <ul className="space-y-2 text-sm text-base-content/80">
              <li className="flex items-start gap-2">
                <span className="text-error font-bold">•</span>
                <div>
                  <strong><TranslatedText text="Hot Bite Alerts" /></strong>
                  <span className="text-base-content/60"> - </span>
                  <TranslatedText text="Instant notifications for species with 85%+ confidence. They're biting right now!" />
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warning font-bold">•</span>
                <div>
                  <strong><TranslatedText text="Peak Conditions Reminders" /></strong>
                  <span className="text-base-content/60"> - </span>
                  <TranslatedText text="Scheduled reminders for species with 70-84% confidence. Plan ahead for the best fishing times." />
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-info font-bold">•</span>
                <div>
                  <strong><TranslatedText text="Smart Scheduling" /></strong>
                  <span className="text-base-content/60"> - </span>
                  <TranslatedText text="Reminders are scheduled for 8am on the peak day (tomorrow, day after tomorrow, or in 2 hours if no peak detected)." />
                </div>
              </li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="mt-4 alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-sm">
              <TranslatedText text="Set alerts from prediction cards by tapping the bell icon. You can cancel them here at any time." />
            </span>
          </div>
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
