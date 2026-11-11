/**
 * The commissioner enquiry form on /studio/build: five fields, no budget.
 * Posts to /api/studio/brief, which emails hello@godaisy.io.
 */
import { useState, type FormEvent } from 'react';

type State = 'idle' | 'sending' | 'sent' | 'error';

export default function BriefForm() {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/studio/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'send_failed');
      }
      setState('sent');
    } catch (err) {
      setState('error');
      setError(err instanceof Error && err.message !== 'send_failed' ? err.message : '');
    }
  }

  if (state === 'sent') {
    return (
      <div className="ds-form" role="status" style={{ flex: '1 1 460px', minWidth: 0, maxWidth: 560 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 26, lineHeight: '34px' }}>Thanks, your brief is with us.</p>
        <p style={{ margin: 0, fontSize: 16, lineHeight: '24px', color: 'var(--ink-2)' }}>
          We read every brief ourselves, and we&apos;ll reply from hello@godaisy.io.
        </p>
      </div>
    );
  }

  return (
    <form className="ds-form" style={{ flex: '1 1 460px', minWidth: 0, maxWidth: 560 }} onSubmit={onSubmit} noValidate={false}>
      <div className="ds-field">
        <label htmlFor="b-name">Your name</label>
        <input id="b-name" name="name" autoComplete="name" required maxLength={120} />
      </div>
      <div className="ds-field">
        <label htmlFor="b-email">Email</label>
        <input id="b-email" name="email" type="email" autoComplete="email" required maxLength={200} />
      </div>
      <div className="ds-field">
        <label htmlFor="b-org">
          Organisation <span className="ds-help">(optional)</span>
        </label>
        <input id="b-org" name="organisation" autoComplete="organization" maxLength={200} />
      </div>
      <div className="ds-field">
        <label htmlFor="b-need">What do you need?</label>
        <textarea id="b-need" name="need" aria-describedby="b-need-help" required maxLength={5000} />
        <span className="ds-help" id="b-need-help">
          Who it&apos;s for and what it should do for them.
        </span>
      </div>
      <div className="ds-field">
        <label htmlFor="b-when">When do you need it?</label>
        <select id="b-when" name="when" defaultValue="No fixed date">
          <option>No fixed date</option>
          <option>Within 3 months</option>
          <option>Within 6 months</option>
          <option>Later this year</option>
        </select>
      </div>
      <div className="ds-hp" aria-hidden="true">
        <label htmlFor="b-hp">Leave this empty</label>
        <input id="b-hp" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state === 'error' && (
        <p role="alert" style={{ margin: 0, fontSize: 15, lineHeight: '22px', color: 'var(--poor-ink, #9b2c2c)' }}>
          {error || "We couldn't send that. Please try again, or email hello@godaisy.io."}
        </p>
      )}
      <div>
        <button className="ds-btn ds-btn--primary" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send your brief'}
        </button>
      </div>
      <p className="ds-form__promise">We only use your details to answer you.</p>
    </form>
  );
}
