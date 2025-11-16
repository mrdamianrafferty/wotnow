import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { HelpCircle, Hand, Droplets, Eye, ThermometerSun, Wind, Leaf } from 'lucide-react';

type SoilFeel = 'sticky' | 'gritty' | 'crumbly' | 'spongy' | 'silky' | 'stony' | 'balanced';

type SoilDrainage = 'holds water' | 'quick drain' | 'balanced' | 'variable';

type SoilChallenge = 'compaction' | 'nutrient loss' | 'alkaline' | 'acidic' | 'cold spring' | 'waterlogged' | 'unknown';

interface SoilType {
  id: string;
  emoji: string;
  name: string;
  whatItIs: string;
  recognition: string[];
  behaviour: string;
  feels: SoilFeel;
  drainage: SoilDrainage;
  commonChallenges: SoilChallenge[];
  bestPlants: string[];
  improvementTips: string[];
}

const soilTypes: SoilType[] = [
  {
    id: 'clay',
    emoji: '🌑',
    name: 'Clay Soil',
    whatItIs:
      'Soil with very fine particles that pack closely together. Holds water easily and becomes heavy when wet.',
    recognition: [
      'Feels sticky and cold when wet',
      'You can roll it into a sausage or ball in your hand',
      'Cracks when dry',
      'Often slow to warm up in spring',
      'Can be tough to dig',
    ],
    behaviour:
      'Rich in nutrients but drains poorly. Great for moisture-loving plants once improved with organic matter.',
    feels: 'sticky',
    drainage: 'holds water',
    commonChallenges: ['compaction', 'cold spring', 'waterlogged'],
    bestPlants: ['Astilbe', 'Hosta', 'Dogwood', 'Iris'],
    improvementTips: [
      'Add well-rotted compost each autumn',
      'Build raised beds for better drainage',
      'Mulch to protect soil structure through winter',
      'Avoid digging when the soil is wet to reduce compaction',
    ],
  },
  {
    id: 'sandy',
    emoji: '🟡',
    name: 'Sandy Soil',
    whatItIs: 'Loose, gritty soil with large particles and plenty of air between them.',
    recognition: [
      'Feels dry, gritty, and crumbly',
      'Falls apart in your hand',
      'Water drains very quickly',
      'Warms up fast in spring',
      "Doesn't hold nutrients for long",
    ],
    behaviour:
      'Easy to work and great for drought-tolerant plants. Benefits from compost to improve moisture retention.',
    feels: 'gritty',
    drainage: 'quick drain',
    commonChallenges: ['nutrient loss', 'unknown'],
    bestPlants: ['Lavender', 'Sedum', 'Thyme', 'Sea Holly'],
    improvementTips: [
      'Incorporate moisture-retentive compost or well-rotted manure',
      'Add a layer of mulch to reduce evaporation',
      'Water deeply but less frequently to encourage deep roots',
      'Use slow-release organic fertilizers to combat nutrient leaching',
    ],
  },
  {
    id: 'loam',
    emoji: '🟤',
    name: 'Loam Soil',
    whatItIs:
      'A balanced mix of sand, silt, and clay — often considered the "perfect" garden soil.',
    recognition: [
      'Feels soft, crumbly, and slightly moist',
      'Holds its shape briefly but crumbles easily',
      'Drains well but still keeps moisture',
      'Usually dark and rich-looking',
    ],
    behaviour:
      'Fantastic for most plants. Good drainage, good nutrients, and easy to improve.',
    feels: 'balanced',
    drainage: 'balanced',
    commonChallenges: ['unknown'],
    bestPlants: ['Most vegetables', 'Roses', 'Perennials', 'Fruit trees'],
    improvementTips: [
      'Maintain fertility with annual compost applications',
      'Mulch beds to conserve moisture and protect soil life',
      'Rotate crops to keep nutrients balanced',
      'Avoid compaction by using designated paths',
    ],
  },
  {
    id: 'silty',
    emoji: '🤎',
    name: 'Silty Soil',
    whatItIs: 'Soil with fine, smooth particles — somewhere between sand and clay.',
    recognition: [
      'Feels soft, silky, or soapy',
      'Easily compacted between fingers',
      'Holds moisture without becoming sticky',
      'Can look slightly glossy when wet',
    ],
    behaviour:
      'Naturally fertile and holds water well, but can become compacted. Adding compost helps keep it aerated.',
    feels: 'silky',
    drainage: 'variable',
    commonChallenges: ['compaction', 'waterlogged'],
    bestPlants: ['Grass mixes', 'Willows', 'Peonies', 'Helenium'],
    improvementTips: [
      'Add coarse sand or grit to improve structure',
      'Use raised beds in high rainfall areas',
      'Mulch to protect from heavy rain compaction',
      'Avoid walking on the soil when wet',
    ],
  },
  {
    id: 'peaty',
    emoji: '⚫',
    name: 'Peaty Soil',
    whatItIs: 'Dark, organic-rich soil made from partially decomposed plant material.',
    recognition: [
      'Feels spongy or springy',
      'Holds moisture like a sponge',
      'Very dark brown or almost black',
      'Often slightly acidic',
      'Light in weight',
    ],
    behaviour:
      'Great for moisture-loving or acid-loving plants. Often needs sand or grit for structure.',
    feels: 'spongy',
    drainage: 'holds water',
    commonChallenges: ['acidic', 'waterlogged'],
    bestPlants: ['Blueberries', 'Azaleas', 'Camellias', 'Heathers'],
    improvementTips: [
      'Mix in horticultural sand for structure',
      'Add lime if pH testing shows strong acidity',
      'Ensure good drainage by using raised beds',
      'Mulch with pine needles to maintain acidity for ericaceous plants',
    ],
  },
  {
    id: 'chalky',
    emoji: '⚪',
    name: 'Chalky Soil',
    whatItIs: 'Soil sitting on top of limestone or chalk rock — naturally alkaline.',
    recognition: [
      'Feels stony and dry',
      'Often pale or whitish',
      'May contain visible lumps of chalk',
      'Drains quickly',
      'Can cause yellowing leaves due to nutrient lockout',
    ],
    behaviour:
      'Best for alkaline-loving plants. Benefits from organic matter to improve structure.',
    feels: 'stony',
    drainage: 'quick drain',
    commonChallenges: ['alkaline', 'nutrient loss'],
    bestPlants: ['Lavender', 'Wallflowers', 'Ceanothus', 'Lilac'],
    improvementTips: [
      'Add organic matter regularly to retain moisture',
      'Use seaweed-based feeds to supply trace elements',
      'Grow plants in raised beds with imported loam for acid lovers',
      'Collect rainwater for irrigation to avoid extra lime',
    ],
  },
  {
    id: 'not_sure',
    emoji: '❓',
    name: 'Not Sure',
    whatItIs:
      "You may have mixed soil, or you're not confident yet — totally normal for new gardeners.",
    recognition: [
      'Try the hand test to build confidence',
      'Observe how water behaves after rain',
      'Notice how the soil feels across seasons',
      'Keep notes on plant performance',
      'Update your soil type as you learn',
    ],
    behaviour:
      'Soil can vary across a garden. Build knowledge gradually and adjust your plan as you gather observations.',
    feels: 'balanced',
    drainage: 'variable',
    commonChallenges: ['unknown'],
    bestPlants: ['Herbs', 'Salad leaves', 'Annual flowers', 'Container mixes'],
    improvementTips: [
      'Start a garden journal noting moisture, growth, and colour',
      'Test different beds with moisture meters or probe tests',
      'Send a soil sample to a lab for pH and texture testing',
      'Use raised beds for controlled soil environments',
    ],
  },
];

