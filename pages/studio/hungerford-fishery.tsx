import StudioLayout from '@/components/studio/StudioLayout';
import { caseStudyJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/Hungerford';

export default function StudioHungerfordPage() {
  return (
    <StudioLayout
      title="Hungerford Fishery members' app: a case study"
      description="A members' app built for the Town and Manor of Hungerford fishery on the Kennet: conditions, beats, rules, flies, catch returns and a back office."
      path="/studio/hungerford-fishery"
      image="/studio/og/hungerford-fishery.png"
      jsonLd={caseStudyJsonLd('hungerford-fishery')}
    >
      <Body />
    </StudioLayout>
  );
}
