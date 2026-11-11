import StudioLayout from '@/components/studio/StudioLayout';
import { hubJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/Hub';

export default function StudioHubPage() {
  return (
    <StudioLayout
      title="Daisy Studio"
      description="Daisy Studio builds apps for fishing clubs, fisheries and outdoor organisations, and apps that read rivers, seas, skies and gardens. Seven apps live."
      path="/studio"
      jsonLd={hubJsonLd()}
    >
      <Body />
    </StudioLayout>
  );
}
