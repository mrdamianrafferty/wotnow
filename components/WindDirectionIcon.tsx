import 'weather-icons/css/weather-icons.min.css';

export default function WindDirectionIcon({ deg }: { deg: number }) {
  // Round to nearest 10 for icon class
  const rounded = Math.round(deg / 10) * 10;
  const iconClass = `wi wi-wind wi-from-deg-${rounded}`;

  return (
    <i
      className={iconClass}
      title={`Wind from ${deg}°`}
      style={{ fontSize: 24, verticalAlign: 'middle' }}
    />
  );
}