const quickReferenceRows = [
  {
    title: 'Texture clues',
    icon: <Hand className="h-4 w-4" />,
    items: [
      { label: 'Sticky + mouldable', soil: 'Clay', emoji: '🌑' },
      { label: 'Gritty + dry', soil: 'Sand', emoji: '🟡' },
      { label: 'Soft + silky', soil: 'Silt', emoji: '🤎' },
      { label: 'Spongy + fibrous', soil: 'Peat', emoji: '⚫' },
    ],
  },
  {
    title: 'Drainage speed',
    icon: <Droplets className="h-4 w-4" />,
    items: [
      { label: 'Puddles for hours', soil: 'Clay', emoji: '🌑' },
      { label: 'Gone in minutes', soil: 'Sand', emoji: '🟡' },
      { label: 'Steady + reliable', soil: 'Loam', emoji: '🟤' },
      { label: 'Varies by spot', soil: 'Mixed', emoji: '❓' },
    ],
  },
  {
    title: 'Spring warmth',
    icon: <ThermometerSun className="h-4 w-4" />,
    items: [
      { label: 'Slow to warm', soil: 'Clay', emoji: '🌑' },
      { label: 'Warms quickly', soil: 'Sand', emoji: '🟡' },
      { label: 'Even temps', soil: 'Loam', emoji: '🟤' },
      { label: 'Can be cold + wet', soil: 'Peat', emoji: '⚫' },
    ],
  },
  {
    title: 'Common fixes',
    icon: <Wind className="h-4 w-4" />,
    items: [
      { label: 'Add grit + compost', soil: 'Clay', emoji: '🌑' },
      { label: 'Add organic matter', soil: 'Sand', emoji: '🟡' },
      { label: 'Add sand for structure', soil: 'Silt', emoji: '🤎' },
      { label: 'Add lime or grit', soil: 'Peat/Chalk', emoji: '⚫' },
    ],
  },
];

