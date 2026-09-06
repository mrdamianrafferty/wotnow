/**
 * The location search, against the same-origin proxy.
 *
 * IT WAS CALLING `geocoding-api.open-meteo.com` DIRECTLY FROM THE BROWSER.
 * The CSP's `connect-src` (`vercel.json`) has never allowed that domain, so
 * every search silently failed and fell straight through to "Nothing by
 * that name." — for every query typed, not just obscure ones. `/api/geocode`
 * is the same-origin proxy that already existed for exactly this; the fix is
 * to call it instead. This test pins the request target so a future change
 * cannot quietly point it back at the blocked domain.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationSheet } from '@/components/call/LocationSheet';

describe('the location search sheet', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: 'Newquay', lat: 50.4155, lon: -5.0737, state: 'Cornwall', country: 'England' }],
    }) as never;
  });

  it('asks the same-origin proxy, never the CSP-blocked geocoder directly', async () => {
    render(<LocationSheet current="Sheffield" onClose={() => {}} />);
    await userEvent.type(screen.getByRole('searchbox', { name: /search for a place/i }), 'newquay');

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toMatch(/^\/api\/geocode\?/);
    expect(url).not.toMatch(/geocoding-api\.open-meteo\.com/);
  });

  it('shows the result the proxy returns, not "Nothing by that name"', async () => {
    render(<LocationSheet current="Sheffield" onClose={() => {}} />);
    await userEvent.type(screen.getByRole('searchbox', { name: /search for a place/i }), 'newquay');

    expect(await screen.findByText('Newquay')).toBeInTheDocument();
    expect(screen.queryByText('Nothing by that name.')).not.toBeInTheDocument();
  });
});
