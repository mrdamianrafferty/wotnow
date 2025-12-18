import Head from 'next/head';
import { LanguageSelector } from '../components/LanguageSelector';
import AppHeader from '../components/AppHeader';
import Footer from '../components/footer';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings - Go Daisy</title>
      </Head>
      <AppHeader />
      <main className="min-h-screen bg-base-100 text-base-content safe-top pt-4">
        <div className="max-w-2xl mx-auto px-4 pb-12">
          <h1 className="text-2xl font-semibold mb-6">Settings</h1>

          {/* Language preference (Go Daisy Beta) */}
          <section className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title flex items-center gap-2">Language <span className="badge badge-warning text-xs">Beta</span></h2>
              <p className="text-sm opacity-70 mb-3">Change your preferred language for <b>Go Daisy</b>. This feature is in <b>Beta</b> and may not be fully translated yet.</p>
              <div className="max-w-xs">
                <LanguageSelector showLabel className="w-full" />
                <p className="text-xs opacity-60 mt-2">Your choice is saved locally and synced when signed in. (Go Daisy only)</p>
              </div>
            </div>
          </section>

          <div className="alert bg-base-200 border border-base-300">
            <span>Your changes are saved on this device. Log in to sync across devices.</span>
            <Link href="/login" className="btn btn-primary btn-sm ml-auto">Log in</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
