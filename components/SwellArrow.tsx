export default function SwellArrow({ deg }: { deg: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      style={{ transform: `rotate(${deg}deg)` }}
      aria-label={`Wave direction ${Math.round(deg)}°`}
    >
      <path d="M12 2 L5 22 h14 Z" fill="currentColor" />
    </svg>
  );
}
