import StudioLayout from '@/components/studio/StudioLayout';
import { buildJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/Build';

export default function StudioBuildPage() {
  return (
    <StudioLayout
      title="Fishing club and fishery app development"
      description="Your own app for a fishing club, fishery or angling association, built by people who ship them: web, iPhone and Android from one codebase. Send your brief."
      path="/studio/build"
      jsonLd={buildJsonLd()}
    >
      <Body />
    </StudioLayout>
  );
}
