import StudioLayout from '@/components/studio/StudioLayout';
import Body from '@/components/studio/content/Grewp';

export default function StudioGrewpPage() {
  return (
    <StudioLayout
      title="Grewp"
      description="How Grewp finds you something to do, helps you go with people, and runs tickets and federations for the groups that put things on."
      path="/studio/grewp"
    >
      <Body />
    </StudioLayout>
  );
}
