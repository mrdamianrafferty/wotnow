import { GetServerSideProps } from 'next';

// Redirect /grow/species to /grow/garden
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/grow/garden',
      permanent: false,
    },
  };
};

export default function SpeciesIndex() {
  // This component will never render due to the redirect
  return null;
}
