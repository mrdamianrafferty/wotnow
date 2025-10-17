import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import SettingsForm from './settings-form';
import AppHeader from '../../components/AppHeader';
import Footer from '../../components/footer';
import BottomNav from '../../components/BottomNav';

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

  return (
    <div data-theme="light" className="min-h-screen flex flex-col bg-base-100 text-base-content">
      <AppHeader />
      <div className="flex-1">
        <SettingsForm initial={data ?? null} />
      </div>
      <BottomNav />
      <Footer />
    </div>
  );
}