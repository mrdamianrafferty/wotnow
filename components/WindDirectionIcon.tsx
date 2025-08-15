import '/styles/weather-icons-wind.css';
import '/styles/weather-icons-wind.min.css';

export default function WindDirectionIcon({ deg }: { deg: number }) {
  const roundedDeg = Math.round(deg);
  const iconClass = `wi wi-wind from-${roundedDeg}-deg`;

  return (
    <i
      className={iconClass}
      title={`Wind from ${roundedDeg}°`}
      style={{ fontSize: 24, verticalAlign: 'middle' }}
    />
  );
}