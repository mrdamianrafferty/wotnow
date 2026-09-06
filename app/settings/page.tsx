import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import SettingsForm from './settings-form';
import { PageHeader } from '../../components/call/PageHeader';
import Footer from '../../components/footer';

// Disable static generation for auth-protected page
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient(); // await the Promise

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  /*
   * THE CHROME IS THE NEW ONE; THE FORM INSIDE IS NOT, YET.
   *
   * `/settings` is linked from nothing and mostly duplicates `/account` — but
   * not entirely: it is the only place a signed-in person can change their
   * password, and password auth is live. So it cannot be archived the way
   * `/interests` was; it is a 1,097-line form somebody has to sit down with,
   * not something to fold into a header swap.
   *
   * What could go went: `AppHeader`, and a `BottomNav` for a tab bar this app
   * no longer has. Those were the last two references keeping either component
   * alive outside Grow Daisy.
   */
  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title="Settings" />
      <div className="flex-1">
        <SettingsForm initial={data ?? null} />
      </div>
      <Footer />
    </div>
  );
}