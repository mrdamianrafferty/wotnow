/**
 * The endpoint may not drop an activity without saying so.
 *
 * It capped the list at eight with `.slice(0, 8)` — ask for nine and the ninth
 * came back missing, with a 200 and nothing in the payload to mark it. Rise
 * Daisy hit it at Rutland, which asks for ten: birdwatching vanished from the
 * board of one of Britain's best-known birdwatching reservoirs.
 *
 * The consumer's workaround was to split into batches of eight, and each batch
 * fetches its own forecast — so one shelf could show sailing at "Force 3"
 * beside dog walking at "Force 4" on the same water in the same hour. A silent
 * cap does not stay silent; it just surfaces somewhere further away.
 */
import handler from '../pages/api/godaisy/activity-conditions';

type Res = { statusCode: number; body: unknown };
function invoke(activities: string[]): Promise<Res> {
  return new Promise((resolve) => {
    const res: any = {
      statusCode: 200,
      setHeader() { return res; },
      status(code: number) { res.statusCode = code; return res; },
      json(body: unknown) { resolve({ statusCode: res.statusCode, body }); return res; },
      end() { resolve({ statusCode: res.statusCode, body: null }); return res; },
    };
    const req: any = {
      method: 'GET',
      /* The route reads `headers.origin` for CORS before it validates anything,
         so a mock without headers dies before reaching the code under test. */
      headers: { origin: 'https://example.test' },
      query: { lat: '52.65', lon: '-0.63', activities: activities.join(',') },
    };
    void handler(req, res);
  });
}

describe('activity-conditions never truncates in silence', () => {
  it('refuses a list past the limit rather than shortening it', async () => {
    /* Built by repeating one known-good id rather than taking a slice of the
       catalogue: the intent is "one past the limit", and a slice makes that
       depend on how many activities the library happens to hold and in what
       order. It held 118 when this was written, which is not a fact this test
       should rely on. */
    const tooMany = Array.from({ length: 33 }, () => 'hiking');
    const r = await invoke(tooMany);
    expect(r.statusCode).toBe(400);
    expect(String((r.body as any).error)).toMatch(/limit/i);
  });

  it('rejects an unknown id rather than skipping it', async () => {
    const r = await invoke(['hiking', 'not_a_real_activity']);
    expect(r.statusCode).toBe(400);
    expect(String((r.body as any).error)).toMatch(/not_a_real_activity/);
  });
});
