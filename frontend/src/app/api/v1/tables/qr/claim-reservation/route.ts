import { NextRequest, NextResponse } from "next/server";

// ponytail: Claim reservation proxy with upstream proxy and high-availability fallback
export async function POST(req: NextRequest) {
  const upstream = (process.env.API_UPSTREAM_URL || "https://cafe-piza-api.onrender.com").replace(/\/$/, "");

  try {
    const body = await req.json();
    const { qr_token, session_token, reservation_code } = body;

    if (!reservation_code?.trim()) {
      return NextResponse.json(
        { detail: "Please provide your reservation ID or phone number." },
        { status: 400 }
      );
    }

    // ponytail: direct upstream proxy without fake reservation fallbacks
    const upRes = await fetch(`${upstream}/api/v1/tables/qr/claim-reservation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_token, session_token, reservation_code }),
    });

    const data = await upRes.json().catch(() => ({ detail: "Invalid response from upstream." }));
    return NextResponse.json(data, { status: upRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to link reservation." },
      { status: 500 }
    );
  }
}
