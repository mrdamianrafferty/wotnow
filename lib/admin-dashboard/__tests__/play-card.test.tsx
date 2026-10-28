/**
 * The Google Play row on each app's card (play-console.ts has the data and
 * the attention rules): rating, release, and the week's reviews.
 */

import { render, within } from '@testing-library/react';
import { FamilyDashboard } from '@/components/admin/FamilyDashboard';
import { sampleFamilySummary } from '../family-sample';

const now = new Date('2026-10-28T10:00:00Z');

describe('Google Play row on the family dashboard', () => {
  const card = (id: string) => {
    render(<FamilyDashboard data={sampleFamilySummary(now, { withPlay: true })} />);
    return within(document.getElementById(`app-${id}`)!);
  };

  it('shows the rating with its 30-day change, and the release state', () => {
    const rise = card('risedaisy');
    expect(rise.getByText(/★ 4\.8 \(\+0\.1 in 30 days\)/)).toBeInTheDocument();
    expect(rise.getByText('1.8.3 · live')).toBeInTheDocument();
  });

  it('says what a release is waiting on, and that there is no rating yet', () => {
    const fly = card('flycast');
    expect(fly.getByText('No rating yet')).toBeInTheDocument();
    expect(fly.getByText('1.0.3 · draft, not sent')).toBeInTheDocument();
  });

  it('shows the week’s reviews with the average and how many need a reply, only when there are some', () => {
    expect(card('findr').getByText(/3 reviews this week · ★ 2\.7 · 2 to reply/)).toBeInTheDocument();
    document.body.innerHTML = '';
    expect(card('grewp').queryByText(/reviews? this week/)).toBeNull();
  });
});

describe('Play downloads on the card', () => {
  it('shows active devices, uninstalls and the listing’s visitors → installs, only for apps that have them', () => {
    render(<FamilyDashboard data={sampleFamilySummary(now, { withPlay: true })} />);
    const findr = within(document.getElementById('app-findr')!);
    expect(findr.getByText('22 active devices · 3 uninstalls in 7 days')).toBeInTheDocument();
    expect(findr.getByText(/Listing 96 visitors → 6 installs \(6\.3%\)/)).toBeInTheDocument();
    expect(within(document.getElementById('app-grewp')!).queryByText(/active device/)).toBeNull();
  });

  it('counts the Android downloads in the card’s total', () => {
    render(<FamilyDashboard data={sampleFamilySummary(now, { withPlay: true })} />);
    expect(within(document.getElementById('app-risedaisy')!).getByText(/Android 14/)).toBeInTheDocument();
  });
});