const tipSections: Array<{ title: string; points: string[] }> = [
  {
    title: 'Observe through the seasons',
    points: [
      'Watch how quickly puddles disappear after heavy rain',
      'Check soil colour changes between winter and summer',
      'Note any winter frosting or cracking as soil expands and contracts',
      'Record plant performance to spot nutrient or moisture issues early',
    ],
  },
  {
    title: 'Simple tests you can do at home',
    points: [
      'Use a clear jar filled with soil and water to settle out sand, silt, and clay layers',
      'Measure pH using inexpensive testing kits each spring',
      'Bury a cotton sock in spring and check decomposition in autumn to gauge soil life',
      'Lay cardboard on a bed for a few weeks to see how quickly worms and microbes break it down',
    ],
  },
  {
    title: 'Improving any soil type',
    points: [
      'Add organic matter little and often rather than once in huge batches',
      'Mulch bare soil to protect living organisms and reduce erosion',
      'Grow cover crops in winter to protect and feed soil life',
      'Avoid over-tilling; gentle cultivation protects soil structure',
    ],
  },
  {
    title: 'Working with your soil, not against it',
    points: [
      'Choose plant varieties that thrive in your soil rather than forcing alterations',
      'Use containers and raised beds for specialist plants needing specific pH levels',
      'Group plants with similar water needs to simplify irrigation',
      'Celebrate microclimates: slopes, walls, and shade can change soil behaviour locally',
    ],
  },
];

const plantSuggestionMap: Record<SoilType['id'], string[]> = soilTypes.reduce((acc, soil) => {
  acc[soil.id] = soil.bestPlants;
  return acc;
}, {} as Record<string, string[]>);

interface SoilIdentificationGuideProps {
  children?: React.ReactNode;
  variant?: 'button' | 'icon';
}

