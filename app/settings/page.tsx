import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import SettingsForm from './settings-form';

export default async function SettingsPage() {
  const supabase = await createClient(); // await the Promise

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return <SettingsForm initial={data ?? null} />;
}