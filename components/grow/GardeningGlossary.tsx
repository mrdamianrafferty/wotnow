import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { BookOpen, Search } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Image map – links glossary terms to the woodcut-style tool icons  */
/* ------------------------------------------------------------------ */
const GLOSSARY_IMAGES: Record<string, string> = {
  'bare-root':    '/grow/glossary/shovel.png',
  blanching:      '/grow/glossary/gloves.png',
  chitting:       '/grow/glossary/bucket.png',
  cloche:         '/grow/glossary/boots.png',
  compost:        '/grow/glossary/compost.png',
  cordon:         '/grow/glossary/scissors.png',
  'cutting-back': '/grow/glossary/scissors.png',
  deadheading:    '/grow/glossary/scissors.png',
  dibber:         '/grow/glossary/dibber.png',
  drill:          '/grow/glossary/rake.png',
  'earthing-up':  '/grow/glossary/shovel.png',
  'feed-feeding': '/grow/glossary/fertilise.png',
  fleece:         '/grow/glossary/boots.png',
  'green-manure': '/grow/glossary/leaf.png',
  'hardening-off':'/grow/glossary/inspect.png',
  lifting:        '/grow/glossary/garden-fork.png',
  'mulch-mulching':'/grow/glossary/mulch.png',
  'pinching-out': '/grow/glossary/little-fork.png',
  'potting-on':   '/grow/glossary/bucket.png',
  'pricking-out': '/grow/glossary/dibber.png',
  'succession-sowing':'/grow/glossary/harvest-basket.png',
  tilth:          '/grow/glossary/soil-test-kit.png',
  'top-dressing': '/grow/glossary/fertilise.png',
  transplanting:  '/grow/glossary/shovel.png',
  'well-rotted':  '/grow/glossary/compost.png',
  'watering':     '/grow/glossary/watering-can.png',
};

/* ------------------------------------------------------------------ */
/*  Full glossary data                                                */
/* ------------------------------------------------------------------ */
interface GlossaryEntry {
  term: string;
  slug: string;
  definition: string;
}

