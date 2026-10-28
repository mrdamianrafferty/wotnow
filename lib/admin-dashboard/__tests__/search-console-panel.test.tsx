/**
 * The Google search panel: figures for a site it read, the property to grant
 * for one it could not, and never a zero in place of either.
 */

import { render, screen } from '@testing-library/react';
import { SearchConsolePanel, shortPage } from '@/components/admin/SearchConsolePanel';
import { sampleSearchConsole } from '../search-console-sample';

const now = new Date('2026-10-28T10:00:00Z');

describe('SearchConsolePanel', () => {
  it('shows each site’s figures, change and top rows', () => {
    render(<SearchConsolePanel section={sampleSearchConsole(now)} />);
    expect(screen.getByRole('heading', { name: 'Google search' })).toBeInTheDocument();
    expect(screen.getByText(/28 Sept? – 25 Oct, against the 28 days before/)).toBeInTheDocument();
    expect(screen.getByText('64,300')).toBeInTheDocument();
    expect(screen.getAllByText('▲ 19%').length).toBeGreaterThan(0);
    expect(screen.getByText('river test fishing')).toBeInTheDocument();
  });

  it('names the property and account for a site without access, and shows an error as an error', () => {
    render(<SearchConsolePanel section={sampleSearchConsole(now)} />);
    expect(
      screen.getByText(/Add grewp-analytics-reader@grewp-fdbd2\.iam\.gserviceaccount\.com as a Restricted user on https:\/\/fishfindr\.eu\//),
    ).toBeInTheDocument();
    expect(screen.getByText(/Search Console error: Search Console 500/)).toBeInTheDocument();
  });

  it('says what is missing when the whole section is not configured', () => {
    render(<SearchConsolePanel section={{ state: 'not_configured', missing: ['GOOGLE_ANALYTICS_CREDENTIALS'] }} />);
    expect(screen.getByText('Not connected. Set GOOGLE_ANALYTICS_CREDENTIALS.')).toBeInTheDocument();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders nothing before the section exists', () => {
    const { container } = render(<SearchConsolePanel section={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shortens page URLs but keeps the host', () => {
    expect(shortPage('https://www.risedaisy.com/rivers/test')).toBe('risedaisy.com/rivers/test');
    expect(shortPage('https://hungerford.risedaisy.com/')).toBe('hungerford.risedaisy.com/');
  });
});
