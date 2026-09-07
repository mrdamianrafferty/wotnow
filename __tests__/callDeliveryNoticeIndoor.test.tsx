/**
 * A setup with nothing outdoors in it receives no call, and has to be told.
 *
 * `daily-call.ts` requires the called activity to be weather-sensitive: a
 * notification claims the weather made today worth telling you about, and an
 * activity the weather has no opinion on cannot make that claim. Correct — but
 * it means somebody who picks yoga, reading and the cinema completes the whole
 * of `/start`, grants notification permission, and then hears nothing for
 * ever, with no screen anywhere saying why. Thirty-seven of the library's
 * activities are indoor, so that setup is an ordinary thing to arrive at.
 *
 * The invariant these pin is the one the ordering rule rests on: the sign-in
 * and Add-to-Home-Screen lines both end by promising the call arrives at the
 * hour you picked, and for this user that promise is false. So the outdoor
 * line has to come first, and it cannot be gated behind auth or platform the
 * way the other two are.
 */

import { render, screen } from '@testing-library/react';
import { CallDeliveryNotice } from '@/components/call/CallDeliveryNotice';

const OUTDOOR_LINE = /pick an outdoor activity/i;

/** Flipped per test rather than isolating modules, which loads a second React. */
let mockUser: { id: string } | null = { id: 'u1' };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

afterEach(() => { mockUser = { id: 'u1' }; });

jest.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    platform: { isIOS: false, isSafari: false, isStandalone: true },
  }),
}));

describe('a setup with nothing outdoors in it', () => {
  it('is told, rather than left in silence', () => {
    render(<CallDeliveryNotice activities={['yoga', 'reading', 'cinema']} />);
    expect(screen.getByText(OUTDOOR_LINE)).toBeInTheDocument();
  });

  it('stays quiet as soon as one outdoor activity is there', () => {
    render(<CallDeliveryNotice activities={['yoga', 'reading', 'running']} />);
    expect(screen.queryByText(OUTDOOR_LINE)).not.toBeInTheDocument();
  });

  /*
   * The seeded set is three outdoor and two indoor, so a user who changes
   * nothing must never see this. It was reported to me the other way round —
   * that `DEFAULT_SPORTS` could never trigger a call — and the claim was
   * wrong. Pinned against the real constant so it stays wrong.
   */
  it('never fires for the activities a new user is seeded with', () => {
    const { DEFAULT_SPORTS } = jest.requireActual('@/lib/godaisy/call/setup');
    render(<CallDeliveryNotice activities={DEFAULT_SPORTS} />);
    expect(screen.queryByText(OUTDOOR_LINE)).not.toBeInTheDocument();
  });

  /*
   * Choosing nothing yet is a different state from choosing only indoor
   * things, and `[].some()` is false — so without the length check this would
   * answer a question nobody has asked. `/start` renders the notice as soon as
   * an hour is picked, which is reachable before the chooser is touched.
   */
  it('says nothing to somebody who has not chosen yet', () => {
    render(<CallDeliveryNotice activities={[]} />);
    expect(screen.queryByText(OUTDOOR_LINE)).not.toBeInTheDocument();
  });

  /*
   * An id the library does not carry must not be read as indoor. `isOutdoor`
   * answers true for an unknown, so a stale or renamed id leaves this silent
   * rather than telling somebody their setup is broken.
   */
  it('treats an unrecognised activity as outdoor rather than accusing the user', () => {
    render(<CallDeliveryNotice activities={['not_a_real_activity']} />);
    expect(screen.queryByText(OUTDOOR_LINE)).not.toBeInTheDocument();
  });
});

describe('the outdoor line outranks the other two', () => {
  it('shows instead of the sign-in line, which would promise delivery that cannot happen', () => {
    mockUser = null;
    render(<CallDeliveryNotice activities={['yoga', 'reading']} />);
    expect(screen.getByText(OUTDOOR_LINE)).toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it('still shows the sign-in line to somebody who does have an outdoor activity', () => {
    mockUser = null;
    render(<CallDeliveryNotice activities={['running']} />);
    expect(screen.getByText(/only send the call to an account/i)).toBeInTheDocument();
    expect(screen.queryByText(OUTDOOR_LINE)).not.toBeInTheDocument();
  });
});
