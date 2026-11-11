import StudioLayout from '@/components/studio/StudioLayout';
import Body from '@/components/studio/content/FlyCastCoach';

export default function StudioFlyCastCoachPage() {
  return (
    <StudioLayout
      title="Fly Cast Coach"
      description="How Fly Cast Coach turns a phone, and an Apple Watch, into a practice fly rod that coaches by sound and touch."
      path="/studio/fly-cast-coach"
    >
      <Body />
    </StudioLayout>
  );
}
