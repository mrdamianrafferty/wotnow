import StudioLayout from '@/components/studio/StudioLayout';
import Body from '@/components/studio/content/Hub';

export default function StudioHubPage() {
  return (
    <StudioLayout
      title="Daisy Studio"
      description="Daisy Studio builds apps that read rivers, seas, skies and gardens, and say plainly what they mean. Seven apps live, one built for a client."
      path="/studio"
    >
      <Body />
    </StudioLayout>
  );
}
