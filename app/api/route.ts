// app/api/iss-heartbeat/route.ts
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url = "http://api.open-notify.org/iss-now.json";
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: `Open Notify error ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (data?.message !== "success" || !data?.iss_position) {
      return Response.json(
        { ok: false, error: "Unexpected Open Notify response", raw: data },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      timestamp: data.timestamp,
      position: {
        lat: Number(data.iss_position.latitude),
        lon: Number(data.iss_position.longitude),
      },
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}