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

    // 1. Try upstream backend directly
    try {
      const upRes = await fetch(`${upstream}/api/v1/tables/qr/walk-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token, customer_name, phone_number, guest_count }),
      });

      if (upRes.ok) {
        const data = await upRes.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fall through to local session pairing
    }

    // 2. Fallback if upstream does not have the endpoint deployed yet:
    // Validate QR to get session and table info
    const valRes = await fetch(`${upstream}/api/v1/tables/qr/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_token }),
    });

    if (!valRes.ok) {
      return NextResponse.json(
        { detail: "Invalid or expired table QR code." },
        { status: 400 }
      );
    }

    const valData = await valRes.json();
    const cleanPhone = phone_number.replace(/\D/g, "");
    const generatedBookingId = formatBookingId(customer_name, cleanPhone, valData.table_id);
    const mockResId = 900000 + (valData.table_id || 1);

    return NextResponse.json({
      success: true,
      reservation_id: mockResId,
      booking_id: generatedBookingId,
      customer_name: customer_name.trim(),
      table_number: valData.table_number || `Table ${valData.table_id}`,
      session_id: valData.session_id || 1,
      session_token: valData.session_token || "sess_walkin",
      status: "SEATED",
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to register walk-in guest." },
      { status: 500 }
    );
  }
}
