import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import {
  Info,
  Book,
  HelpCircle,
  Leaf,
  Sprout,
  Sun,
  Moon,
  Droplets,
  Bug,
  Calendar,
  Sparkles,
  Mountain,
  CloudSun,
  TestTube,
  TreeDeciduous,
  Flower2,
  MapPin,
  Thermometer,
  Database,
  Camera
} from 'lucide-react';
import { SoilIdentificationGuide } from './SoilIdentificationGuide';
import { ClimateZoneInfo } from './ClimateZoneInfo';
import { type ClimateZoneCode } from '../../lib/grow/climate';

export function InfoPage() {
  const [climateZone, setClimateZone] = React.useState<ClimateZoneCode | null>(null);

  // Load climate zone from localStorage
  React.useEffect(() => {
    const loadClimateZone = () => {
      const interestsStr = localStorage.getItem('userInterests');
      if (interestsStr) {
        try {
          const interests = JSON.parse(interestsStr);
          if (interests.climate_zone) {
            setClimateZone(interests.climate_zone);
          }
        } catch (_error) {
          console.warn('Failed to parse user interests');
        }
      }
    };

    loadClimateZone();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <Info className="h-8 w-8 text-green-600" />
          Garden Information
        </h1>
        <p className="text-muted-foreground mt-1">
          Learn how Grow Daisy helps you garden smarter
        </p>
      </div>

      {/* How Grow Daisy Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            How Grow Daisy Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="data-driven">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span>Data-Driven Gardening</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Grow Daisy combines multiple data sources to give you personalized gardening recommendations:
                  </p>

                  <div className="grid gap-3">
                    <div className="p-3 border rounded-lg bg-blue-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-sm">Your Location</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        We use your garden&apos;s coordinates to determine your climate zone, fetch local weather data, and calculate sunrise/sunset times for optimal task scheduling.
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="h-4 w-4 text-green-600" />
                        <h4 className="font-medium text-sm">Real-Time Weather</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        We fetch current conditions and forecasts to recommend the best times for planting, watering, pruning, and harvesting. No more guessing about when to garden!
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg bg-purple-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-sm">Your Garden Profile</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your soil type, sun exposure, moisture levels, and interests all factor into personalized recommendations. The more you tell us, the better our advice.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>The result:</strong> Instead of generic advice, you get recommendations tailored to your specific garden conditions on any given day.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai-identification">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-600" />
                  <span>AI Plant & Threat Identification</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Use your camera to identify plants, pests, and diseases in your garden:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <Sprout className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm mb-1">Plant Identification</h4>
                        <p className="text-xs text-muted-foreground">
                          Snap a photo of any plant and our AI will identify the species, suggest care tips, and help you add it to your garden collection.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <Bug className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm mb-1">Pest & Disease Detection</h4>
                        <p className="text-xs text-muted-foreground">
                          Photograph damaged leaves or suspicious insects to get AI-powered diagnosis and organic treatment recommendations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> AI identification is a helpful tool, but not infallible. For critical decisions, consider consulting local experts or extension services.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Understanding Your Garden Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Understanding Your Garden Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="climate-zones">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-blue-600" />
                  <span>Climate Zones Explained</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Climate zones help determine which plants thrive in your area, when to plant, and what challenges to expect.
                  </p>

                  {climateZone && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-green-700 mb-2">Your Current Zone:</p>
                      <ClimateZoneInfo climateZone={climateZone} variant="compact" />
                    </div>
                  )}

                  <h4 className="font-medium text-sm">European Climate Zones</h4>
                  <div className="grid gap-2">
                    <div className="p-2 border rounded-lg flex items-center gap-2">
                      <span className="text-lg">🌊</span>
                      <div>
                        <span className="font-medium text-sm">Atlantic Mild Maritime</span>
                        <p className="text-xs text-muted-foreground">Ireland, W France, Asturias - mild, wet winters</p>
                      </div>
                    </div>
                    <div className="p-2 border rounded-lg flex items-center gap-2">
                      <span className="text-lg">☁️</span>
                      <div>
                        <span className="font-medium text-sm">Cool Maritime</span>
                        <p className="text-xs text-muted-foreground">Scotland, Denmark, North Sea - cool, maritime</p>
                      </div>
                    </div>
                    <div className="p-2 border rounded-lg flex items-center gap-2">
                      <span className="text-lg">🌲</span>
                      <div>
                        <span className="font-medium text-sm">Continental Cool</span>
                        <p className="text-xs text-muted-foreground">Central Europe - cold winters, warm summers</p>
                      </div>
                    </div>
                    <div className="p-2 border rounded-lg flex items-center gap-2">
                      <span className="text-lg">☀️</span>
                      <div>
                        <span className="font-medium text-sm">Mediterranean Marine</span>
                        <p className="text-xs text-muted-foreground">Coastal Med - mild winters, hot dry summers</p>
                      </div>
                    </div>
                    <div className="p-2 border rounded-lg flex items-center gap-2">
                      <span className="text-lg">🏜️</span>
                      <div>
                        <span className="font-medium text-sm">Southern Hot Dry</span>
                        <p className="text-xs text-muted-foreground">Inland Spain/Italy - very hot, dry summers</p>
                      </div>
                    </div>
                    <div className="p-2 border rounded-lg flex items-center gap-2">
                      <span className="text-lg">⛰️</span>
                      <div>
                        <span className="font-medium text-sm">Mountain Cool</span>
                        <p className="text-xs text-muted-foreground">Alpine regions - short growing season, cool temps</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-2">How We Calculate Your Zone</h4>
                    <p className="text-xs text-muted-foreground">
                      We use your latitude and longitude to determine your base climate zone. If your elevation is above 800m, we automatically classify you as &quot;Mountain Cool&quot; since altitude significantly affects growing conditions.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="elevation">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-purple-600" />
                  <span>Elevation & Its Effects</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Elevation significantly impacts your garden&apos;s growing conditions:
                  </p>

                  <div className="grid gap-3">
                    <div className="p-3 border rounded-lg bg-blue-50/50">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <Thermometer className="h-4 w-4 text-blue-600" />
                        Temperature Drop
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Temperature decreases by approximately <strong>6.5°C per 1,000m</strong> of elevation gain. A garden at 500m will be about 3°C cooler than one at sea level.
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg bg-green-50/50">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        Growing Season
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Higher elevations have shorter growing seasons due to later last frosts and earlier first frosts. Plan your planting accordingly.
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg bg-orange-50/50">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <Sun className="h-4 w-4 text-orange-600" />
                        Sun Intensity
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        UV radiation increases with altitude, which can stress some plants but benefits others. Mediterranean herbs often thrive at moderate elevations.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Automatic Mountain Zone</h4>
                    <p className="text-xs text-muted-foreground">
                      Gardens above <strong>800m elevation</strong> are automatically classified as &quot;Mountain Cool&quot; climate zone, regardless of latitude. This ensures you get advice suited for alpine growing conditions.
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    You can view and update your elevation in Settings. We look it up automatically using Google Maps when you set your location.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="shade">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <CloudSun className="h-4 w-4 text-yellow-600" />
                  <span>Understanding Shade</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Sun exposure is crucial for plant selection and placement:
                  </p>

                  <div className="grid gap-2">
                    <div className="p-3 border rounded-lg border-l-4 border-l-yellow-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Sun className="h-4 w-4 text-yellow-600" />
                        <h4 className="font-medium text-sm">Full Sun</h4>
                        <Badge variant="secondary" className="text-xs">6+ hours</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Direct sunlight for 6 or more hours daily. Best for tomatoes, peppers, squash, most herbs, and sun-loving flowers.
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg border-l-4 border-l-orange-400">
                      <div className="flex items-center gap-2 mb-1">
                        <CloudSun className="h-4 w-4 text-orange-500" />
                        <h4 className="font-medium text-sm">Part Sun</h4>
                        <Badge variant="secondary" className="text-xs">4-6 hours</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        4-6 hours of direct sun, ideally morning sun with afternoon shade. Good for beans, peas, and many perennials.
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg border-l-4 border-l-blue-400">
                      <div className="flex items-center gap-2 mb-1">
                        <CloudSun className="h-4 w-4 text-blue-500" />
                        <h4 className="font-medium text-sm">Part Shade</h4>
                        <Badge variant="secondary" className="text-xs">2-4 hours</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        2-4 hours of direct sun or dappled light throughout the day. Ideal for lettuce, spinach, and shade-tolerant herbs.
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg border-l-4 border-l-gray-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Moon className="h-4 w-4 text-gray-600" />
                        <h4 className="font-medium text-sm">Full Shade</h4>
                        <Badge variant="secondary" className="text-xs">&lt;2 hours</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Less than 2 hours of direct sun. Limited to ferns, hostas, and a few shade-loving edibles like some mushrooms.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-2">How to Assess Your Garden</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Observe your garden throughout a sunny day</li>
                      <li>• Note which areas receive morning vs afternoon sun</li>
                      <li>• Consider seasonal changes - trees in leaf create more shade</li>
                      <li>• Remember that afternoon sun is more intense than morning sun</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="soil">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-amber-600" />
                  <span>Soil Type & Testing</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Understanding your soil is fundamental to successful gardening:
                  </p>

                  <div className="p-3 border rounded-lg bg-amber-50/50">
                    <h4 className="font-medium text-sm mb-3">Why Soil Type Matters</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white rounded border">
                        <Droplets className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                        <p className="text-xs font-medium">Drainage</p>
                        <p className="text-xs text-muted-foreground">How fast water moves</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <Leaf className="h-4 w-4 mx-auto text-green-500 mb-1" />
                        <p className="text-xs font-medium">Nutrients</p>
                        <p className="text-xs text-muted-foreground">What&apos;s available</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <Sprout className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                        <p className="text-xs font-medium">Root Growth</p>
                        <p className="text-xs text-muted-foreground">How easily roots spread</p>
                      </div>
                    </div>
                  </div>

                  {/* Soil Types Summary */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Soil Types</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 border rounded"><strong>Clay:</strong> Heavy, holds water, nutrient-rich</div>
                      <div className="p-2 border rounded"><strong>Sandy:</strong> Light, drains fast, needs fertilizing</div>
                      <div className="p-2 border rounded"><strong>Loam:</strong> Ideal balance, most plants thrive</div>
                      <div className="p-2 border rounded"><strong>Silty:</strong> Fertile, retains moisture well</div>
                      <div className="p-2 border rounded"><strong>Peaty:</strong> Acidic, moisture-retentive</div>
                      <div className="p-2 border rounded"><strong>Chalky:</strong> Alkaline, free-draining</div>
                    </div>
                  </div>

                  {/* Soil Identification Guide */}
                  <div className="p-4 border rounded-lg bg-green-50/50">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">Not sure what soil you have?</h4>
                        <p className="text-xs text-muted-foreground">
                          Use our interactive guide to identify your soil type with a simple hand test.
                        </p>
                      </div>
                      <SoilIdentificationGuide variant="button" />
                    </div>
                  </div>

                  {/* pH Section */}
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <TestTube className="h-4 w-4 text-purple-600" />
                      Soil pH Testing
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      pH measures how acidic or alkaline your soil is, affecting nutrient availability:
                    </p>

                    <div className="flex items-center justify-center gap-1 mb-3 text-xs">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Acidic</span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">5.5</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">6.0</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">6.5-7.0</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">7.5</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Alkaline</span>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p><strong>How to test:</strong> Use a home pH testing kit (£5-15) or digital meter. Test several spots in your garden.</p>
                      <p><strong>To raise pH</strong> (more alkaline): Add garden lime or wood ash</p>
                      <p><strong>To lower pH</strong> (more acidic): Add sulfur, pine needles, or peat</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Managing Your Plants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flower2 className="h-5 w-5 text-green-600" />
            Managing Your Plants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="adding-plants">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-green-600" />
                  <span>Adding Plants to Your Garden</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Track what&apos;s growing in your garden for personalized task recommendations:
                  </p>

                  <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>Add plants from our database or create custom entries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>Record planting dates for accurate harvest timing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>Track location in your garden (bed, container, greenhouse)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>Get reminders for watering, feeding, and harvesting</span>
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cultivars">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Flower2 className="h-4 w-4 text-pink-600" />
                  <span>Choosing Cultivars</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Cultivars</strong> (cultivated varieties) are specific plant varieties bred for particular traits. Choosing the right cultivar for your conditions can make the difference between success and failure.
                  </p>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Why Cultivar Choice Matters</h4>
                    <div className="grid gap-2">
                      <div className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="mt-0.5">Climate</Badge>
                        <span className="text-muted-foreground">Some cultivars are bred for cold hardiness or heat tolerance</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="mt-0.5">Disease</Badge>
                        <span className="text-muted-foreground">Resistant varieties reduce the need for treatments</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="mt-0.5">Timing</Badge>
                        <span className="text-muted-foreground">Early or late varieties extend your harvest season</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="mt-0.5">Flavour</Badge>
                        <span className="text-muted-foreground">Heritage varieties often have superior taste</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Example: Tomato Cultivars</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li><strong>&quot;Gardener&apos;s Delight&quot;</strong> - Reliable, disease-resistant, great for UK climate</li>
                      <li><strong>&quot;San Marzano&quot;</strong> - Classic paste tomato, needs warmth</li>
                      <li><strong>&quot;Sungold&quot;</strong> - Sweet cherry tomato, very productive</li>
                      <li><strong>&quot;Moneymaker&quot;</strong> - Traditional British variety, cool-tolerant</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="guilds">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <TreeDeciduous className="h-4 w-4 text-green-600" />
                  <span>Understanding Guilds (Companion Planting)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Guilds</strong> are groups of plants that benefit each other when grown together - an ancient technique used in permaculture and traditional gardening.
                  </p>

                  <div className="p-3 border rounded-lg bg-green-50/50">
                    <h4 className="font-medium text-sm mb-2">Benefits of Guild Planting</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Bug className="h-3 w-3 text-orange-500" />
                        <span>Natural pest control</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Leaf className="h-3 w-3 text-green-500" />
                        <span>Nutrient sharing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flower2 className="h-3 w-3 text-pink-500" />
                        <span>Pollinator attraction</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sun className="h-3 w-3 text-yellow-500" />
                        <span>Shade provision</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Classic Guild Examples</h4>

                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-sm mb-1">The Three Sisters</h5>
                      <p className="text-xs text-muted-foreground mb-2">Native American tradition</p>
                      <div className="flex gap-2">
                        <Badge variant="secondary">Corn</Badge>
                        <Badge variant="secondary">Beans</Badge>
                        <Badge variant="secondary">Squash</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Corn provides support for beans, beans fix nitrogen, squash shades the soil and deters pests.
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-sm mb-1">Tomato Guild</h5>
                      <p className="text-xs text-muted-foreground mb-2">Mediterranean-inspired</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Tomatoes</Badge>
                        <Badge variant="secondary">Basil</Badge>
                        <Badge variant="secondary">Carrots</Badge>
                        <Badge variant="secondary">Marigolds</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Basil repels aphids and improves flavour, carrots loosen soil, marigolds deter nematodes.
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            Quick Gardening Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-white border border-l-4 border-l-green-500 border-green-200 rounded-lg">
            <Sprout className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Start Seeds Indoors</h4>
              <p className="text-sm text-muted-foreground">
                Start tomatoes, peppers, and other warm-season crops 6-8 weeks before your last frost date for a head start on the season.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white border border-l-4 border-l-blue-500 border-blue-200 rounded-lg">
            <Droplets className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Water Wisely</h4>
              <p className="text-sm text-muted-foreground">
                Water deeply but less frequently to encourage deep root growth. Early morning is the best time to water your garden.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white border border-l-4 border-l-purple-500 border-purple-200 rounded-lg">
            <Moon className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Moon Phase Gardening</h4>
              <p className="text-sm text-muted-foreground">
                Plant above-ground crops during the waxing moon (new to full) and root crops during the waning moon (full to new).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growing Guides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-green-600" />
            Growing Guides by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="vegetables">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-green-600" />
                  <span>Vegetables</span>
                  <Badge variant="secondary">12 guides</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Tomatoes</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Regular watering • Support required
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Start indoors 6-8 weeks before last frost. Transplant when soil is warm (15°C+). Stake or cage plants. Water consistently to prevent blossom end rot.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Lettuce & Salad Greens</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part shade OK • Cool season • Quick growing
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow directly 4 weeks before last frost. Succession plant every 2 weeks. Harvest outer leaves for continuous production.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Carrots</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Well-drained soil • Root crop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Direct sow 3 weeks before last frost. Thin seedlings to 2-3&quot; apart. Keep soil moist for germination. Harvest when tops are 1/2&quot; diameter.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="herbs">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <span>Herbs</span>
                  <Badge variant="secondary">8 guides</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Basil</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Warm season • Pinch regularly
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant after last frost when soil is warm. Pinch flowers to encourage bushy growth. Harvest regularly for best flavor.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Rosemary</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Drought tolerant • Perennial
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prefers well-drained soil. Water sparingly once established. Prune after flowering to maintain shape.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="flowers">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-600" />
                  <span>Flowers</span>
                  <Badge variant="secondary">10 guides</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Roses</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Regular feeding • Prune annually
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant in spring or fall. Fertilize monthly during growing season. Deadhead spent blooms. Prune in late winter/early spring.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Marigolds</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Pest deterrent • Easy care
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Direct sow after frost. Deadhead for continuous blooms. Plant near vegetables to deter pests.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fruit">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🍎</span>
                  <span>Fruit Trees & Berries</span>
                  <Badge variant="secondary">6 guides</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Apple Trees</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Cross-pollination needed • Annual pruning
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant bare-root trees in early spring. Need 2+ varieties for pollination. Prune in late winter for shape and fruit production.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Strawberries</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Runners spread • Renew beds
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant in early spring. Remove first year flowers for stronger plants. Renovate beds after harvest by mowing and fertilizing.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Seasonal Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Seasonal Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sprout className="h-4 w-4 text-green-600" />
                Spring (March - May)
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Start seeds indoors</li>
                <li>• Prepare garden beds</li>
                <li>• Plant cool-season crops</li>
                <li>• Prune fruit trees</li>
                <li>• Divide perennials</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sun className="h-4 w-4 text-yellow-600" />
                Summer (June - August)
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Transplant warm-season crops</li>
                <li>• Water regularly</li>
                <li>• Harvest vegetables</li>
                <li>• Deadhead flowers</li>
                <li>• Watch for pests</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-orange-600" />
                Fall (September - November)
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Plant garlic and bulbs</li>
                <li>• Harvest fall crops</li>
                <li>• Clean up garden beds</li>
                <li>• Mulch perennials</li>
                <li>• Start composting leaves</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Moon className="h-4 w-4 text-blue-600" />
                Winter (December - February)
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Plan next season</li>
                <li>• Order seed catalogs</li>
                <li>• Prune dormant trees</li>
                <li>• Protect tender plants</li>
                <li>• Maintain tools</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Problems */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-orange-600" />
            Common Problems & Solutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pests">
              <AccordionTrigger>Common Garden Pests</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Aphids</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Sticky residue on leaves, distorted new growth
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Spray with water, introduce ladybugs, use neem oil or insecticidal soap
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Slugs & Snails</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Holes in leaves, slime trails
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Beer traps, copper barriers, handpick at night, diatomaceous earth
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="diseases">
              <AccordionTrigger>Common Diseases</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Powdery Mildew</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> White powdery coating on leaves
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Prevention:</strong> Good air circulation, avoid overhead watering. <strong>Treatment:</strong> Baking soda spray, neem oil
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Blossom End Rot</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Dark sunken spots on bottom of tomatoes/peppers
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Prevention:</strong> Consistent watering, calcium supplementation, mulch to retain moisture
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="deficiencies">
              <AccordionTrigger>Nutrient Deficiencies</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Nitrogen Deficiency</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Yellowing of older leaves, stunted growth
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Solution:</strong> Add compost, blood meal, or fish emulsion. Plant nitrogen-fixing cover crops.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Iron Deficiency</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Yellowing between leaf veins, affects new growth first
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Solution:</strong> Lower soil pH, add iron chelate, improve drainage
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-green-600" />
            About Grow Daisy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Grow Daisy is your intelligent gardening companion, combining real-time weather data with your garden profile to provide personalized recommendations.
          </p>
          <p className="text-xs text-muted-foreground">
            Configure your garden profile, soil type, sun exposure, and interests in <Link href="/grow/settings" className="text-green-600 hover:underline font-medium">Settings</Link> to get the most relevant advice.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Version 1.0 • Powered by real-time weather and horticultural data
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
