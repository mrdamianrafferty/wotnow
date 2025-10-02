import React, { useEffect } from 'react';

interface FindrInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FindrInfoModal: React.FC<FindrInfoModalProps> = ({ isOpen, onClose }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '80rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 float-right z-10 btn btn-circle btn-sm bg-base-200 hover:bg-base-300"
          aria-label="Close modal"
          style={{ marginBottom: '-2.5rem' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '1.25rem', height: '1.25rem' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Content */}
        <div style={{ padding: '3rem' }}>
          {/* Header */}
          <h1
            style={{
              color: '#0f172a',
              fontSize: '3rem',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '0.75rem',
            }}
          >
            From Raw Data to Fishing Gold
          </h1>
          <p
            style={{
              color: '#475569',
              fontSize: '1.25rem',
              textAlign: 'center',
              marginBottom: '4rem',
              lineHeight: 1.75,
            }}
          >
            How findr transforms complex marine data into simple fishing advice
          </p>

          {/* SECTION 1: DATA SOURCES */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <h2
                style={{
                  color: '#1e3a8a',
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                Data Sources
              </h2>
            </div>

            <p style={{ color: '#334155', fontSize: '1.125rem', marginBottom: '2rem', lineHeight: 1.75 }}>
              findr pulls real-time data from trusted marine research sources
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
              }}
            >
              <DataSourceCard
                icon={<WavesIcon />}
                title="Copernicus Marine"
                description="Sea temperature, salinity, currents, wave height"
              />
              <DataSourceCard
                icon={<CloudRainIcon />}
                title="Weather Data"
                description="Wind speed, pressure, precipitation, cloud cover"
              />
              <DataSourceCard
                icon={<SatelliteIcon />}
                title="NASA Ocean Data"
                description="Chlorophyll, dissolved oxygen, nutrients"
              />
            </div>
          </div>

          <ArrowDown />

          {/* SECTION 2: MAPPING & ORGANIZATION */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  backgroundColor: '#d97706',
                  color: 'white',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <h2
                style={{
                  color: '#78350f',
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                Mapping & Organization
              </h2>
            </div>

            <p style={{ color: '#334155', fontSize: '1.125rem', marginBottom: '2rem', lineHeight: 1.75 }}>
              All data is organized using ICES rectangles - the international standard for marine zones
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <MappingCard
                icon={<GridIcon />}
                title="ICES Grid System"
                description="Divides oceans into 30' latitude × 1° longitude rectangles with unique codes"
              />
              <MappingCard
                icon={<MapPinIcon />}
                title="Species Distribution"
                description="Known fish populations mapped to specific ICES rectangles"
              />
            </div>

            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '2px solid #fcd34d',
                borderRadius: '0.75rem',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                <LightbulbIcon />
                <div>
                  <div
                    style={{
                      color: '#78350f',
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                    }}
                  >
                    How ICES Species Mapping Works
                  </div>
                  <div style={{ color: '#451a03', lineHeight: 1.75, marginBottom: '1rem' }}>
                    Each ICES rectangle tracks which fish species are found there throughout the year. Here&apos;s
                    the 3-step process:
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <ProcessStep
                  title="Step 1: Location → Rectangle"
                  description="Your GPS coordinates (43.5°N, 5.3°W) maps to ICES rectangle 24E1"
                />
                <ProcessStep
                  title="Step 2: Rectangle → Species"
                  description="24E1 contains: Sea Bass, Mackerel, Tuna, Sardine (varies by season)"
                />
                <ProcessStep
                  title="Step 3: Current Conditions"
                  description="Filter by today's water temp (16°C) → Sea Bass & Mackerel most active"
                />
              </div>

              <div
                style={{
                  textAlign: 'center',
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                }}
              >
                <div style={{ color: '#1e40af', fontWeight: 600, marginBottom: '0.5rem' }}>🎯 Result:</div>
                <div style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  &quot;You&apos;re in ICES 24E1. Based on current conditions, target Sea Bass at 20-30m depth near rocky
                  areas.&quot;
                </div>
              </div>
            </div>
          </div>

          <ArrowDown />

          {/* SECTION 3: PROCESSING & ANALYSIS */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  backgroundColor: '#9333ea',
                  color: 'white',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <h2
                style={{
                  color: '#581c87',
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                Processing & Analysis
              </h2>
            </div>

            <p style={{ color: '#334155', fontSize: '1.125rem', marginBottom: '2rem', lineHeight: 1.75 }}>
              findr&apos;s engine combines species data with current conditions
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <AnalysisCard icon={<DatabaseIcon />} title="Data Aggregation" description="Multiple data points averaged per rectangle" />
              <AnalysisCard icon={<RefreshIcon />} title="Real-time Updates" description="Continuous monitoring and data refresh" />
              <AnalysisCard icon={<TargetIcon />} title="Species Matching" description="Match ICES fish populations with conditions" />
              <AnalysisCard icon={<TrendingIcon />} title="Trend Analysis" description="Identify optimal fishing conditions" />
            </div>
          </div>

          <ArrowDown />

          {/* SECTION 4: YOUR FISHING ADVICE */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  backgroundColor: '#059669',
                  color: 'white',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0,
                }}
              >
                4
              </div>
              <h2
                style={{
                  color: '#065f46',
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                Your Fishing Advice
              </h2>
            </div>

            <p style={{ color: '#334155', fontSize: '1.125rem', marginBottom: '2rem', lineHeight: 1.75 }}>
              Marine science translated into plain fishing talk
            </p>

            <div
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                <OutputCard
                  icon={<FishIcon />}
                  title="What's Biting"
                  description="Sea Bass and Mackerel are on the feed right now - water temp is spot on and there's plenty of baitfish around"
                />
                <OutputCard
                  icon={<ThermometerIcon />}
                  title="Conditions Out There"
                  description="14°C water, light chop from the northeast. 12 knot breeze, 1.2 meter swell. It's good fishing weather."
                />
                <OutputCard
                  icon={<CompassIcon />}
                  title="Where to Go"
                  description="Try the rocky patches at 20-30 meters - that's where the baitfish are hanging out"
                />
                <OutputCard
                  icon={<ClockIcon />}
                  title="When to Fish"
                  description="Tide's pushing in - next 2-3 hours should be prime time"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '4rem',
              paddingTop: '2rem',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <p style={{ fontWeight: 700, fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem' }}>
              findr
            </p>
            <p style={{ color: '#475569', marginBottom: '0.75rem' }}>
              Turning ocean science into fishing success
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap',
                fontSize: '0.875rem',
                color: '#64748b',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ZapIcon />
                Real-time data
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ActivityIcon />
                Smart analysis
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FishIcon />
                Simple advice
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Card Components
const DataSourceCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      border: '2px solid #3b82f6',
      borderRadius: '1rem',
      padding: '1.5rem',
      textAlign: 'center',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>{icon}</div>
    <div style={{ color: '#0f172a', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
      {title}
    </div>
    <div style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.5 }}>{description}</div>
  </div>
);

const MappingCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      border: '2px solid #f59e0b',
      borderRadius: '1rem',
      padding: '1.5rem',
      textAlign: 'center',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>{icon}</div>
    <div style={{ color: '#0f172a', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
      {title}
    </div>
    <div style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.5 }}>{description}</div>
  </div>
);

const AnalysisCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
      border: '2px solid #a855f7',
      borderRadius: '1rem',
      padding: '1.5rem',
      textAlign: 'center',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>{icon}</div>
    <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</div>
    <div style={{ color: '#334155', fontSize: '0.875rem' }}>{description}</div>
  </div>
);

const OutputCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(8px)',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '1rem',
      padding: '1.5rem',
      color: 'white',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontWeight: 700,
        fontSize: '1.125rem',
        marginBottom: '0.75rem',
      }}
    >
      {icon}
      <span>{title}</span>
    </div>
    <div style={{ fontSize: '0.875rem', lineHeight: 1.6, opacity: 0.95 }}>{description}</div>
  </div>
);

const ProcessStep: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      padding: '1rem',
      borderRadius: '0.75rem',
      border: '2px solid #bae6fd',
    }}
  >
    <div style={{ color: '#0369a1', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</div>
    <div style={{ color: '#1e293b', fontSize: '0.875rem', lineHeight: 1.5 }}>{description}</div>
  </div>
);

const ArrowDown = () => (
  <div style={{ textAlign: 'center', fontSize: '3rem', color: '#94a3b8', margin: '2rem 0', lineHeight: 1 }}>
    ↓
  </div>
);

// Icon Components
const WavesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '3rem', height: '3rem', color: '#2563eb' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </svg>
);

const CloudRainIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '3rem', height: '3rem', color: '#2563eb' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M16 14v6" />
    <path d="M8 14v6" />
    <path d="M12 16v6" />
  </svg>
);

const SatelliteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '3rem', height: '3rem', color: '#2563eb' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    <circle cx="12" cy="12" r="10" opacity="0.3" />
  </svg>
);

const GridIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '3rem', height: '3rem', color: '#d97706' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '3rem', height: '3rem', color: '#d97706' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const LightbulbIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '2.5rem', height: '2.5rem', color: '#d97706', flexShrink: 0, marginTop: '0.25rem' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

const DatabaseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '2.5rem', height: '2.5rem', color: '#9333ea' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '2.5rem', height: '2.5rem', color: '#9333ea' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const TargetIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '2.5rem', height: '2.5rem', color: '#9333ea' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TrendingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '2.5rem', height: '2.5rem', color: '#9333ea' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    <path d="M2 12v5c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-5" />
    <path d="M2 7v-.5C2 5.67 2.9 5 4 5h16c1.1 0 2 .67 2 1.5V7" />
  </svg>
);

const FishIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '1.5rem', height: '1.5rem', color: 'white' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
    <path d="M18 12v.5" />
    <path d="M16 17.93a9.77 9.77 0 0 1 0 0" />
    <path d="M7 10.67C7 10.67 7.5 9 9 9c1.5 0 2.2 1.5 3 1.5s1.5-1.5 3-1.5c1.5 0 2 1.67 2 1.67" />
    <path d="M2 16h.01" />
  </svg>
);

const ThermometerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '1.5rem', height: '1.5rem', color: 'white' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
  </svg>
);

const CompassIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '1.5rem', height: '1.5rem', color: 'white' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '1.5rem', height: '1.5rem', color: 'white' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ZapIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '1.25rem', height: '1.25rem', color: '#64748b' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ActivityIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '1.25rem', height: '1.25rem', color: '#64748b' }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