const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Annual',
    slug: 'annual',
    definition: 'A plant that grows, flowers, sets seed, and dies in one growing season. Many bedding flowers and some vegetables are grown this way.',
  },
  {
    term: 'Bare root',
    slug: 'bare-root',
    definition: 'A plant sold without a pot or compost around the roots, usually in the dormant season. Common with fruit trees, hedging, and roses.',
  },
  {
    term: 'Blanching',
    slug: 'blanching',
    definition: 'Keeping part of a plant out of the light so it stays pale and tender. Often done to leeks, celery, chicory, or endive.',
  },
  {
    term: 'Bolting',
    slug: 'bolting',
    definition: 'When a plant starts flowering and setting seed sooner than you want. Common in lettuce, spinach, rocket, coriander, onions, and beetroot. It often happens after stress, cold shock, heat, or long days.',
  },
  {
    term: 'Chitting',
    slug: 'chitting',
    definition: 'Letting seed potatoes sprout before planting. This is done by placing them somewhere cool, bright, and frost-free until short shoots appear.',
  },
  {
    term: 'Cloche',
    slug: 'cloche',
    definition: 'A cover used to protect plants from cold, wind, or pests. It can be glass, plastic, or fleece.',
  },
  {
    term: 'Compost',
    slug: 'compost',
    definition: 'Usually means either decomposed organic matter used to improve soil, or potting compost used in pots and seed trays. The meaning depends on context.',
  },
  {
    term: 'Cordon',
    slug: 'cordon',
    definition: 'A way of training a fruit plant, often apples, pears, or tomatoes, into a single main stem. It saves space and can make pruning easier.',
  },
  {
    term: 'Crown',
    slug: 'crown',
    definition: 'The point where the roots meet the stems. This is an important part of many plants and usually should not be buried too deeply.',
  },
  {
    term: 'Cutting back',
    slug: 'cutting-back',
    definition: 'Pruning a plant down to encourage fresh growth, tidy it up, or remove old stems. How far back depends on the plant.',
  },
  {
    term: 'Deadheading',
    slug: 'deadheading',
    definition: 'Removing faded flowers. This is done to keep plants tidy and often to encourage more blooms instead of seed production.',
  },
  {
    term: 'Dibber',
    slug: 'dibber',
    definition: 'A pointed tool, or even just a stick or finger, used to make planting holes for seeds, seedlings, or bulbs.',
  },
  {
    term: 'Drill',
    slug: 'drill',
    definition: 'A shallow line or trench made in the soil for sowing seed in rows.',
  },
  {
    term: 'Earthing up',
    slug: 'earthing-up',
    definition: 'Pulling soil up around the base of a plant. Done to potatoes to keep tubers covered, and to leeks to blanch the stems.',
  },
  {
    term: 'Feed / Feeding',
    slug: 'feed-feeding',
    definition: 'Giving plants extra nutrients, usually with fertiliser, liquid feed, compost, or manure. Pots often need feeding more than plants in open ground.',
  },
  {
    term: 'First frost / Last frost',
    slug: 'first-frost-last-frost',
    definition: 'The first frost of autumn and the last frost of spring. These dates matter because tender plants can be damaged or killed by frost.',
  },
  {
    term: 'Fleece',
    slug: 'fleece',
    definition: 'A lightweight fabric used to protect plants from cold, wind, or pests. It is often laid over crops or wrapped loosely around plants.',
  },
  {
    term: 'Fruit set',
    slug: 'fruit-set',
    definition: 'The stage when flowers begin turning into fruit. Poor fruit set means flowers formed but not many fruits developed.',
  },
  {
    term: 'Green manure',
    slug: 'green-manure',
    definition: 'A crop grown mainly to improve the soil, then cut down and dug in or left on the surface. Often used to protect and feed empty beds.',
  },
  {
    term: 'Hardening off',
    slug: 'hardening-off',
    definition: 'Gradually getting indoor-grown or protected young plants used to outdoor conditions. It is done by putting them outside for longer periods each day over about a week or two. It helps prevent shock from wind, cold, and strong sun.',
  },
  {
    term: 'Herbaceous perennial',
    slug: 'herbaceous-perennial',
    definition: 'A plant that lives for several years but dies back above ground in winter and regrows in spring.',
  },
  {
    term: 'Leggy',
    slug: 'leggy',
    definition: 'Tall, thin, weak growth, usually caused by too little light or too much warmth. Leggy seedlings often flop and are less sturdy.',
  },
  {
    term: 'Lifting',
    slug: 'lifting',
    definition: 'Digging up bulbs, tubers, or crops from the ground. It can also mean removing tender plants for storage over winter.',
  },
  {
    term: 'Mulch / Mulching',
    slug: 'mulch-mulching',
    definition: 'A layer of material spread on the soil surface, such as compost, bark, straw, or leafmould. It helps hold moisture, suppress weeds, and improve soil.',
  },
  {
    term: 'Perennial',
    slug: 'perennial',
    definition: 'A plant that lives for more than two years. Some keep their leaves all year, while others die back in winter and return in spring.',
  },
  {
    term: 'Pinching out',
    slug: 'pinching-out',
    definition: 'Removing the growing tip of a plant. This is done to encourage bushier growth and more side shoots.',
  },
  {
    term: 'Potting on',
    slug: 'potting-on',
    definition: 'Moving a plant into a slightly larger pot. This is done when it has outgrown its current pot and needs more room for roots and compost.',
  },
  {
    term: 'Pricking out',
    slug: 'pricking-out',
    definition: 'Transplanting tiny seedlings from a crowded tray into their own pots or modules. This gives them more space to grow properly.',
  },
  {
    term: 'Rootball',
    slug: 'rootball',
    definition: 'The mass of roots and compost that comes out of a pot when you remove a plant.',
  },
  {
    term: 'Rootbound',
    slug: 'rootbound',
    definition: "When a plant's roots have filled the pot and are circling tightly. Rootbound plants often dry out quickly and stop growing well.",
  },
  {
    term: 'Runner',
    slug: 'runner',
    definition: 'A long side shoot that grows away from the main plant and can form a new plant. Strawberries are a classic example.',
  },
  {
    term: 'Seed leaf / Cotyledon',
    slug: 'seed-leaf-cotyledon',
    definition: "The first leaves that appear when a seed germinates. They are not the same as the plant's first true leaves.",
  },
  {
    term: 'Self-seeding',
    slug: 'self-seeding',
    definition: 'When a plant drops seed and new seedlings appear by themselves the following season.',
  },
  {
    term: 'Side shoot',
    slug: 'side-shoot',
    definition: 'A shoot growing from the side of the main stem. Sometimes these are removed, as with cordon tomatoes, and sometimes they are encouraged.',
  },
  {
    term: 'Succession sowing',
    slug: 'succession-sowing',
    definition: 'Sowing little and often rather than all at once. This gives a longer harvest and avoids gluts.',
  },
  {
    term: 'Tender',
    slug: 'tender',
    definition: 'Not hardy enough to survive frost. Tender plants need protection or must be grown after frost risk has passed.',
  },
  {
    term: 'Thinning out',
    slug: 'thinning-out',
    definition: 'Removing some seedlings, fruits, or stems so the rest have room to develop properly. It feels harsh, but it usually improves the final crop.',
  },
  {
    term: 'Tilth',
    slug: 'tilth',
    definition: 'The texture of prepared soil. A fine tilth means crumbly, loose soil that is good for sowing small seeds.',
  },
  {
    term: 'Top dressing',
    slug: 'top-dressing',
    definition: 'Adding a layer of compost, manure, or fertiliser to the soil surface around plants rather than digging it in deeply.',
  },
  {
    term: 'Transplanting',
    slug: 'transplanting',
    definition: 'Moving a plant from one place to another, such as from a pot to a bed, or from a seed tray into a larger container.',
  },
  {
    term: 'True leaves',
    slug: 'true-leaves',
    definition: 'The first proper leaves that appear after the initial seed leaves. These usually look more like the mature plant and often signal that a seedling is ready to be pricked out.',
  },
  {
    term: 'Well-rotted',
    slug: 'well-rotted',
    definition: 'Organic matter such as manure that has broken down properly and is dark, crumbly, and earthy-smelling. This is safer for plants than fresh manure.',
  },
];

