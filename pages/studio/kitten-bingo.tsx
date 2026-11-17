import StudioLayout from '@/components/studio/StudioLayout';
import { pageJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/KittenBingo';

export default function StudioKittenBingoPage() {
  return (
    <StudioLayout
      title="Kitten Bingo: cosy picture bingo game"
      description="Kitten Bingo, coming January 2027 to iPhone, iPad and Mac: cosy picture bingo in a Japanese neko café, where every win spoils one of 30 kittens."
      path="/studio/kitten-bingo"
      image="/studio/og/kitten-bingo.png"
      jsonLd={pageJsonLd('Kitten Bingo', '/studio/kitten-bingo')}
    >
      <Body />
    </StudioLayout>
  );
}
