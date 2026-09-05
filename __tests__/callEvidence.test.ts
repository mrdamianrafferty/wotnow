/**
 * The order of the evidence.
 *
 * The drawer's whole argument is that a dashboard's fixed order can only be
 * right by accident. That argument is worth nothing if the ordering is wrong,
 * and it is not visible from a screenshot — a plausible-looking drawer with the
 * sections in the wrong order looks exactly like a correct one.
 */

import {
  rankSections, visibleSections, EVIDENCE_SECTIONS, type Weighed,
} from '@/lib/godaisy/call/evidence';

const ids = (s: { id: string }[]) => s.map((x) => x.id);

describe('evidence ordering', () => {
  it('keeps the declared order when nothing was weighed', () => {
    expect(ids(rankSections(undefined))).toEqual(EVIDENCE_SECTIONS.map((s) => s.id));
    expect(ids(rankSections([]))).toEqual(EVIDENCE_SECTIONS.map((s) => s.id));
  });

  it('always returns every section — the reader who doubts gets the whole picture', () => {
    const out = rankSections([{ key: 'gust', score: 0.2 }]);
    expect(out).toHaveLength(EVIDENCE_SECTIONS.length);
    expect(new Set(ids(out))).toEqual(new Set(EVIDENCE_SECTIONS.map((s) => s.id)));
  });

  /* A day called off for gusts opens on wind, not on whatever the dashboard
     happened to put first. */
  it('leads with the section the verdict turned on', () => {
    expect(ids(rankSections([{ key: 'gust', score: 0.15 }]))[0]).toBe('wind');
    expect(ids(rankSections([{ key: 'swellPeriod', score: 0.3 }]))[0]).toBe('sea');
    expect(ids(rankSections([{ key: 'soilMoisture', score: 0.25 }]))[0]).toBe('ground');
  });

  it('orders promoted sections by how badly each was missed', () => {
    const weighed: Weighed[] = [
      { key: 'temperature', score: 0.83 },
      { key: 'gust', score: 0.20 },
      { key: 'clouds', score: 0.55 },
    ];
    expect(ids(rankSections(weighed)).slice(0, 3)).toEqual(['wind', 'sky', 'temperature']);
  });

  /*
   * Wind can be pointed at by windSpeed, gust and windRelative at once. Ranking
   * each separately would let three comfortable wind criteria outrank one
   * marginal sea criterion — which reverses the point of the exercise.
   */
  it('promotes a section by its WEAKEST criterion, not by how many it has', () => {
    const weighed: Weighed[] = [
      { key: 'windSpeed', score: 0.95 },
      { key: 'gust', score: 0.98 },
      { key: 'windRelative', score: 0.92 },
      { key: 'waveHeight', score: 0.40 },
    ];
    const out = ids(rankSections(weighed));
    expect(out[0]).toBe('sea');
    expect(out[1]).toBe('wind');
  });

  it('records why a section was promoted, and leaves it absent when nothing did', () => {
    const out = rankSections([{ key: 'gust', score: 0.2, value: 52 }]);
    expect(out[0].because).toEqual({ key: 'gust', score: 0.2, value: 52 });
    expect(out.find((s) => s.id === 'night')?.because).toBeUndefined();
  });

  it('ignores a criterion key no section claims', () => {
    const out = rankSections([{ key: 'somethingNobodyModels', score: 0.1 }]);
    expect(ids(out)).toEqual(EVIDENCE_SECTIONS.map((s) => s.id));
    expect(out[0].because).toBeUndefined();
  });

  /* The sea and the tides are not evidence for a bike ride, and a drawer that
     shows them anyway is the dashboard again. */
  it('drops the coastal sections inland, and keeps them on the coast', () => {
    const inland = ids(visibleSections([{ key: 'gust', score: 0.3 }], { coastal: false }));
    expect(inland).not.toContain('sea');
    expect(inland).not.toContain('tide');
    expect(inland[0]).toBe('wind');

    const coast = ids(visibleSections([{ key: 'gust', score: 0.3 }], { coastal: true }));
    expect(coast).toContain('sea');
    expect(coast).toContain('tide');
  });

  it('has no key claimed by two sections', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const s of EVIDENCE_SECTIONS) {
      for (const k of s.keys) {
        const first = seen.get(k);
        if (first) clashes.push(`${k}: ${first} and ${s.id}`);
        else seen.set(k, s.id);
      }
    }
    expect(clashes).toEqual([]);
  });
});
