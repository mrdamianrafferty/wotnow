import StudioLayout from '@/components/studio/StudioLayout';
import { caseStudyJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/RiseDaisy';

export default function StudioRiseDaisyPage() {
  return (
    <StudioLayout
      title="Rise Daisy: river levels and hatch forecasts app"
      description="How Rise Daisy treats a river as something you calculate: river gauges in 35 countries, hatch forecasts and the right fly, for 2,300+ venues."
      path="/studio/rise-daisy"
      image="/studio/og/rise-daisy.png"
      jsonLd={caseStudyJsonLd('rise-daisy')}
    >
      <Body />
    </StudioLayout>
  );
}
