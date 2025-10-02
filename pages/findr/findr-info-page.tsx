import React, { useEffect, useState } from 'react';
import { Fish, Waves, Thermometer, Droplets, Activity, Clock, TrendingUp, Database, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import AppHeader from '../../components/AppHeader';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';

const FindrInfoPage = () => {
  type SectionKey = 'ices' | 'marine' | 'weather' | 'expert';

  interface SectionHeaderProps {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    subtitle: string;
    isExpanded: boolean;
    onClick: () => void;
  }

  type ToggleSection = (section: SectionKey) => void;

  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);

  useEffect(() => {
    console.info('[Findr Info] Static educational content detected. Replace ICES examples and scoring copy with live Supabase/weather insights when available.');
  }, []);

  const toggleSection: ToggleSection = (section) => {
    setExpandedSection((prev: SectionKey | null) => (prev === section ? null : section));
  };

  const SectionHeader = ({ icon: Icon, title, subtitle, isExpanded, onClick }: SectionHeaderProps) => (
    <div 
      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <Icon size={24} />
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-blue-100 text-sm">{subtitle}</p>
        </div>
      </div>
      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
    </div>
  );

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <style jsx>{`
        @keyframes swim {
          0% { transform: translateX(0) rotate(0deg); }
          12.5% { transform: translateX(0.5px) rotate(0.2deg); }
          25% { transform: translateX(2px) rotate(1deg); }
          37.5% { transform: translateX(1.5px) rotate(0.7deg); }
          50% { transform: translateX(0) rotate(0deg); }
          62.5% { transform: translateX(-1.5px) rotate(-0.7deg); }
          75% { transform: translateX(-2px) rotate(-1deg); }
          87.5% { transform: translateX(-0.5px) rotate(-0.2deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          25% { transform: translateY(-1.5px); }
          50% { transform: translateY(-3px); }
          75% { transform: translateY(-1.5px); }
          100% { transform: translateY(0px); }
        }

        @keyframes pulse-glow {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5));
          }
          50% { 
            transform: scale(1.05);
            filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.8));
          }
        }

        @keyframes gentle-bounce {
          0% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(0.25deg); }
          50% { transform: translateY(-2px) rotate(0.5deg); }
          75% { transform: translateY(-1px) rotate(0.25deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes shimmer {
          0% { background-position: -150% 0; }
          25% { background-position: -75% 0; }
          50% { background-position: 0% 0; }
          75% { background-position: 75% 0; }
          100% { background-position: 150% 0; }
        }

        @keyframes subtle-bob {
          0% { transform: translateY(0px) rotate(0deg); }
          12.5% { transform: translateY(-0.5px) rotate(0.1deg); }
          25% { transform: translateY(-1px) rotate(0.25deg); }
          37.5% { transform: translateY(-1.5px) rotate(0.4deg); }
          50% { transform: translateY(-2px) rotate(0.5deg); }
          62.5% { transform: translateY(-1.5px) rotate(0.4deg); }
          75% { transform: translateY(-1px) rotate(0.25deg); }
          87.5% { transform: translateY(-0.5px) rotate(0.1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        .fish-swim {
          animation: swim 8s cubic-bezier(0.4, 0.0, 0.6, 1) infinite;
        }

        .fish-float {
          animation: float 6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .fish-glow {
          animation: pulse-glow 3s cubic-bezier(0.4, 0.0, 0.6, 1) infinite;
        }

        .fish-bounce {
          animation: gentle-bounce 6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .fish-combo {
          animation: swim 8s cubic-bezier(0.4, 0.0, 0.6, 1) infinite, 
                     float 6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .fish-shimmer {
          position: relative;
          animation: subtle-bob 5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .fish-shimmer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            110deg,
            transparent 20%,
            transparent 40%,
            rgba(192, 192, 192, 0.8) 50%,
            rgba(255, 255, 255, 0.9) 55%,
            rgba(192, 192, 192, 0.8) 60%,
            transparent 70%,
            transparent 80%
          );
          animation: shimmer 5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          border-radius: 50%;
          pointer-events: none;
          mix-blend-mode: overlay;
        }

        .fish-underwater {
          animation: swim 8s cubic-bezier(0.4, 0.0, 0.6, 1) infinite, 
                     float 6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite,
                     subtle-bob 5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }
        `}</style>

  <div className="mx-auto w-full max-w-none px-3 pt-4 pb-16 sm:px-4 md:px-6 lg:max-w-4xl">
          <FindrNavigation />

        {/* Header */}
        <div className="text-center mt-6 mb-12">
          <div className="flex justify-center items-center mb-4">
            <Fish size={48} className="text-blue-400 mr-3 fish-underwater" />
            <h1 className="text-4xl font-bold text-white">findr</h1>
          </div>
          <p className="text-xl text-blue-200 mb-2">Smart Fishing Intelligence</p>
          <p className="text-gray-300 max-w-2xl mx-auto">
            We combine marine science, weather data, and local fishing wisdom to predict when and where fish want to bite
          </p>
        </div>

        {/* How It Works Overview */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <TrendingUp className="mr-3 text-green-400" />
            How findr Predicts Your Perfect Catch
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            findr uses a unique combination of scientific marine data, real-time weather conditions, and expert fishing knowledge 
            to calculate which fish species are most likely to be biting at your chosen location and time. Think of it as a 
            smart dating app - but instead of matching people, we&apos;re matching you with the fish that want to bite!
          </p>
        </div>

        {/* Data Sources Sections */}
        <div className="space-y-4">
          
          {/* ICES Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <SectionHeader
              icon={Globe}
              title="ICES Marine Grid System"
              subtitle="Official European fish distribution data"
              isExpanded={expandedSection === 'ices'}
              onClick={() => toggleSection('ices')}
            />
            {expandedSection === 'ices' && (
              <div className="p-6 border-t border-white/10">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">What is ICES?</h4>
                    <p className="text-gray-300">
                      Think of European waters as being divided into a giant fishing map with numbered squares. The International Council for the Exploration of the Sea (ICES) has been tracking which fish live in each square for decades.
                    </p>
                    <h4 className="text-lg font-semibold text-white">How We Use It</h4>
                    <ul className="text-gray-300 space-y-2">
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        Your fishing spot gets matched to its square on the map (like 42F8 for the Asturian coast)
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        We instantly know which fish species naturally live in that area
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        Fish move with the seasons - we track when they arrive and leave each area
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-3">Example ICES Areas</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">VIIIc (Cantabrian Sea)</span>
                        <span className="text-blue-300">Sea Bass, Bream</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">VIIIb (Bay of Biscay)</span>
                        <span className="text-blue-300">Mackerel, Tuna</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">VIIIa (Northern Biscay)</span>
                        <span className="text-blue-300">Pollack, Cod</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Marine Biology Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <SectionHeader
              icon={Activity}
              title="Live Marine Biology Data"
              subtitle="Real-time ocean health indicators"
              isExpanded={expandedSection === 'marine'}
              onClick={() => toggleSection('marine')}
            />
            {expandedSection === 'marine' && (
              <div className="p-6 border-t border-white/10">
                <p className="text-gray-300 mb-6">
                  Just like you have preferred weather for a day out, different fish prefer different water conditions. We constantly monitor the &quot;health&quot; of the water to predict which fish will be active and hungry.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-900/40 to-green-800/40 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                        <h5 className="text-white font-medium">Water &quot;Greenness&quot; (Chlorophyll)</h5>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Green water = lots of tiny plants = lots of small fish = big fish come to hunt. It&apos;s like checking if the dinner table is set!
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/40 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                        <h5 className="text-white font-medium">Oxygen in the Water</h5>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Fish need to &quot;breathe&quot; underwater. Low oxygen = lazy fish that won&apos;t chase your bait. High oxygen = active, hungry fish
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-cyan-900/40 to-cyan-800/40 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full mr-3"></div>
                        <h5 className="text-white font-medium">Water Temperature</h5>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Every fish has a &quot;comfort zone&quot; temperature. Too hot or cold and they either hide deeper or swim away to better areas
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/40 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
                        <h5 className="text-white font-medium">Saltiness (Salinity)</h5>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Some fish love super salty water, others prefer it mixed with fresh water from rivers. Wrong saltiness = no fish
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-orange-900/40 to-orange-800/40 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full mr-3"></div>
                        <h5 className="text-white font-medium">Water &quot;Fertilizer&quot; (Nutrients)</h5>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Like fertilizer for your garden, these chemicals help sea plants grow, which feeds the whole underwater food chain
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-gray-700/40 to-gray-600/40 rounded-lg p-4 border border-gray-500/30">
                      <div className="flex items-center mb-2">
                        <TrendingUp size={16} className="text-yellow-400 mr-2" />
                        <h5 className="text-white font-medium">Smart Scoring</h5>
                      </div>
                      <p className="text-gray-300 text-sm">
                        We give each fish a report card (0-100%) for how perfect the current water conditions are for that species
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Weather & Tides Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <SectionHeader
              icon={Waves}
              title="Weather & Tidal Conditions"
              subtitle="Real-time environmental factors"
              isExpanded={expandedSection === 'weather'}
              onClick={() => toggleSection('weather')}
            />
            {expandedSection === 'weather' && (
              <div className="p-6 border-t border-white/10">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Weather Impact</h4>
                    <ul className="text-gray-300 space-y-2">
                      <li className="flex items-start">
                        <Thermometer size={16} className="text-red-400 mr-2 mt-1" />
                        <span><strong>Air Temperature:</strong> Warms or cools the surface water, making fish more or less active</span>
                      </li>
                      <li className="flex items-start">
                        <Waves size={16} className="text-blue-400 mr-2 mt-1" />
                        <span><strong>Wave Height:</strong> Big waves = dangerous conditions and some fishing methods won&apos;t work</span>
                      </li>
                      <li className="flex items-start">
                        <Activity size={16} className="text-green-400 mr-2 mt-1" />
                        <span><strong>Wind Speed:</strong> Affects your casting distance, boat control, and mixes up the water</span>
                      </li>
                      <li className="flex items-start">
                        <Droplets size={16} className="text-cyan-400 mr-2 mt-1" />
                        <span><strong>Air Pressure:</strong> Fish can &quot;feel&quot; pressure changes and it affects when they want to feed</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Tidal Intelligence</h4>
                    <div className="bg-blue-900/30 rounded-lg p-4">
                      <p className="text-gray-300 mb-3">
                        Different fish like different tide times - it&apos;s like their dinner schedule! We tell you:
                      </p>
                      <ul className="text-gray-300 space-y-1 text-sm">
                        <li>• When each fish species prefers to feed (high tide, low tide, or moving water)</li>
                        <li>• The best times to fish before or after tide changes</li>
                        <li>• How strong currents affect where fish hang out</li>
                        <li>• Local tide tips that work for your specific fishing spot</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expert Knowledge Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <SectionHeader
              icon={Fish}
              title="Expert Fishing Knowledge"
              subtitle="Local wisdom and proven techniques"
              isExpanded={expandedSection === 'expert'}
              onClick={() => toggleSection('expert')}
            />
            {expandedSection === 'expert' && (
              <div className="p-6 border-t border-white/10">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-green-900/30 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-3 flex items-center">
                      <Fish size={16} className="mr-2 fish-float" />
                      Species Behavior
                    </h5>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Feeding patterns and times</li>
                      <li>• Habitat preferences</li>
                      <li>• Seasonal movements</li>
                      <li>• Response to weather</li>
                    </ul>
                  </div>
                  <div className="bg-purple-900/30 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-3 flex items-center">
                      <Activity size={16} className="mr-2" />
                      Bait & Technique
                    </h5>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Best baits for each species</li>
                      <li>• Optimal fishing methods</li>
                      <li>• Gear recommendations</li>
                      <li>• Depth and structure tips</li>
                    </ul>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-3 flex items-center">
                      <Clock size={16} className="mr-2" />
                      Timing Secrets
                    </h5>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Dawn and dusk patterns</li>
                      <li>• Moon phase influences</li>
                      <li>• Weather front timing</li>
                      <li>• Tide-specific advice</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* The Algorithm Section */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-xl p-6 mt-8 border border-purple-400/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <TrendingUp className="mr-3 text-purple-400" />
            The findr Algorithm
          </h2>
          <p className="text-gray-300 mb-4">
            Our smart system combines all this information to give each fish species a confidence score (0-100%) - basically answering &quot;how likely am I to catch this fish right now?&quot; Here&apos;s the simple formula:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-3">Season Score (70% weight)</h4>
              <p className="text-gray-300 text-sm mb-3">
                This is the big one! If the fish aren&apos;t in your area right now because they&apos;ve migrated somewhere else, perfect water won&apos;t help. Season trumps everything.
              </p>
              <div className="bg-black/20 rounded p-3 text-sm">
                <div className="text-green-400">Example: Mackerel in Summer</div>
                <div className="text-gray-300">They love this time of year = 100%</div>
                <div className="text-gray-300">Currently it&apos;s summer = Perfect timing!</div>
                <div className="text-yellow-400">Season Score: 100%</div>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Water Conditions (30% weight)</h4>
              <p className="text-gray-300 text-sm mb-3">
                Even if fish are in the area, bad water conditions can make them inactive. This fine-tunes our prediction.
              </p>
              <div className="bg-black/20 rounded p-3 text-sm">
                <div className="text-green-400">Example: Sea Bass Right Now</div>
                <div className="text-gray-300">Water temp: 16°C (their favorite!) = 100%</div>
                <div className="text-gray-300">Oxygen levels: Looking good = 95%</div>
                <div className="text-yellow-400">Water Score: 96%</div>
              </div>
            </div>
          </div>
          
          {/* Hard Limits Section */}
          <div className="mt-6 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-lg border border-red-500/30">
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Activity className="mr-2 text-red-400" size={16} />
              Deal Breakers - When Fish Just Leave
            </h4>
            <p className="text-gray-300 text-sm mb-3">
              Some water conditions are so bad that fish will simply swim away to better areas, even if it&apos;s their favorite season:
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="text-red-400">🌡️ Extreme Temperatures</div>
                <div className="text-gray-300">• Freezing cold water (&lt;4°C): Fish go dormant</div>
                <div className="text-gray-300">• Scorching hot (&gt;25°C): Fish flee to deeper, cooler water</div>
              </div>
              <div className="space-y-2">
                <div className="text-red-400">💨 No Oxygen</div>
                <div className="text-gray-300">• Can&apos;t breathe (&lt;5 mg/L): Fish evacuate immediately</div>
                <div className="text-gray-300">• Toxic algae blooms: Like a poison cloud underwater</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-orange-300">
              When these &quot;deal breakers&quot; happen, confidence scores drop to almost zero, even for fish that should be there.
            </div>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg">
            <div className="text-center">
              <span className="text-white font-medium">Putting it together: </span>
              <span className="text-2xl font-bold text-green-400">
                (100% season × 0.7) + (96% water × 0.3) = 99%
              </span>
            </div>
            <p className="text-center text-gray-300 text-sm mt-2">
              This Sea Bass gets a 99% confidence score - that&apos;s a definite right swipe! 🐟
            </p>
            <p className="text-center text-gray-400 text-xs mt-1">
              Translation: &quot;Sea Bass are definitely here right now, the water conditions are nearly perfect, go fishing!&quot;
            </p>
            
            {/* Animation Demo */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-center text-gray-400 text-xs mb-3">
                🌊 Watch our fish icons come alive with underwater animations and light shimmer effects:
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-md mx-auto">
                <div className="flex flex-col items-center">
                  <Fish size={20} className="text-blue-400 fish-swim mb-1" />
                  <span className="text-xs text-gray-400">Swimming</span>
                </div>
                <div className="flex flex-col items-center">
                  <Fish size={20} className="text-green-400 fish-float mb-1" />
                  <span className="text-xs text-gray-400">Floating</span>
                </div>
                <div className="flex flex-col items-center">
                  <Fish size={20} className="text-purple-400 fish-glow mb-1" />
                  <span className="text-xs text-gray-400">Glowing</span>
                </div>
                <div className="flex flex-col items-center">
                  <Fish size={20} className="text-yellow-400 fish-bounce mb-1" />
                  <span className="text-xs text-gray-400">Bouncing</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Fish size={20} className="text-cyan-400 fish-shimmer mb-1" />
                  </div>
                  <span className="text-xs text-gray-400">Shimmer</span>
                </div>
                <div className="flex flex-col items-center">
                  <Fish size={20} className="text-teal-400 fish-underwater mb-1" />
                  <span className="text-xs text-gray-400">Underwater</span>
                </div>
              </div>
              <p className="text-center text-gray-500 text-xs mt-3">
                ✨ The shimmer effect mimics sunlight dancing on fish scales as they swim beneath the surface
              </p>
            </div>
          </div>
        </div>

        {/* Data Sources Credits */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mt-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Database className="mr-3 text-blue-400" />
            Data Sources & Credits
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border-l-4 border-blue-400 pl-4">
                <h4 className="text-white font-medium">ICES (International Council for the Exploration of the Sea)</h4>
                <p className="text-gray-300 text-sm">Official fish distribution data and marine grid system</p>
                <a href="https://www.ices.dk" className="text-blue-400 text-sm hover:underline">www.ices.dk</a>
              </div>
              <div className="border-l-4 border-green-400 pl-4">
                <h4 className="text-white font-medium">Copernicus Marine Service</h4>
                <p className="text-gray-300 text-sm">Real-time marine biology and oceanographic data</p>
                <a href="https://marine.copernicus.eu" className="text-blue-400 text-sm hover:underline">marine.copernicus.eu</a>
              </div>
              <div className="border-l-4 border-teal-400 pl-4">
                <h4 className="text-white font-medium">EMODnet (European Marine Observation and Data Network)</h4>
                <p className="text-gray-300 text-sm">We&apos;re grateful for the amazing work done at this comprehensive European marine data portal</p>
                <a href="https://emodnet.ec.europa.eu" className="text-blue-400 text-sm hover:underline">emodnet.ec.europa.eu</a>
              </div>
              <div className="border-l-4 border-purple-400 pl-4">
                <h4 className="text-white font-medium">Stormglass.io</h4>
                <p className="text-gray-300 text-sm">Marine weather API and oceanographic conditions</p>
                <a href="https://stormglass.io" className="text-blue-400 text-sm hover:underline">stormglass.io</a>
              </div>
              <div className="border-l-4 border-indigo-400 pl-4">
                <h4 className="text-white font-medium">Norwegian Meteorological Institute</h4>
                <p className="text-gray-300 text-sm">Super-detailed weather data, forecasts, and atmospheric conditions</p>
                <a href="https://met.no/en" className="text-blue-400 text-sm hover:underline">met.no/en</a>
              </div>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-orange-400 pl-4">
                <h4 className="text-white font-medium">Fishing Associations</h4>
                <p className="text-gray-300 text-sm mb-2">We&apos;re indebted to these great folks for their work on behavior patterns and their local knowledge</p>
                <div className="space-y-1 text-xs text-gray-400">
                    <div>🇪🇸 Federaci&oacute;n Espa&ntilde;ola de Pesca Deportiva</div>
                  <div>🇬🇧 The Angling Trust & Sea Angling Association</div>
                  <div>🇮🇪 Irish Federation of Sea Anglers</div>
                  <div>🇫🇷 Fédération Française de Pêche en Mer</div>
                  <div>🇵🇹 Federação Portuguesa de Pesca Desportiva</div>
                  <div>🇳🇱 Nederlandse Zeehengelsport Federatie</div>
                </div>
              </div>
              <div className="border-l-4 border-red-400 pl-4">
                <h4 className="text-white font-medium">Scientific Literature</h4>
                <p className="text-gray-300 text-sm">Fish physiology and environmental preferences</p>
                <p className="text-gray-400 text-xs">Peer-reviewed marine biology research</p>
              </div>
              <div className="border-l-4 border-cyan-400 pl-4">
                <h4 className="text-white font-medium">The findr Community</h4>
                <p className="text-gray-300 text-sm">Our amazing findr friends sharing catch reports, local insights, and fishing wisdom to build the world&apos;s best fishing knowledge resource</p>
                <p className="text-gray-400 text-xs">Community-driven intelligence from passionate anglers worldwide</p>
              </div>
            </div>
          </div>
        </div>

        {/* Artwork Credits */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-xl p-6 mt-6 border border-purple-400/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Fish className="mr-3 text-purple-400 fish-glow" />
            Artwork & Design
          </h2>
          <div className="bg-black/20 rounded-lg p-6 border border-purple-400/30">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold text-lg">EK</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Ruki Takada</h3>
                <p className="text-purple-200">Renowned Nature Artist</p>
              </div>
            </div>
            <p className="text-gray-300 mb-4">
              A heartfelt thank you to Ruki Takada for creating the exquisite custom artwork that brings findr&apos;s underwater world to life. 
              The beautiful fish illustrations, marine landscapes, and nature-inspired design elements capture the magic and mystery of the ocean 
              that every angler feels when casting their line.
            </p>
            <div className="text-sm text-purple-200">
              🎨 Custom fish species illustrations • 🌊 Marine environment artwork
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 p-6 bg-black/20 rounded-lg">
          <div className="flex justify-center items-center mb-4">
            <div className="relative">
              <Fish className="text-blue-400 mr-2 fish-shimmer" />
            </div>
            <span className="text-white font-semibold">findr</span>
            <span className="text-gray-400 ml-2">- Smart Fishing Intelligence</span>
          </div>
          <p className="text-gray-400 text-sm">
            Where mullets never go out of style
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default FindrInfoPage;