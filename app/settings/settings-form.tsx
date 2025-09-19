'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase/client';

// JSON-like type for preferences
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type Profile = {
  name: string | null;
  email: string | null;
  home_lat: number | null;
  home_lon: number | null;
  coast_lat: number | null;
  coast_lon: number | null;
  activities: string[] | null;
  preferences_json: { [key: string]: Json } | null;
};

type SettingsFormProps = { initial: Profile | null };

export default function SettingsForm({ initial }: SettingsFormProps) {
  const [p, setP] = useState<Profile>(initial ?? {
    name: '', email: null, home_lat: null, home_lon: null, coast_lat: null, coast_lon: null, activities: [], preferences_json: {}
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true); setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const payload = {
      name: p.name,
      home_lat: p.home_lat, home_lon: p.home_lon,
      coast_lat: p.coast_lat, coast_lon: p.coast_lon,
      activities: p.activities ?? [],
      preferences_json: { ...((p.preferences_json as object) || {}), lastUpdated: new Date().toISOString() },
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (error) setMsg(error.message); else setMsg('Saved ✓');
    setSaving(false);
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Your settings</h1>

      <label className="form-control">
        <span className="label-text">Name</span>
        <input className="input input-bordered" value={p.name ?? ''} onChange={e => setP({ ...p, name: e.target.value })} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="form-control">
          <span className="label-text">Home lat</span>
          <input className="input input-bordered" type="number" step="0.00001"
            value={p.home_lat ?? ''} onChange={e => setP({ ...p, home_lat: e.target.value ? Number(e.target.value) : null })}/>
        </label>
        <label className="form-control">
          <span className="label-text">Home lon</span>
          <input className="input input-bordered" type="number" step="0.00001"
            value={p.home_lon ?? ''} onChange={e => setP({ ...p, home_lon: e.target.value ? Number(e.target.value) : null })}/>
        </label>
        <label className="form-control">
          <span className="label-text">Coast lat</span>
          <input className="input input-bordered" type="number" step="0.00001"
            value={p.coast_lat ?? ''} onChange={e => setP({ ...p, coast_lat: e.target.value ? Number(e.target.value) : null })}/>
        </label>
        <label className="form-control">
          <span className="label-text">Coast lon</span>
          <input className="input input-bordered" type="number" step="0.00001"
            value={p.coast_lon ?? ''} onChange={e => setP({ ...p, coast_lon: e.target.value ? Number(e.target.value) : null })}/>
        </label>
      </div>

      <label className="form-control">
        <span className="label-text">Activities (comma-separated slugs)</span>
        <input className="input input-bordered"
          value={(p.activities ?? []).join(',')}
          onChange={e => setP({ ...p, activities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}/>
      </label>

      <div className="flex items-center gap-3">
        <button className={`btn btn-primary ${saving ? 'btn-disabled' : ''}`} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <span className="text-sm opacity-80">{msg}</span>}
      </div>
    </main>
  );
}