import StudioLayout from '@/components/studio/StudioLayout';
import { pageJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/KittenBingo';

export default function StudioKittenBingoPage() {
  return (
    <StudioLayout
      title="Kitten Bingo"
      description="Kitten Bingo, coming January 2027: cosy picture bingo in a Japanese neko caf\u00e9, where every win spoils a kitten."
      path="/studio/kitten-bingo"
      jsonLd={pageJsonLd('Kitten Bingo', '/studio/kitten-bingo')}
    >
      <Body />
    </StudioLayout>
  );
}