export function SoilIdentificationGuide({ children, variant = 'icon' }: SoilIdentificationGuideProps) {
  const [open, setOpen] = useState(false);

  const soilByDrainage = useMemo(() => {
    return soilTypes.reduce<Record<SoilDrainage, SoilType[]>>(
      (groups, soil) => {
        groups[soil.drainage].push(soil);
        return groups;
      },
      {
        'holds water': [],
        'quick drain': [],
        balanced: [],
        variable: [],
      },
    );
  }, []);

  const soilByChallenge = useMemo(() => {
    const entries: Array<{ challenge: SoilChallenge; soils: SoilType[] }> = [];
    const allChallenges = Array.from(
      new Set(soilTypes.flatMap((soil) => soil.commonChallenges)),
    );

    allChallenges.forEach((challenge) => {
      const soils = soilTypes.filter((soil) => soil.commonChallenges.includes(challenge));
      entries.push({ challenge, soils });
    });

    return entries;
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : variant === 'icon' ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" type="button">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        ) : (
          <Button variant="outline" className="gap-2" type="button">
            <HelpCircle className="h-4 w-4" />
            Soil Identification Guide
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span>🌱</span>
            Soil Identification Guide
          </DialogTitle>
          <DialogDescription>
            Learn to identify your soil type by look, feel, and behaviour. Use the tabs to explore tests,
            quick references, and improvement tips.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Types</TabsTrigger>
            <TabsTrigger value="hand-test">Hand Test</TabsTrigger>
            <TabsTrigger value="quick-ref">Quick Ref</TabsTrigger>
            <TabsTrigger value="improvement">Improve</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {soilTypes.map((soil) => (
                  <SoilTypeCard key={soil.id} soil={soil} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="hand-test" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hand className="h-5 w-5" />
                    The Simple Hand Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <HandTestSteps />
                  <TextureReference />
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="quick-ref" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <QuickReference />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="improvement" className="mt-4">
            <ScrollArea className="h-[500px] pr-4 space-y-4">
              <DrainageBreakdown groups={soilByDrainage} />
              <ChallengeBreakdown entries={soilByChallenge} />
              <PlantMatchups suggestions={plantSuggestionMap} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tips" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {tipSections.map((section) => (
                  <Card key={section.title}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Leaf className="h-5 w-5" />
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-2 text-sm">
                        {section.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>Got it, thanks!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SoilTypeCard({ soil }: { soil: SoilType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {soil.emoji}
          </span>
          <span>{soil.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionBlock title="What it is" icon={<Eye className="h-4 w-4" />}>
          <p className="text-sm">{soil.whatItIs}</p>
        </SectionBlock>
        <SectionBlock title="How to recognise it" icon={<Hand className="h-4 w-4" />}>
          <ul className="space-y-1">
            {soil.recognition.map((item) => (
              <li key={item} className="text-sm flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
        <SectionBlock title="Gardening behaviour" icon={<Droplets className="h-4 w-4" />}>
          <p className="text-sm">{soil.behaviour}</p>
        </SectionBlock>
        <SectionBlock title="Improvement tips" icon={<ThermometerSun className="h-4 w-4" />}>
          <ul className="space-y-1">
            {soil.improvementTips.map((tip) => (
              <li key={tip} className="text-sm flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
      </CardContent>
    </Card>
  );
}

function SectionBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function HandTestSteps() {
  const steps = [
    {
      step: '1',
      title: 'Collect a sample',
      description: 'Take a small handful of soil from about 4-6 inches below the surface.',
    },
    {
      step: '2',
      title: 'Moisten the soil',
      description: "Add water until it's slightly wet but not dripping.",
    },
    {
      step: '3',
      title: 'Roll and feel',
      description: 'Try to roll it into a ball or sausage shape in your palm.',
    },
    {
      step: '4',
      title: 'Observe the results',
      description: 'Compare what happens with the textures listed below.',
    },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.step} className="flex items-start gap-3">
          <Badge className="mt-1" variant="secondary">
            {step.step}
          </Badge>
          <div>
            <p className="font-medium text-sm">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TextureReference() {
  const textures = [
    {
      emoji: '🌑',
      label: 'Clay',
      description: 'Forms a smooth, sticky ball. Feels cold and slippery.',
    },
    {
      emoji: '🟡',
      label: 'Sandy',
      description: "Will not hold shape. Feels gritty and falls apart immediately.",
    },
    {
      emoji: '🟤',
      label: 'Loam',
      description: 'Holds shape briefly but crumbles easily. A gentle blend of smooth and gritty.',
    },
    {
      emoji: '🤎',
      label: 'Silty',
      description: 'Soft, silky, or soapy texture. Slightly slippery but not sticky.',
    },
    {
      emoji: '⚫',
      label: 'Peaty',
      description: 'Spongy and springy with visible fibrous matter.',
    },
    {
      emoji: '⚪',
      label: 'Chalky',
      description: 'Stony with white lumps. Light coloured and often dusty.',
    },
  ];

  return (
    <div className="border-t pt-4 space-y-2">
      <p className="font-medium text-sm">What you will feel</p>
      <div className="grid gap-2">
        {textures.map((texture) => (
          <div key={texture.label} className="flex gap-2 p-2 bg-muted/50 rounded">
            <span className="text-lg" aria-hidden>
              {texture.emoji}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{texture.label}</p>
              <p className="text-xs text-muted-foreground">{texture.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickReference() {
  return (
    <div className="space-y-4">
      {quickReferenceRows.map((row) => (
        <Card key={row.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {row.icon}
              {row.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {row.items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  {item.emoji}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.soil}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DrainageBreakdown({
  groups,
}: {
  groups: Record<SoilDrainage, SoilType[]>;
}) {
  const drainageOrder: SoilDrainage[] = ['holds water', 'balanced', 'quick drain', 'variable'];

  const labels: Record<SoilDrainage, string> = {
    'holds water': 'Slow draining / water-holding soils',
    'quick drain': 'Fast-draining soils',
    balanced: 'Balanced moisture soils',
    variable: 'Mixed drainage or unknown',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Drainage behaviour overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {drainageOrder.map((key) => (
          <div key={key} className="space-y-2">
            <h4 className="text-sm font-medium">{labels[key]}</h4>
            <div className="flex flex-wrap gap-2">
              {groups[key].map((soil) => (
                <Badge key={soil.id} variant="outline" className="text-xs">
                  {soil.emoji} {soil.name}
                </Badge>
              ))}
              {groups[key].length === 0 && (
                <span className="text-xs text-muted-foreground">No soil types in this category</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChallengeBreakdown({
  entries,
}: {
  entries: Array<{ challenge: SoilChallenge; soils: SoilType[] }>;
}) {
  const challengeLabels: Record<SoilChallenge, string> = {
    compaction: 'Prone to compaction',
    'nutrient loss': 'Loses nutrients quickly',
    alkaline: 'Naturally alkaline pH',
    acidic: 'Naturally acidic pH',
    'cold spring': 'Slow to warm in spring',
    waterlogged: 'At risk of waterlogging',
    unknown: 'Observation still needed',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertBannerIcon />
          Common challenges
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {entries.map(({ challenge, soils }) => (
          <div key={challenge} className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <p className="text-sm font-medium">{challengeLabels[challenge]}</p>
            <div className="flex flex-wrap gap-2">
              {soils.map((soil) => (
                <Badge key={soil.id} variant="secondary" className="text-xs">
                  {soil.emoji} {soil.name}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PlantMatchups({ suggestions }: { suggestions: Record<string, string[]> }) {
  const entries = soilTypes.map((soil) => ({
    id: soil.id,
    name: soil.name,
    emoji: soil.emoji,
    plants: suggestions[soil.id] ?? [],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          Plant matchups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg" aria-hidden>
                {entry.emoji}
              </span>
              <p className="text-sm font-medium">{entry.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.plants.length > 0 ? (
                entry.plants.map((plant) => (
                  <Badge key={plant} variant="outline" className="text-xs">
                    {plant}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Add observations to build suggestions.</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AlertBannerIcon() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
      !
    </span>
  );
}
