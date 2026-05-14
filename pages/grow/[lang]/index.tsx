import type { GetServerSideProps } from 'next';
import { isValidGrowLang } from '@/lib/grow/i18n';

// /grow/[lang] — redirect to the English homepage.
// This stub keeps the route valid for AASA and middleware purposes.
// A full localised homepage will be built in a later iteration.
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { lang } = ctx.params as { lang: string };
  if (!isValidGrowLang(lang) || lang === 'en') {
    return { notFound: true };
  }
  return { redirect: { destination: '/grow', permanent: false } };
};

export default function GrowLangIndex() {
  return null;
}
