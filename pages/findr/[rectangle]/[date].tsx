import React from 'react';
import { GetServerSideProps } from 'next';
import SEO from '../../../components/SEO';
import { useRouter } from 'next/router';

interface Props {
  rectangle: string;
  date: string;
}

const RectangleDatePage: React.FC<Props> = ({ rectangle, date }) => {
  return (
    <>
      <SEO
        title={`Findr — ${rectangle} on ${date}`}
        description={`Fishing predictions for rectangle ${rectangle} on ${date}. View bite scores, species recommendations and timing tips.`}
        url={`https://fishfindr.eu/findr/${rectangle}/${date}`}
      />
      <main className="min-h-screen bg-base-200 p-6">
        <h1 className="text-2xl font-bold">{`Predictions for ${rectangle} — ${date}`}</h1>
        <p className="mt-3 text-base-content/80">This is a lightweight route skeleton for per-rectangle daily predictions. The full Findr deck will include species cards, bite scores, and local tide guidance.</p>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { rectangle, date } = context.params ?? {};
  if (!rectangle || !date || typeof rectangle !== 'string' || typeof date !== 'string') {
    return { notFound: true };
  }

  // Basic validation: date should be YYYY-MM-DD
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!dateMatch) {
    return { notFound: true };
  }

  return {
    props: {
      rectangle,
      date,
    },
  };
};

export default RectangleDatePage;
