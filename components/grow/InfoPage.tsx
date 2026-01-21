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
  Camera,
  Radio,
} from 'lucide-react';
import { SoilIdentificationGuide } from './SoilIdentificationGuide';
import { ClimateZoneInfo } from './ClimateZoneInfo';
import { SubscriptionCard } from './SubscriptionCard';
import { PricingOverview } from './PricingOverview';
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

      {/* Subscription Status */}
      <SubscriptionCard compact />

      {/* Pricing Overview */}
      <PricingOverview compact />

      {/* Hardware Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-600" />
            Hardware Integrations
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect your weather station or irrigation controller for more accurate data
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {/* Weather Stations */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <CloudSun className="h-4 w-4 text-blue-500" />
                Weather Stations
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Netatmo', desc: 'Easy OAuth setup' },
                  { name: 'Ecowitt', desc: 'Soil sensors' },
                  { name: 'Ambient Weather', desc: 'Feature-rich' },
                  { name: 'Tempest', desc: 'Premium wireless' },
                  { name: 'Davis WeatherLink', desc: 'Pro-grade' },
                ].map((station) => (
                  <div key={station.name} className="p-2 border rounded-lg text-center">
                    <p className="font-medium text-sm">{station.name}</p>
                    <p className="text-xs text-muted-foreground">{station.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Irrigation Controllers */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-500" />
                Irrigation Controllers
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Rachio', desc: 'Smart watering' },
                  { name: 'Hunter Hydrawise', desc: 'Pro irrigation' },
                ].map((controller) => (
                  <div key={controller.name} className="p-2 border rounded-lg text-center">
                    <p className="font-medium text-sm">{controller.name}</p>
                    <p className="text-xs text-muted-foreground">{controller.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Premium Feature:</strong> Hardware integrations require a paid subscription (Sprout or higher).
              Connect your own devices to get hyperlocal weather data instead of regional forecasts.
            </p>
          </div>
        </CardContent>
      </Card>

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

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Runner Beans</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Climbing • Heavy cropper
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors late April, 5cm deep. Plant out May after last frost, 15cm apart at base of 2m+ supports. Water consistently for pods to set. Harvest regularly to encourage more beans.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Courgettes</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Spreading • Prolific
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors April-May, 2.5cm deep on edge. Plant out after frost, 90cm apart. Need rich soil with plenty of compost. Harvest at 10-15cm for best flavour.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Potatoes</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Earth up regularly • Store well
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant seed potatoes March-April, 10-15cm deep, 30cm apart. Earth up as shoots emerge. First earlies ready in 10-12 weeks, maincrops 20 weeks. Avoid waterlogged soil.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Beetroot</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun to part shade • Quick growing • Multi-sow
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow March-July, 2.5cm deep, 10cm apart. Each &apos;seed&apos; produces 2-3 plants - thin to strongest. Ready in 7-13 weeks. Baby beets at 5cm, full size at 7cm. Leaves also edible.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Peas</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Climbing support • Cool season
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Direct sow March-June, 5cm deep, 5-8cm apart in double rows. Provide twiggy sticks or netting for climbing. Pick regularly when pods are plump. Best eaten fresh.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Cucumbers</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Warm • High water needs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors April, 2cm deep on edge. Plant out June after frost risk, 45cm apart. Water copiously in hot weather. Pick regularly for continuous production. Ridge types hardier outdoors.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Peppers &amp; Chillies</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Warm • Long season
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors February-March under heat (18-21°C), 0.5cm deep. Plant out June in sheltered spot or grow in greenhouse/containers. Stake larger varieties. Feed weekly once flowering.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Onions</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Long season • Store well
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant sets (mini bulbs) March-April, just showing above soil, 10cm apart. Keep weed-free. Harvest when foliage yellows and flops. Dry in sun before storing.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Spinach</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part shade OK • Cool season • Quick harvest
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow February-May and August-September, 2.5cm deep, thin to 15cm apart. Bolts in heat, so part shade helps in summer. Ready in 6-8 weeks. Pick outer leaves for cut-and-come-again harvest.
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

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Thyme</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Drought tolerant • Perennial
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors spring, 0.5cm deep (seeds tiny). Or buy plants. Plant 23cm apart in well-drained, even poor soil. Trim after flowering. Hardy to -15°C. Replace every 3-4 years when woody.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Mint</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part shade OK • Spreads vigorously • Perennial
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Grow in containers to control spread - roots are invasive. Plant in moisture-retentive soil. Cut back in autumn. Very hardy. Many varieties: spearmint, peppermint, apple mint.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Parsley</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part shade OK • Biennial • Slow to germinate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow March-June, 1cm deep. Seeds slow to germinate (3-6 weeks) - soak overnight in warm water first. Thin to 23cm apart. Pick outer leaves regularly. Curly and flat-leaf types.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Coriander</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part shade • Bolts easily • Succession sow
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Direct sow every 2-3 weeks March-September, 1cm deep, 5cm apart. Bolts quickly in heat or if transplanted (has tap root). Part shade and regular watering delay bolting. Use leaves and seeds.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Chives</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun to part shade • Perennial • Divide regularly
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors February-March, 1cm deep. Or divide existing clumps in spring/autumn. Plant 15cm apart. Cut back after flowering for fresh growth. Edible purple flowers attract pollinators.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Sage</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Drought tolerant • Perennial
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors spring, 0.5cm deep. Or take cuttings in summer. Plant 60cm apart in well-drained soil. Prune after flowering to prevent woodiness. Hardy to -10°C. Purple and variegated forms available.
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

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Sunflowers</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Easy • Fun for children
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors March-April, 2.5cm deep, or direct sow May. Plant 45-60cm apart for large heads. Stake tall varieties. Range from 30cm dwarfs to 3m giants. Leave seed heads for birds.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Lavender</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Drought tolerant • Perennial
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant in spring or autumn in well-drained, even poor soil. Space 30-45cm apart. Trim after flowering, never into old wood. Attracts bees and butterflies. English lavender hardiest (-15°C).
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Sweet Peas</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Climbing • Fragrant
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow autumn (mild areas) or early spring, 2.5cm deep. Chip hard seed coat first. Provide wigwam or trellis support. Pinch tips for bushier plants. Cut flowers regularly - more you pick, more they bloom.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Dahlias</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Tubers • Tender
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant tubers April-May, 10cm deep, stake at planting. Not frost hardy - lift tubers after first frost and store frost-free. Huge range of colours and forms. Pinch tips for bushier plants.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Nasturtiums</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun to part shade • Edible • Easy
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Direct sow April-May, 2.5cm deep, 30cm apart. Poor soil = more flowers, rich soil = more leaves. Trailing or climbing types available. Edible peppery flowers and leaves. Self-seeds freely.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Zinnias</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Tender annual • Cut flower
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors April, 0.5cm deep. Don&apos;t transplant until frost risk passed - hate cold. Space 20-30cm apart. Deadhead for continuous blooms. Excellent cut flowers in many colours.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Cosmos</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Tall • Long flowering
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow indoors March-April or direct May, 0.5cm deep. Plant 30-45cm apart. Pinch tips for bushier plants. Deadhead spent blooms. Self-seeds in mild areas. Attracts pollinators.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Pansies &amp; Violas</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part shade OK • Cool season • Edible
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sow late summer for winter/spring flowering, or early spring for summer. Plant 15-23cm apart. Tolerate frost (down to -10°C). Deadhead for continuous bloom. Edible flowers for salads.
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

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Raspberries</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun to part shade • Easy • Self-fertile
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant canes November-March, 45cm apart. Need post and wire support. Summer-fruiting: prune old canes after harvest. Autumn-fruiting: cut all canes to ground in late winter. Prefer slightly acidic soil.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Blueberries</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Acid soil essential • Container-friendly
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant in ericaceous (acid) compost - won&apos;t grow in alkaline soil. Use rainwater, not tap water. Plant two varieties for best pollination. Net against birds. Hardy to -20°C.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Plum Trees</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Full sun • Sheltered spot • Spring blossom
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant bare-root November-March. Many are self-fertile (e.g., &apos;Victoria&apos;, &apos;Opal&apos;). Need minimal pruning - in summer only to avoid silver leaf disease. Fan-train against warm wall in cooler areas.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Blackcurrants</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part shade OK • Hardy • High vitamin C
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plant November-March, 5cm deeper than nursery level. Space 1.5m apart. Fruit on one-year-old wood. Prune: remove 1/3 oldest stems at ground level each winter. Very hardy. Heavy feeders - mulch well.
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
                    <h4 className="font-medium mb-1">Slugs &amp; Snails</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Holes in leaves, slime trails
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Beer traps, copper barriers, handpick at night, diatomaceous earth
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Caterpillars</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Large irregular holes in leaves, visible droppings, stripped plants
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Handpick and relocate, use netting, encourage birds, apply Bacillus thuringiensis (Bt) spray
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Whitefly</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Tiny white flies on leaf undersides, sticky honeydew, sooty mould
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Yellow sticky traps, introduce parasitic wasps (Encarsia), spray with insecticidal soap
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Vine Weevil</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Notched leaf edges (adults), wilting plants with eaten roots (larvae)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Nematode drench in spring/autumn, remove adults at night, use barrier glue on pots
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Red Spider Mite</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Fine webbing, mottled/bronzed leaves, tiny red-brown mites (use magnifier)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Increase humidity (mist regularly), introduce predatory mites (Phytoseiulus), remove badly affected leaves
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Carrot Root Fly</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Rusty tunnels in carrots/parsnips, wilting foliage, secondary rot
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Organic Solution:</strong> Cover with fleece or fine mesh (60cm high barrier), sow thinly to avoid thinning scent, companion plant with onions
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

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Tomato Blight</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Brown patches on leaves/stems, fruit turns brown and rots, spreads rapidly in wet weather
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Prevention:</strong> Grow under cover, space plants well, water at base only, remove affected material immediately. Choose blight-resistant varieties.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Rust</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Orange/brown powdery pustules on leaf undersides, yellowing leaves
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Prevention:</strong> Improve air circulation, avoid wetting foliage, remove affected leaves. Common on beans, leeks, and roses.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Damping Off</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Seedlings collapse at soil level, stems pinched and brown, fuzzy mould on soil
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Prevention:</strong> Use fresh sterile compost, don&apos;t overwater, ensure good ventilation, sow thinly, water with tap not butt water
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Clubroot</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Swollen distorted roots, stunted growth, wilting in sun (brassicas)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Prevention:</strong> Lime acidic soil, improve drainage, rotate crops (spores persist 20 years). Start plants in pots with fresh compost.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Grey Mould (Botrytis)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Fuzzy grey mould on flowers, fruit, stems; brown patches, plant collapse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Prevention:</strong> Remove dead/damaged material promptly, improve air flow, avoid overhead watering, don&apos;t crowd plants
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

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Potassium Deficiency</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Brown leaf edges (scorch), poor flowering/fruiting, weak stems
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Solution:</strong> Apply potash or tomato feed, add wood ash, use comfrey tea. Essential for fruit and flower production.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Phosphorus Deficiency</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Purple/red tints on leaves, poor root development, delayed maturity
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Solution:</strong> Add bone meal or rock phosphite, ensure soil isn&apos;t too cold (reduces uptake). Important for root crops.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Magnesium Deficiency</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Yellowing between veins on older leaves first, leaves may curl
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Solution:</strong> Epsom salt foliar spray (20g per litre), add dolomite lime. Common in tomatoes and potatoes.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Calcium Deficiency</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Distorted new growth, tip burn on lettuce, blossom end rot in tomatoes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Solution:</strong> Add garden lime (not on acid-lovers), ensure consistent watering. Often caused by irregular water supply, not soil deficiency.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-1">Manganese Deficiency</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Symptoms:</strong> Yellowing between veins (similar to iron), brown spots, poor growth
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Solution:</strong> Apply manganese sulphate, lower soil pH if too alkaline. Common in peas, beans, and raspberries on chalky soils.
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
