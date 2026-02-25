import { buildUserHostTags } from '../../../lib/grow/threats/hostTags';
import type { ThreatMatchInput } from '../../../lib/grow/threats/types';

function makeInput(overrides: Partial<ThreatMatchInput> = {}): ThreatMatchInput {
  return {
    userId: 'test-user',
    preferencesJson: {},
    plants: [],
    ...overrides,
  };
}

describe('buildUserHostTags', () => {
  describe('basic plant tagging', () => {
    it('returns empty for no plants and no features', () => {
      expect(buildUserHostTags(makeInput())).toEqual([]);
    });

    it('generates name tag for a plant', () => {
      const input = makeInput({ plants: [{ name: 'Tomato' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('tomato');
    });

    it('generates veg_general for vegetable type', () => {
      const input = makeInput({ plants: [{ name: 'Carrot', type: 'vegetable' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('veg_general');
    });
  });

  describe('crop tag families', () => {
    it('tags brassicas', () => {
      const input = makeInput({ plants: [{ name: 'Cabbage', type: 'vegetable' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('brassicas');
    });

    it('tags cucurbits', () => {
      const input = makeInput({ plants: [{ name: 'Courgette', type: 'vegetable' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('cucurbits');
    });

    it('tags onion family', () => {
      const input = makeInput({ plants: [{ name: 'Garlic', type: 'vegetable' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('onion_family');
    });

    it('tags leafy greens', () => {
      const input = makeInput({ plants: [{ name: 'Lettuce', type: 'vegetable' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('leafy_greens');
    });

    it('tags beans', () => {
      const input = makeInput({ plants: [{ name: 'Peas', type: 'vegetable' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('beans');
    });

    it('tags orchard/fruit trees', () => {
      const input = makeInput({ plants: [{ name: 'Apple', type: 'fruit_tree' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('orchard');
      expect(keys).toContain('fruit_tree');
    });

    it('tags greenhouse crops', () => {
      const input = makeInput({ plants: [{ name: 'Tomato', type: 'vegetable' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('greenhouse_crops');
      expect(keys).toContain('tender_plants');
    });
  });

  describe('aliases', () => {
    it('maps eggplant to aubergine', () => {
      const input = makeInput({ plants: [{ name: 'Eggplant' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('eggplant');
      expect(keys).toContain('aubergine');
    });

    it('maps zucchini to courgette', () => {
      const input = makeInput({ plants: [{ name: 'Zucchini' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('zucchini');
      expect(keys).toContain('courgette');
    });

    it('maps arugula to rocket', () => {
      const input = makeInput({ plants: [{ name: 'Arugula' }] });
      const tags = buildUserHostTags(input);
      const keys = tags.map(t => t.key);
      expect(keys).toContain('arugula');
      expect(keys).toContain('rocket');
    });
  });

  describe('garden features', () => {
    it('adds feature tags from garden_features key', () => {
      const input = makeInput({
        preferencesJson: {
          garden_features: ['lawn', 'raised beds'],
        },
      });
      const tags = buildUserHostTags(input);
      const featureTags = tags.filter(t => t.kind === 'feature_tag');
      expect(featureTags.map(t => t.key)).toContain('lawn');
      expect(featureTags.map(t => t.key)).toContain('raised_beds');
    });

    it('adds feature tags from gardenFeatures key (camelCase)', () => {
      const input = makeInput({
        preferencesJson: {
          gardenFeatures: ['greenhouse'],
        },
      });
      const tags = buildUserHostTags(input);
      const featureTags = tags.filter(t => t.kind === 'feature_tag');
      expect(featureTags.map(t => t.key)).toContain('greenhouse');
    });

    it('ignores non-string garden features', () => {
      const input = makeInput({
        preferencesJson: {
          garden_features: ['lawn', 42, null, 'pond'],
        },
      });
      const tags = buildUserHostTags(input);
      const featureTags = tags.filter(t => t.kind === 'feature_tag');
      expect(featureTags).toHaveLength(2);
      expect(featureTags.map(t => t.key)).toEqual(['lawn', 'pond']);
    });
  });

  describe('deduplication', () => {
    it('deduplicates identical tags', () => {
      const input = makeInput({
        plants: [
          { name: 'Kale', type: 'vegetable' },
          { name: 'Kale', type: 'vegetable' },
        ],
      });
      const tags = buildUserHostTags(input);
      const kaleCount = tags.filter(t => t.key === 'kale').length;
      expect(kaleCount).toBe(1);
    });

    it('deduplicates across kinds', () => {
      // Kale appears in both brassicas and leafy_greens; each should appear once
      const input = makeInput({
        plants: [{ name: 'Kale', type: 'vegetable' }],
      });
      const tags = buildUserHostTags(input);
      const brassicaCount = tags.filter(t => t.key === 'brassicas').length;
      expect(brassicaCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('skips plants with no name', () => {
      const input = makeInput({
        plants: [{ name: '' }, { name: 'Tomato' }],
      });
      const tags = buildUserHostTags(input);
      // Should only have tags for Tomato
      expect(tags.some(t => t.key === 'tomato')).toBe(true);
    });

    it('handles null plants gracefully', () => {
      const input = makeInput({
        plants: [null as unknown as { name: string }, { name: 'Basil' }],
      });
      const tags = buildUserHostTags(input);
      expect(tags.some(t => t.key === 'basil')).toBe(true);
    });

    it('handles empty preferencesJson', () => {
      const input = makeInput({ preferencesJson: {} });
      expect(buildUserHostTags(input)).toEqual([]);
    });

    it('tags houseplants', () => {
      const input = makeInput({ plants: [{ name: 'Fern', type: 'houseplant' }] });
      const tags = buildUserHostTags(input);
      expect(tags.map(t => t.key)).toContain('houseplants');
    });

    it('tags ornamentals', () => {
      const input = makeInput({ plants: [{ name: 'Hosta' }] });
      const tags = buildUserHostTags(input);
      expect(tags.map(t => t.key)).toContain('ornamentals');
    });
  });
});
