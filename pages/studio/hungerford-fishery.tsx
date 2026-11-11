import StudioLayout from '@/components/studio/StudioLayout';
import Body from '@/components/studio/content/Hungerford';

export default function StudioHungerfordPage() {
  return (
    <StudioLayout
      title="Hungerford Fishery"
      description="A members' app built for the Town and Manor of Hungerford fishery on the Kennet: conditions, beats, rules, flies, catch returns and a back office."
      path="/studio/hungerford-fishery"
    >
      <Body />
    </StudioLayout>
  );
}