/* ------------------------------------------------------------------ */
/*  Derive letter index from glossary data                            */
/* ------------------------------------------------------------------ */
function getLetterIndex(entries: GlossaryEntry[]) {
  const letters = new Set<string>();
  entries.forEach((e) => letters.add(e.term[0].toUpperCase()));
  return Array.from(letters).sort();
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function GardeningGlossary() {
  const [filter, setFilter] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = GLOSSARY;
    if (activeLetter) {
      list = list.filter((e) => e.term[0].toUpperCase() === activeLetter);
    }
    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.term.toLowerCase().includes(q) ||
          e.definition.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filter, activeLetter]);

  const letters = useMemo(() => getLetterIndex(GLOSSARY), []);

  // Group filtered entries by first letter
  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryEntry[]>();
    for (const entry of filtered) {
      const letter = entry.term[0].toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-green-600" />
          A\u2013Z Gardening Glossary
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Plain-English definitions of common gardening terms
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search glossary\u2026"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              if (e.target.value.trim()) setActiveLetter(null);
            }}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          />
        </div>

        {/* Letter bar */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => { setActiveLetter(null); setFilter(''); }}
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium transition-colors',
              !activeLetter
                ? 'bg-green-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All
          </button>
          {letters.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => { setActiveLetter(l === activeLetter ? null : l); setFilter(''); }}
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                activeLetter === l
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Results count */}
        {(filter || activeLetter) && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {GLOSSARY.length} terms
          </p>
        )}

        {/* Glossary entries by letter */}
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No terms match your search. Try a different keyword.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([letter, entries]) => (
              <div key={letter}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-1 mb-2 border-b border-border/40">
                  <span className="text-lg font-bold text-green-700">{letter}</span>
                </div>
                <div className="space-y-2">
                  {entries.map((entry) => {
                    const img = GLOSSARY_IMAGES[entry.slug];
                    return (
                      <div
                        key={entry.slug}
                        className="flex gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors"
                      >
                        {img && (
                          <div className="hidden sm:flex shrink-0 items-start pt-0.5">
                            <Image
                              src={img}
                              alt=""
                              width={36}
                              height={36}
                              className="opacity-70"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold leading-tight">{entry.term}</h4>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            {entry.definition}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-normal">{GLOSSARY.length} terms</Badge>
          <span>Written for new gardeners</span>
        </div>
      </CardContent>
    </Card>
  );
}
