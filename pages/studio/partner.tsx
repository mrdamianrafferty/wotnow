import StudioLayout from '@/components/studio/StudioLayout';
import { pageJsonLd } from '@/components/studio/studioJsonLd';
import Body from '@/components/studio/content/Partner';

export default function StudioPartnerPage() {
  return (
    <StudioLayout
      title="Advertise to anglers and gardeners"
      description="Reach anglers, gardeners and people who go outside, beside the answer they came for. Ask for the Daisy Studio media kit."
      path="/studio/partner"
      image="/studio/og/partner.png"
      jsonLd={pageJsonLd('Partner with us', '/studio/partner')}
    >
      <Body />
    </StudioLayout>
  );
}
