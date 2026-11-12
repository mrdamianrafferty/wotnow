import StudioLayout from '@/components/studio/StudioLayout';
import { caseStudyJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/GrowDaisy';

export default function StudioGrowDaisyPage() {
  return (
    <StudioLayout
      title="Grow Daisy: weather-led garden planner"
      description="How Grow Daisy turns your forecast into the week's garden jobs, with guilds, plant identification and blight warnings from the weather."
      path="/studio/grow-daisy"
      image="/studio/og/grow-daisy.png"
      jsonLd={caseStudyJsonLd('grow-daisy')}
    >
      <Body />
    </StudioLayout>
  );
}
