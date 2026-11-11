import StudioLayout from '@/components/studio/StudioLayout';
import Body from '@/components/studio/content/Build';

export default function StudioBuildPage() {
  return (
    <StudioLayout
      title="Build your app"
      description="Your own app, built by people who ship them: club, fishery, outdoor and data-driven apps for web, iPhone and Android. Send us your brief."
      path="/studio/build"
    >
      <Body />
    </StudioLayout>
  );
}
