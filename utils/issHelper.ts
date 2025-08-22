// issHelper.ts

interface IssPassData {
  ok: boolean;
  risetime: string;  // ISO date string (UTC)
  duration: number;  // seconds
  mag: number;       // brightness
  maxEl: number;     // max elevation in degrees
  sunset: string;
  nextSunrise: string;
}

function describeBrightness(magnitude: number): string {
  if (magnitude <= -2) return "extremely bright, brighter than most planets";
  if (magnitude <= -1) return "very bright, brighter than nearly all stars";
  if (magnitude <= 0) return "bright, like the brightest stars";
  if (magnitude <= 1) return "moderately bright, like an average star";
  return "pretty faint and harder to spot";
}

function describeElevation(degrees: number): string {
  if (degrees < 10) return "hugging the horizon";
  if (degrees < 30) return "fairly low in the sky";
  if (degrees < 50) return "about halfway up the sky";
  if (degrees < 70) return "quite high overhead";
  return "almost directly overhead";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0 && secs > 0) return `${mins} minute${mins > 1 ? "s" : ""} ${secs} seconds`;
  if (mins > 0) return `${mins} minute${mins > 1 ? "s" : ""}`;
  return `${secs} second${secs > 1 ? "s" : ""}`;
}

export function describeIssPass(data: IssPassData): string {
  if (!data.ok) return "No ISS pass available.";

  // Convert risetime (UTC) into local time
  const date = new Date(data.risetime);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `At ${timeStr}, the ISS will be visible for about ${formatDuration(data.duration)}. 
It will appear ${describeBrightness(data.mag)} and reach a maximum height ${describeElevation(data.maxEl)}.`;
}

// Example usage:
const rawData: IssPassData = {
  ok: true,
  risetime: "2025-08-23T02:52:00.000Z",
  duration: 320,
  mag: -0.1,
  maxEl: 16.1,
  sunset: "2025-08-22T19:10:29.000Z",
  nextSunrise: "2025-08-23T04:57:35.000Z"
};

console.log(describeIssPass(rawData));
