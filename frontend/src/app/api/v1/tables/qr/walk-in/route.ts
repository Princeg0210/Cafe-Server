import { NextRequest, NextResponse } from "next/server";
import { formatBookingId } from "@/lib/bookingId";

// ponytail: direct walk-in registration proxy with graceful fallback
export async function POST(req: NextRequest) {
  const upstream = (process.env.API_UPSTREAM_URL || "https://cafe-piza-api.onrender.com").replace(/\/$/, "");

  try {
    const body = await req.json();
    const { qr_token, customer_name, phone_number, guest_count } = body;

    if (!customer_name?.trim() || !phone_number?.trim()) {
      return NextResponse.json(
        { detail: "Please provide both your name and phone number." },
        { status: 400 }
      );
    }

    // ponytail: direct upstream proxy without fake fallback states
    const upRes = await fetch(`${upstream}/api/v1/tables/qr/walk-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_token, customer_name, phone_number, guest_count }),
    });

    const data = await upRes.json().catch(() => ({ detail: "Invalid response from upstream." }));
    return NextResponse.json(data, { status: upRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to register walk-in guest." },
      { status: 500 }
    );
  }
}
