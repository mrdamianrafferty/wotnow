import Head from 'next/head';
import Link from 'next/link';

export default function Grow404() {
  return (
    <>
      <Head>
        <title>404 - Lost in the Jungle | Grow Daisy</title>
        <meta name="description" content="Oops! This vine leads nowhere. Head back to your Grow Daisy garden." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-base-200 via-base-100 to-base-200 flex items-center justify-center px-4 py-10">
        <div className="card w-full max-w-3xl bg-base-100 shadow-xl border border-base-300">
          <div className="card-body text-center gap-6">
            <div className="flex flex-wrap items-center justify-center gap-2 text-2xl" aria-hidden="true">
              <span>🌿</span>
              <span>🪴</span>
              <span>🌺</span>
              <span>🌴</span>
              <span>🍄</span>
              <span>🦋</span>
            </div>

            <div>
              <div className="badge badge-success badge-lg mb-4">Grow Daisy Jungle Alert</div>
              <h1 className="text-7xl md:text-8xl font-black text-success leading-none">404</h1>
              <h2 className="text-3xl md:text-4xl font-bold mt-3">You took a wrong turn at Monstera Falls</h2>
              <p className="text-lg text-base-content/70 mt-4 max-w-2xl mx-auto">
                This trail is all vines and no page. A mischievous fern probably moved it while you were looking at tomatoes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-2xl mx-auto w-full">
              <div className="badge badge-outline badge-lg h-auto py-3 justify-center">🌱 No page found</div>
              <div className="badge badge-outline badge-lg h-auto py-3 justify-center">🧭 Navigation repotted</div>
              <div className="badge badge-outline badge-lg h-auto py-3 justify-center">🌸 Fun levels blooming</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/grow" className="btn btn-success btn-lg">
                Back to Garden HQ
              </Link>
              <Link href="/grow/plan" className="btn btn-outline btn-lg">
                Open My Plan
              </Link>
              <Link href="/grow/weather" className="btn btn-outline btn-lg">
                Check Garden Weather
              </Link>
            </div>

            <p className="text-sm text-base-content/60">
              Still stuck in the undergrowth?{' '}
              <a href="mailto:hello@godaisy.io" className="link link-success">
                Call the plant rescue team
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
