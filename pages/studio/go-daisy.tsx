import StudioLayout from '@/components/studio/StudioLayout';
import { caseStudyJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/GoDaisy';

export default function StudioGoDaisyPage() {
  return (
    <StudioLayout
      title="Go Daisy: weather-led activity planner"
      description="How Go Daisy's leisure engine turns the forecast into one honest sentence about what today is good for, across 118 activities."
      path="/studio/go-daisy"
      jsonLd={caseStudyJsonLd('go-daisy')}
    >
      <Body />
    </StudioLayout>
  );
}
