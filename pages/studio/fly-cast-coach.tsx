import StudioLayout from '@/components/studio/StudioLayout';
import { caseStudyJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/FlyCastCoach';

export default function StudioFlyCastCoachPage() {
  return (
    <StudioLayout
      title="Fly Cast Coach: fly casting practice app"
      description="How Fly Cast Coach turns a phone, and an Apple Watch, into a practice fly rod that coaches by sound and touch."
      path="/studio/fly-cast-coach"
      jsonLd={caseStudyJsonLd('fly-cast-coach')}
    >
      <Body />
    </StudioLayout>
  );
}
