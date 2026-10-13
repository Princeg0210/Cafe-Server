// ponytail: Lightweight server-side store & fallback for Generalized QR codes
// Ensures high-availability even when upstream backend deployment is delayed

export interface GeneralizedQRRecord {
  id: number;
  qr_token: string;
  is_active: boolean;
  created_at: string;
  notes?: string;
}

// Global in-memory cache shared across route invocations in serverless warm instance
declare global {
  // eslint-disable-next-line no-var
  var __generalized_qrs: GeneralizedQRRecord[] | undefined;
}

const DEFAULT_SEED_TOKEN = "qr_sec_b7ba9c59d35e4074a30034abb48ee0a9";

export function getStoredQrs(): GeneralizedQRRecord[] {
  if (!global.__generalized_qrs || global.__generalized_qrs.length === 0) {
    global.__generalized_qrs = [
      {
        id: 1,
        qr_token: DEFAULT_SEED_TOKEN,
        is_active: true,
        created_at: new Date().toISOString(),
        notes: "Generalized Dining Hub (Primary)",
      },
    ];
  }
  return global.__generalized_qrs;
}

export function addStoredQr(token: string, notes = "Generalized Dining"): GeneralizedQRRecord {
  const list = getStoredQrs();
  // Multiple QR codes can remain active simultaneously
  const nextId = Date.now() + Math.floor(Math.random() * 1000);
  const newRecord: GeneralizedQRRecord = {
    id: nextId,
    qr_token: token,
    is_active: true,
    created_at: new Date().toISOString(),
    notes,
  };

  list.unshift(newRecord);
  global.__generalized_qrs = list;
  return newRecord;
}

export function toggleStoredQrStatus(identifier: string | number, isActive: boolean): GeneralizedQRRecord | null {
  const list = getStoredQrs();
  const found = list.find((item) =>
    typeof identifier === "number" ? item.id === identifier : item.qr_token === identifier
  );
  if (found) {
    found.is_active = isActive;
    return found;
  }
  return null;
}

export function deleteStoredQr(identifier: string | number): boolean {
  const list = getStoredQrs();
  const index = list.findIndex((item) =>
    typeof identifier === "number" ? item.id === identifier : item.qr_token === identifier
  );
  if (index !== -1) {
    list.splice(index, 1);
    global.__generalized_qrs = list;
    return true;
  }
  return false;
}
