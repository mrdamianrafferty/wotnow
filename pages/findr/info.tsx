import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Fish, 
  Waves, 
  Thermometer, 
  Droplets, 
  Activity, 
  Clock, 
  TrendingUp, 
  Database, 
  Globe, 
  ChevronDown, 
  ChevronRight,
  Wind,
  Anchor
} from 'lucide-react';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';

const FindrInfoPage = () => {
  type SectionKey = 'ices' | 'marine' | 'weather' | 'expert';

  interface SectionHeaderProps {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle: string;
    isExpanded: boolean;
    onClick: () => void;
  }

  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);

  const toggleSection = (section: SectionKey) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const SectionHeader = ({ icon: Icon, title, subtitle, isExpanded, onClick }: SectionHeaderProps) => (
    <div 
      className="flex items-center justify-between p-4 bg-primary text-primary-content rounded-lg cursor-pointer hover:bg-primary-focus transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon size={24} className="shrink-0" />
        <div>
          <h3 className="text-lg font-semibold"><TranslatedText text={title} /></h3>
          <p className="text-sm opacity-80"><TranslatedText text={subtitle} /></p>
        </div>
      </div>
      {isExpanded ? <ChevronDown size={20} className="shrink-0" /> : <ChevronRight size={20} className="shrink-0" />}
    </div>
  );

  return (
    <>
      <Head>
        <title>findr info | How it works</title>
      </Head>
      <main className="min-h-screen bg-base-200 pb-16">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="sm:mx-auto pt-2 sm:px-4 sm:pt-6 md:px-6 lg:max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <Fish size={48} className="text-primary mr-3" />
              <h1 className="text-4xl font-bold">findr</h1>
            </div>
            <p className="text-xl text-base-content/80 mb-2">
              <TranslatedText text="Smart Fishing Intelligence" />
            </p>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              <TranslatedText text="We combine marine science, weather data, and local fishing wisdom to predict when and where fish want to bite" />
            </p>
          </div>

          {/* How It Works Overview */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title text-2xl">
                <TrendingUp className="text-success" size={24} />
                <TranslatedText text="How findr Predicts Your Perfect Catch" />
              </h2>
              <p className="text-base-content/80">
                <TranslatedText text="findr uses a unique combination of scientific marine data, real-time weather conditions, and expert fishing knowledge to calculate which fish species are most likely to be biting at your chosen location and time. Think of it as a smart dating app - but instead of matching people, we're matching you with the fish that want to bite!" />
              </p>
            </div>
          </div>

          {/* Data Sources Sections */}
          <div className="space-y-4">
            
            {/* ICES Section */}
            <div className="card bg-base-100 shadow-lg">
              <SectionHeader
                icon={Globe}
                title="ICES Marine Grid System"
                subtitle="Official European fish distribution data"
                isExpanded={expandedSection === 'ices'}
                onClick={() => toggleSection('ices')}
              />
              {expandedSection === 'ices' && (
                <div className="card-body border-t border-base-300">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold"><TranslatedText text="What is ICES?" /></h4>
                      <p className="text-base-content/80 text-sm">
                        <TranslatedText text="Think of European waters as being divided into a giant fishing map with numbered squares. The International Council for the Exploration of the Sea (ICES) has been tracking which fish live in each square for decades." />
                      </p>
                      <h4 className="font-semibold"><TranslatedText text="How We Use It" /></h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="badge badge-primary badge-sm mt-1 shrink-0">•</span>
                          <span className="flex-1 text-sm">
                            <TranslatedText text="Your fishing spot gets matched to its square on the map (like 42F8 for the Asturian coast)" />
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="badge badge-primary badge-sm mt-1 shrink-0">•</span>
                          <span className="flex-1 text-sm">
                            <TranslatedText text="We instantly know which fish species naturally live in that area" />
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="badge badge-primary badge-sm mt-1 shrink-0">•</span>
                          <span className="flex-1 text-sm">
                            <TranslatedText text="Fish move with the seasons - we track when they arrive and leave each area" />
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="card bg-primary/10">
                      <div className="card-body">
                        <h5 className="card-title text-base"><TranslatedText text="Example ICES Areas" /></h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-base-content/70 text-xs">VIIIc (Cantabrian Sea)</span>
                            <span className="badge badge-primary badge-xs">Sea Bass, Bream</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-base-content/70 text-xs">VIIIb (Bay of Biscay)</span>
                            <span className="badge badge-primary badge-xs">Mackerel, Tuna</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-base-content/70 text-xs">VIIIa (Northern Biscay)</span>
                            <span className="badge badge-primary badge-xs">Pollack, Cod</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Marine Biology Section */}
            <div className="card bg-base-100 shadow-lg">
              <SectionHeader
                icon={Activity}
                title="Live Marine Biology Data"
                subtitle="Real-time ocean health indicators"
                isExpanded={expandedSection === 'marine'}
                onClick={() => toggleSection('marine')}
              />
              {expandedSection === 'marine' && (
                <div className="card-body border-t border-base-300">
                  <p className="text-base-content/80 mb-6 text-sm">
                    <TranslatedText text="Just like you have preferred weather for a day out, different fish prefer different water conditions. We constantly monitor the 'health' of the water to predict which fish will be active and hungry." />
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="alert alert-success">
                      <div className="w-3 h-3 bg-success rounded-full shrink-0"></div>
                      <div>
                        <h5 className="font-medium"><TranslatedText text="Water 'Greenness' (Chlorophyll)" /></h5>
                        <p className="text-xs opacity-80">
                          <TranslatedText text="Green water = lots of tiny plants = lots of small fish = big fish come to hunt. It's like checking if the dinner table is set!" />
                        </p>
                      </div>
                    </div>
                    <div className="alert alert-info">
                      <div className="w-3 h-3 bg-info rounded-full shrink-0"></div>
                      <div>
                        <h5 className="font-medium"><TranslatedText text="Oxygen in the Water" /></h5>
                        <p className="text-xs opacity-80">
                          <TranslatedText text="Fish need to 'breathe' underwater. Low oxygen = lazy fish that won't chase your bait. High oxygen = active, hungry fish" />
                        </p>
                      </div>
                    </div>
                    <div className="alert">
                      <Thermometer className="shrink-0" size={20} />
                      <div>
                        <h5 className="font-medium"><TranslatedText text="Water Temperature" /></h5>
                        <p className="text-xs opacity-80">
                          <TranslatedText text="Every fish has a 'comfort zone' temperature. Too hot or cold and they either hide deeper or swim away to better areas" />
                        </p>
                      </div>
                    </div>
                    <div className="alert alert-warning">
                      <Droplets className="shrink-0" size={20} />
                      <div>
                        <h5 className="font-medium"><TranslatedText text="Saltiness (Salinity)" /></h5>
                        <p className="text-xs opacity-80">
                          <TranslatedText text="Some fish love super salty water, others prefer it mixed with fresh water from rivers. Wrong saltiness = no fish" />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Weather & Tides Section */}
            <div className="card bg-base-100 shadow-lg">
              <SectionHeader
                icon={Waves}
                title="Weather & Tidal Conditions"
                subtitle="Real-time environmental factors"
                isExpanded={expandedSection === 'weather'}
                onClick={() => toggleSection('weather')}
              />
              {expandedSection === 'weather' && (
                <div className="card-body border-t border-base-300">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Wind size={20} className="text-primary" />
                        <TranslatedText text="Weather Impact" />
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <Thermometer size={16} className="text-error mt-1 shrink-0" />
                          <span className="text-sm"><strong><TranslatedText text="Air Temperature:" /></strong> <TranslatedText text="Warms or cools the surface water, making fish more or less active" /></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Waves size={16} className="text-info mt-1 shrink-0" />
                          <span className="text-sm"><strong><TranslatedText text="Wave Height:" /></strong> <TranslatedText text="Big waves = dangerous conditions and some fishing methods won't work" /></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Wind size={16} className="text-success mt-1 shrink-0" />
                          <span className="text-sm"><strong><TranslatedText text="Wind Speed:" /></strong> <TranslatedText text="Affects your casting distance, boat control, and mixes up the water" /></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Droplets size={16} className="text-primary mt-1 shrink-0" />
                          <span className="text-sm"><strong><TranslatedText text="Air Pressure:" /></strong> <TranslatedText text="Fish can 'feel' pressure changes and it affects when they want to feed" /></span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Anchor size={20} className="text-primary" />
                        <TranslatedText text="Tidal Intelligence" />
                      </h4>
                      <div className="card bg-base-200">
                        <div className="card-body p-4">
                          <p className="text-sm mb-3">
                            <TranslatedText text="Different fish like different tide times - it's like their dinner schedule! We tell you:" />
                          </p>
                          <ul className="space-y-1 text-xs">
                            <li>• <TranslatedText text="When each fish species prefers to feed (high tide, low tide, or moving water)" /></li>
                            <li>• <TranslatedText text="The best times to fish before or after tide changes" /></li>
                            <li>• <TranslatedText text="How strong currents affect where fish hang out" /></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Expert Knowledge Section */}
            <div className="card bg-base-100 shadow-lg">
              <SectionHeader
                icon={Fish}
                title="Expert Fishing Knowledge"
                subtitle="Local wisdom and proven techniques"
                isExpanded={expandedSection === 'expert'}
                onClick={() => toggleSection('expert')}
              />
              {expandedSection === 'expert' && (
                <div className="card-body border-t border-base-300">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="card bg-success/10">
                      <div className="card-body p-4">
                        <h5 className="card-title text-sm flex items-center gap-2">
                          <Fish size={16} />
                          <TranslatedText text="Species Behavior" />
                        </h5>
                        <ul className="text-xs space-y-1">
                          <li>• <TranslatedText text="Feeding patterns and times" /></li>
                          <li>• <TranslatedText text="Habitat preferences" /></li>
                          <li>• <TranslatedText text="Seasonal movements" /></li>
                          <li>• <TranslatedText text="Response to weather" /></li>
                        </ul>
                      </div>
                    </div>
                    <div className="card bg-secondary/10">
                      <div className="card-body p-4">
                        <h5 className="card-title text-sm flex items-center gap-2">
                          <Activity size={16} />
                          <TranslatedText text="Bait & Technique" />
                        </h5>
                        <ul className="text-xs space-y-1">
                          <li>• <TranslatedText text="Best baits for each species" /></li>
                          <li>• <TranslatedText text="Optimal fishing methods" /></li>
                          <li>• <TranslatedText text="Gear recommendations" /></li>
                          <li>• <TranslatedText text="Depth and structure tips" /></li>
                        </ul>
                      </div>
                    </div>
                    <div className="card bg-primary/10">
                      <div className="card-body p-4">
                        <h5 className="card-title text-sm flex items-center gap-2">
                          <Clock size={16} />
                          <TranslatedText text="Timing Secrets" />
                        </h5>
                        <ul className="text-xs space-y-1">
                          <li>• <TranslatedText text="Dawn and dusk patterns" /></li>
                          <li>• <TranslatedText text="Moon phase influences" /></li>
                          <li>• <TranslatedText text="Weather front timing" /></li>
                          <li>• <TranslatedText text="Tide-specific advice" /></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* The Algorithm Section */}
          <div className="card bg-secondary/10 shadow-xl mt-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                <TrendingUp className="text-secondary" size={24} />
                <TranslatedText text="The findr Algorithm" />
              </h2>
              <p className="text-base-content/80 mb-4">
                <TranslatedText text="Our smart system combines all this information to give each fish species a confidence score (0-100%) - basically answering 'how likely am I to catch this fish right now?' Here's the simple formula:" />
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card bg-base-100">
                  <div className="card-body">
                    <h4 className="card-title text-base"><TranslatedText text="Season Score (70% weight)" /></h4>
                    <p className="text-sm text-base-content/70 mb-3">
                      <TranslatedText text="This is the big one! If the fish aren't in your area right now because they've migrated somewhere else, perfect water won't help. Season trumps everything." />
                    </p>
                    <div className="alert alert-success">
                      <div>
                        <div className="text-xs font-semibold"><TranslatedText text="Example: Mackerel in Summer" /></div>
                        <div className="text-xs"><TranslatedText text="They love this time of year = 100%" /></div>
                        <div className="text-xs"><TranslatedText text="Currently it's summer = Perfect timing!" /></div>
                        <div className="badge badge-warning mt-1"><TranslatedText text="Season Score: 100%" /></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100">
                  <div className="card-body">
                    <h4 className="card-title text-base"><TranslatedText text="Water Conditions (30% weight)" /></h4>
                    <p className="text-sm text-base-content/70 mb-3">
                      <TranslatedText text="Even if fish are in the area, bad water conditions can make them inactive. This fine-tunes our prediction." />
                    </p>
                    <div className="alert alert-success">
                      <div>
                        <div className="text-xs font-semibold"><TranslatedText text="Example: Sea Bass Right Now" /></div>
                        <div className="text-xs"><TranslatedText text="Water temp: 16°C (their favorite!) = 100%" /></div>
                        <div className="text-xs"><TranslatedText text="Oxygen levels: Looking good = 95%" /></div>
                        <div className="badge badge-warning mt-1"><TranslatedText text="Water Score: 96%" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hard Limits */}
              <div className="alert alert-error mt-6">
                <div className="w-full">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Activity size={16} />
                    <TranslatedText text="Deal Breakers - When Fish Just Leave" />
                  </h4>
                  <p className="text-xs mb-3">
                    <TranslatedText text="Some water conditions are so bad that fish will simply swim away to better areas, even if it's their favorite season:" />
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-semibold">🌡️ <TranslatedText text="Extreme Temperatures" /></div>
                      <div>• <TranslatedText text="Freezing cold water (<4°C): Fish go dormant" /></div>
                      <div>• <TranslatedText text="Scorching hot (>25°C): Fish flee to deeper, cooler water" /></div>
                    </div>
                    <div>
                      <div className="font-semibold">💨 <TranslatedText text="No Oxygen" /></div>
                      <div>• <TranslatedText text="Can't breathe (<5 mg/L): Fish evacuate immediately" /></div>
                      <div>• <TranslatedText text="Toxic algae blooms: Like a poison cloud underwater" /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Calculation */}
              <div className="card bg-success/20 mt-4">
                <div className="card-body text-center">
                  <div className="mb-2">
                    <span className="font-medium"><TranslatedText text="Putting it together: " /></span>
                    <span className="text-2xl font-bold text-success">
                      (100% season × 0.7) + (96% water × 0.3) = 99%
                    </span>
                  </div>
                  <p className="text-sm">
                    <TranslatedText text="This Sea Bass gets a 99% confidence score - that's a definite right swipe! 🐟" />
                  </p>
                  <p className="text-xs opacity-70">
                    <TranslatedText text="Translation: 'Sea Bass are definitely here right now, the water conditions are nearly perfect, go fishing!'" />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Sources Credits */}
          <div className="card bg-base-100 shadow-xl mt-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                <Database className="text-primary" size={24} />
                <TranslatedText text="Data Sources & Credits" />
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="border-l-4 border-primary pl-3">
                    <h4 className="font-medium text-sm">ICES (International Council for the Exploration of the Sea)</h4>
                    <p className="text-xs text-base-content/70"><TranslatedText text="Official fish distribution data and marine grid system" /></p>
                    <a href="https://www.ices.dk" className="text-primary text-xs hover:underline">www.ices.dk</a>
                  </div>
                  <div className="border-l-4 border-success pl-3">
                    <h4 className="font-medium text-sm">Copernicus Marine Service</h4>
                    <p className="text-xs text-base-content/70"><TranslatedText text="Real-time marine biology and oceanographic data" /></p>
                    <a href="https://marine.copernicus.eu" className="text-primary text-xs hover:underline">marine.copernicus.eu</a>
                  </div>
                  <div className="border-l-4 border-info pl-3">
                    <h4 className="font-medium text-sm">EMODnet (European Marine Observation and Data Network)</h4>
                    <p className="text-xs text-base-content/70"><TranslatedText text="We're grateful for the amazing work done at this comprehensive European marine data portal" /></p>
                    <a href="https://emodnet.ec.europa.eu" className="text-primary text-xs hover:underline">emodnet.ec.europa.eu</a>
                  </div>
                  <div className="border-l-4 border-secondary pl-3">
                    <h4 className="font-medium text-sm">Stormglass.io</h4>
                    <p className="text-xs text-base-content/70"><TranslatedText text="Marine weather API and oceanographic conditions" /></p>
                    <a href="https://stormglass.io" className="text-primary text-xs hover:underline">stormglass.io</a>
                  </div>
                  <div className="border-l-4 border-accent pl-3">
                    <h4 className="font-medium text-sm">Norwegian Meteorological Institute</h4>
                    <p className="text-xs text-base-content/70"><TranslatedText text="Super-detailed weather data, forecasts, and atmospheric conditions" /></p>
                    <a href="https://met.no/en" className="text-primary text-xs hover:underline">met.no/en</a>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="border-l-4 border-warning pl-3">
                    <h4 className="font-medium text-sm"><TranslatedText text="Fishing Associations" /></h4>
                    <p className="text-xs text-base-content/70 mb-2"><TranslatedText text="We're indebted to these great folks for their work on behavior patterns and their local knowledge" /></p>
                    <div className="space-y-1 text-xs opacity-70">
                      <div>🇪🇸 Federación Española de Pesca Deportiva</div>
                      <div>🇬🇧 The Angling Trust & Sea Angling Association</div>
                      <div>🇮🇪 Irish Federation of Sea Anglers</div>
                      <div>🇫🇷 Fédération Française de Pêche en Mer</div>
                      <div>🇵🇹 Federação Portuguesa de Pesca Desportiva</div>
                      <div>🇳🇱 Nederlandse Zeehengelsport Federatie</div>
                    </div>
                  </div>
                  <div className="border-l-4 border-error pl-3">
                    <h4 className="font-medium text-sm"><TranslatedText text="Scientific Literature" /></h4>
                    <p className="text-xs text-base-content/70"><TranslatedText text="Fish physiology and environmental preferences" /></p>
                    <p className="text-xs opacity-60"><TranslatedText text="Peer-reviewed marine biology research" /></p>
                  </div>
                  <div className="border-l-4 border-primary pl-3">
                    <h4 className="font-medium text-sm"><TranslatedText text="The findr Community" /></h4>
                    <p className="text-xs text-base-content/70"><TranslatedText text="Our amazing findr friends sharing catch reports, local insights, and fishing wisdom to build the world's best fishing knowledge resource" /></p>
                    <p className="text-xs opacity-60"><TranslatedText text="Community-driven intelligence from passionate anglers worldwide" /></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Local Tackle Shops Tribute */}
<div className="card bg-primary/5 shadow-xl mt-6">
  <div className="card-body">
    <h2 className="card-title text-2xl mb-4">
      <Fish className="text-primary" size={24} />
      <TranslatedText text="Independent Tackle Shops & Bait Stores" />
    </h2>

    <div className="card bg-base-100">
      <div className="card-body">
        <p className="text-sm text-base-content/80 mb-3">
          <TranslatedText text="A huge thank you to the independent men and women who keep the angling world alive — the ones who open their shops early, keep the bait fresh, and always have time for a story, a bit of advice, or a packet of hooks." />
        </p>

        <p className="text-sm text-base-content/80 mb-3">
          <TranslatedText text="In a world of online shopping and courier deliveries, these local tackle shops are the beating heart of our fishing communities. They teach, repair, lend, and laugh with us — and without them, the sport would lose its soul." />
        </p>

        <p className="text-sm text-base-content/80 mb-3">
          <TranslatedText text="If you’re lucky enough to have a local shop nearby, please support them. Every visit, every reel of line, every chat over the counter helps keep our shared traditions alive for the next generation." />
        </p>

        <div className="mt-4 text-xs flex flex-wrap gap-2">
          <span className="badge badge-primary badge-sm">🎣 <TranslatedText text="Local knowledge" /></span>
          <span className="badge badge-primary badge-sm">🪱 <TranslatedText text="Fresh bait, friendly advice" /></span>
          <span className="badge badge-primary badge-sm">🏪 <TranslatedText text="Community spirit" /></span>
          <span className="badge badge-primary badge-sm">💬 <TranslatedText text="Real stories, real people" /></span>
        </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 p-6 card bg-base-100">
            <div className="flex justify-center items-center gap-2 mb-2">
              <Fish className="text-primary" size={24} />
              <span className="font-semibold">findr</span>
              <span className="text-base-content/60">- Smart Fishing Intelligence</span>
            </div>
            <p className="text-base-content/60 text-sm">
              <TranslatedText text="Where mullets never go out of style" />
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default FindrInfoPage;

// Disable static generation
export async function getServerSideProps() {
  return { props: {} };
}
