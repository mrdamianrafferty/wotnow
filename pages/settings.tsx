import { GetServerSideProps } from 'next';

// Redirect /settings to /account (settings page was merged into account page)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/account',
      permanent: true,
    },
  };
};

export default function SettingsRedirect() {
  return null;
}
