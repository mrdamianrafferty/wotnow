import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await fetch("http://api.open-notify.org/iss-now.json", { cache: "no-store" });
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Open Notify error ${r.status}` });

    const data = await r.json();
    if (data?.message !== "success" || !data?.iss_position) {
      return res.status(502).json({ ok: false, error: "Unexpected Open Notify response", raw: data });
    }

    res.status(200).json({
      ok: true,
      timestamp: data.timestamp,
      position: {
        lat: Number(data.iss_position.latitude),
        lon: Number(data.iss_position.longitude),
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
}