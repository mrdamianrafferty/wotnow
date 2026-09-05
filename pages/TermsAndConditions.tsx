import type { GetServerSideProps } from 'next';

/**
 * Deprecated: consolidated into /terms.
 *
 * There were two of these — this one and /terms — with separately maintained
 * text, and the footer linked to this one while /terms carried the newer copy and
 * a "last updated" date. Two live legal pages saying different things is a
 * problem for a reader and a worse one for an App Store review, which asks
 * which URL is the policy.
 *
 * Lowercase wins because that is the direction the site had already taken:
 * /PrivacyPolicy has 301'd to /privacy for some time, and this follows it
 * rather than becoming a third opinion.
 *
 * A 301 rather than a delete, because these paths may be indexed and are
 * linked from the footer of every page the old design still serves.
 */
export default function TermsAndConditionsRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/terms', permanent: true },
});
