import { NextRequest, NextResponse } from "next/server";
import { getStoredQrs, addStoredQr } from "@/lib/generalizedQrStore";

// ponytail: Generalized QR hub endpoint with upstream proxy and high-availability fallback
export async function GET(req: NextRequest) {
  const upstream = (process.env.API_UPSTREAM_URL || "https://cafe-piza-api.onrender.com").replace(/\/$/, "");
  const authHeader = req.headers.get("authorization");

  // 1. Try upstream backend directly
  try {
    const headers: Record<string, string> = {};
    if (authHeader) headers["Authorization"] = authHeader;

    const upRes = await fetch(`${upstream}/api/v1/tables/qr/generalized`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (upRes.ok) {
      const data = await upRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fall through to fallback
  }

  // 2. Fallback: If upstream does not have the new route yet, check table 1's active QR on upstream
  try {
    if (authHeader) {
      const t1Res = await fetch(`${upstream}/api/v1/tables/1/qr`, {
        method: "GET",
        headers: { Authorization: authHeader },
        cache: "no-store",
      });
      if (t1Res.ok) {
        const t1Data = await t1Res.json();
        if (t1Data?.qr_token) {
          const list = getStoredQrs();
          const exists = list.some((item) => item.qr_token === t1Data.qr_token);
          if (!exists) {
            addStoredQr(t1Data.qr_token, "Generalized Table QR (Table 1 Synced)");
          }
        }
      }
    }
  } catch {
    // Continue with stored list
  }

  const list = getStoredQrs();
  const activeQr = list.find((item) => item.is_active) || (list.length > 0 ? list[0] : null);

  return NextResponse.json({
    active_qr: activeQr,
    all_qrs: list,
  });
}
