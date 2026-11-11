import StudioLayout from '@/components/studio/StudioLayout';
import Body from '@/components/studio/content/GrowDaisy';

export default function StudioGrowDaisyPage() {
  return (
    <StudioLayout
      title="Grow Daisy"
      description="How Grow Daisy turns your forecast into the week's garden jobs, with guilds, plant identification and blight warnings from the weather."
      path="/studio/grow-daisy"
    >
      <Body />
    </StudioLayout>
  );
}
