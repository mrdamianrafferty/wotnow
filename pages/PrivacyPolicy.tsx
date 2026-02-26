import { GetServerSideProps } from 'next';

/**
 * Deprecated: This page has been consolidated into /privacy.
 * Redirects all traffic to the canonical privacy policy page.
 */
export default function PrivacyPolicyRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/privacy',
      permanent: true,
    },
  };
};
