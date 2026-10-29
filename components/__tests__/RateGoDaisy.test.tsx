import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const state = { native: false, platform: 'ios' as 'ios' | 'android' };
const open = jest.fn(async () => undefined);
const trackEvent = jest.fn();

jest.mock('@/hooks/useIsNativeApp', () => ({ useIsNativeApp: () => state.native }));
jest.mock('@/lib/capacitor/platform', () => ({ getPlatform: () => state.platform }));
jest.mock('@capacitor/browser', () => ({ Browser: { open: (o: unknown) => open(o) } }));
jest.mock('@/lib/analytics/events', () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

import RateGoDaisy from '../RateGoDaisy';
import { APP_STORE_REVIEW_URL, PLAY_STORE_URL, reviewUrl } from '@/lib/daisyFamily';

beforeEach(() => {
  open.mockClear();
  trackEvent.mockClear();
});

describe('the review links', () => {
  it('open the App Store review sheet on iOS and the Play listing on Android', () => {
    expect(reviewUrl('ios')).toBe(APP_STORE_REVIEW_URL);
    expect(APP_STORE_REVIEW_URL).toContain('id6755695873');
    expect(APP_STORE_REVIEW_URL).toContain('action=write-review');
    expect(reviewUrl('android')).toBe(PLAY_STORE_URL);
  });
});

describe('Rate Go Daisy', () => {
  it('is not on the website, where there is no app to rate', () => {
    state.native = false;
    const { container } = render(<RateGoDaisy placement="footer" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the store review page in the shell’s own browser and counts the tap', async () => {
    state.native = true;
    state.platform = 'ios';
    render(<RateGoDaisy placement="account" />);
    fireEvent.click(screen.getByRole('link', { name: 'Rate Go Daisy' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith({ url: APP_STORE_REVIEW_URL }));
    expect(trackEvent).toHaveBeenCalledWith('rate_link_click', { placement: 'account', platform: 'ios' });
  });

  it('goes to Google Play on Android', async () => {
    state.native = true;
    state.platform = 'android';
    render(<RateGoDaisy placement="footer" />);
    fireEvent.click(screen.getByRole('link', { name: 'Rate Go Daisy' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith({ url: PLAY_STORE_URL }));
  });
});
