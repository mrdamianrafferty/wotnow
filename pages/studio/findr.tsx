import StudioLayout from '@/components/studio/StudioLayout';
import { caseStudyJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/Findr';

export default function StudioFindrPage() {
  return (
    <StudioLayout
      title="Findr: sea fishing forecast app"
      description="How Findr reads the sea from satellites, buoys, weather feeds and catch reports to say which fish are likely feeding on your coast today."
      path="/studio/findr"
      jsonLd={caseStudyJsonLd('findr')}
    >
      <Body />
    </StudioLayout>
  );
}
