// CSS already imported globally in _app.tsx (minified version)
// import '/styles/weather-icons-wind.min.css';

export default function WindDirectionIcon({ deg, size = 24, className = '' }: { deg: number; size?: number; className?: string }) {
  const roundedDeg = Math.round(deg);
  const iconClass = `wi wi-wind from-${roundedDeg}-deg`;

  return (
    <i
      className={`${iconClass} ${className}`.trim()}
      title={`Wind from ${roundedDeg}°`}
      style={{ fontSize: size, verticalAlign: 'middle' }}
    />
  );
}
