import AstronomyCard from "../components/AstronomyCard";
import { IssCard } from "../components/IssCard";

// Example: get user's home location from context, state, or props
const userHomeLocation = { lat: 51.5074, lon: -0.1278 }; // London

export default function HomeLocationDemo() {
  return (
    <main>
      <h1>Tonight’s sky</h1>
      {/* Always show AstronomyCard, even if no user preferences/context */}
      <AstronomyCard className="always-show" />
      <IssCard lat={userHomeLocation.lat} lon={userHomeLocation.lon} />
    </main>
  );
}
