import React from 'react';
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
  Calendar
} from 'lucide-react';
import { SoilIdentificationGuide } from './SoilIdentificationGuide';
import { WeatherDebug } from './WeatherDebug';
import { ElevationExample } from './ElevationExample';
import { ClimateZoneInfo } from './ClimateZoneInfo';
import { LocationDiagnostic } from './LocationDiagnostic';
import { TaskDebugPage } from './TaskDebugPage';
import { type ClimateZoneCode } from '../../lib/grow/climate';

export function InfoPage() {
  const [showDebug, setShowDebug] = React.useState(false);
  const [showElevation, setShowElevation] = React.useState(false);
  const [showLocationDiag, setShowLocationDiag] = React.useState(false);
  const [showTaskDebug, setShowTaskDebug] = React.useState(false);
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
          Guides, tips, and resources for successful gardening
        </p>
      </div>

      {/* Climate Zone Info (if available) */}
      {climateZone && (
        <ClimateZoneInfo climateZone={climateZone} variant="full" />
      )}

      {/* Developer Tools */}
      <div className="space-y-3">
        {/* Task System Debug Tool */}
        {showTaskDebug ? (
          <TaskDebugPage />
        ) : (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <button 
                onClick={() => setShowTaskDebug(true)}
                className="text-sm text-red-700 hover:text-red-900 underline flex items-center gap-2"
              >
                <span className="text-base">🐛</span>
                <strong>Fix Task Errors - Complete Diagnostic</strong>
              </button>
            </CardContent>
          </Card>
        )}
      
        {/* Location Diagnostic Tool */}
        {showLocationDiag && <LocationDiagnostic />}
        
        {!showLocationDiag && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <button 
                onClick={() => setShowLocationDiag(true)}
                className="text-sm text-orange-700 hover:text-orange-900 underline flex items-center gap-2"
              >
                <span className="text-base">🔍</span>
                Diagnose Location & Climate Zone Issues
              </button>
            </CardContent>
          </Card>
        )}
      
        {/* Weather Debug Tool */}
        {showDebug && <WeatherDebug />}
        
        {!showDebug && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <button 
                onClick={() => setShowDebug(true)}
                className="text-sm text-blue-700 hover:text-blue-900 underline flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Troubleshoot Weather API Issues
              </button>
            </CardContent>
          </Card>
        )}

        {/* Elevation Example Tool */}
        {showElevation && <ElevationExample />}
        
        {!showElevation && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <button 
                onClick={() => setShowElevation(true)}
                className="text-sm text-purple-700 hover:text-purple-900 underline flex items-center gap-2"
              >
                <span className="text-base">🏔️</span>
                Elevation & Climate Zone Demo
              </button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Soil Identification Guide - Featured */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌱</span>
              <div>
                <div className="flex items-center gap-2">
                  <span>Soil Identification Guide</span>
                  <Badge className="bg-green-600 hover:bg-green-700">New</Badge>
                </div>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Not sure what type of soil you have? Learn to identify it!
                </p>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1">
              <p className="text-sm mb-3">
                Understanding your soil is the foundation of successful gardening. Use our interactive guide to:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Learn the simple hand test
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Identify clay, sandy, loam, silty, peaty, and chalky soils
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Understand how each soil behaves in your garden
                </li>
              </ul>
            </div>
            <SoilIdentificationGuide variant="button" />
          </div>
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
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Sprout className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Start Seeds Indoors</h4>
              <p className="text-sm text-muted-foreground">
                Start tomatoes, peppers, and other warm-season crops 6-8 weeks before your last frost date for a head start on the season.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Droplets className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Water Wisely</h4>
              <p className="text-sm text-muted-foreground">
                Water deeply but less frequently to encourage deep root growth. Early morning is the best time to water your garden.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
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
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Grow Daisy is your intelligent gardening companion, combining real-time weather data with your personal garden profile to provide personalized recommendations for the best times to plant, water, prune, and harvest.
          </p>
          <div className="space-y-2">
            <h4 className="font-medium">Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Weather-driven task recommendations</li>
              <li>• Seasonal planning timeline</li>
              <li>• Plant identification and pest diagnosis</li>
              <li>• Photo journal for tracking progress</li>
              <li>• Growing guides and expert tips</li>
              <li>• Moon phase gardening insights</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Version 1.0 • Gardening data powered by expert horticultural sources
          </p>
        </CardContent>
      </Card>
    </div>
  );
}