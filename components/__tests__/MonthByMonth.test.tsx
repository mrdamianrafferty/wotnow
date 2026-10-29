import { render, screen, within } from '@testing-library/react';
import MonthByMonth from '../seo/MonthByMonth';
import { monthByMonth, type NormalsFile } from '../../lib/seo/climate';

const twelve = (f: (i: number) => number) => Array.from({ length: 12 }, (_, i) => f(i));
const file: NormalsFile = {
  landYears: ['2020', '2024'],
  marineYears: ['2022', '2024'],
  locations: {
    newquay: {
      land: { maxTemp: twelve((i) => 9 + i), minTemp: twelve(() => 5), rainDays: twelve((i) => 16 - i), snowDays: twelve(() => 0), frostDays: twelve(() => 0), wind: twelve(() => 20) },
      marine: { wave: twelve((i) => 1.5 + i / 10), seaTemp: twelve((i) => 10 + i / 2) },
    },
  },
};

describe('the month-by-month section', () => {
  const block = monthByMonth('sea_swimming', { slug: 'newquay', name: 'Newquay' }, 'Sea swimming', file)!;

  it('puts the words in the page, not just a chart', () => {
    render(<MonthByMonth block={block} />);
    expect(screen.getByRole('heading', { name: 'Sea swimming in Newquay, month by month' })).toBeInTheDocument();
    expect(screen.getByText(/The sea is warmest in December/)).toBeInTheDocument();
    expect(screen.getByText(/in season from May to October/)).toBeInTheDocument();
    expect(screen.getByText(/Not a forecast/)).toBeInTheDocument();
  });

  it('starts the heading with a capital even when the page’s activity name is lower case', () => {
    const b = monthByMonth('surfing', { slug: 'newquay', name: 'Newquay' }, 'surfing', file)!;
    render(<MonthByMonth block={b} />);
    expect(screen.getByRole('heading', { name: 'Surfing in Newquay, month by month' })).toBeInTheDocument();
  });

  it('prints every number, a row for each month and a column for each measure', () => {
    render(<MonthByMonth block={block} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(13); // header + 12 months
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5); // month + four measures
    // January sea temperature is 10, December 15.5 -> "16" at 0 decimals; wave in January is 1.5
    expect(within(table).getByText('1.5')).toBeInTheDocument();
  });

  it('says which months are in season for a reader who cannot see the shading', () => {
    render(<MonthByMonth block={block} />);
    expect(screen.getAllByText(/\(in season\)/)).toHaveLength(6);
    expect(screen.getByText('In season, by our seasonal guide')).toBeInTheDocument();
  });

  it('has no season key for an activity with no seasonal guide', () => {
    const b = monthByMonth('surfing', { slug: 'newquay', name: 'Newquay' }, 'Surfing', file)!;
    render(<MonthByMonth block={b} />);
    expect(screen.queryByText(/In season, by our seasonal guide/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(in season\)/)).not.toBeInTheDocument();
  });
});
