// Booking ID = first 4 letters of the guest name + last 4 digits of the phone, e.g. PRIN5743.
// Mirrors Reservation.booking_id on the backend; prefer the API's booking_id and use this only as a fallback.
// Not unique by design: a repeat guest gets the same ID for every booking.
export function formatBookingId(name?: string | null, phone?: string | null, id?: number): string {
  const letters = (name || "").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
  const digits = (phone || "").replace(/\D/g, "").slice(-4);
  if (letters && digits) return `${letters}${digits}`;
  return id !== undefined ? `RES-${String(id).padStart(4, "0")}` : "";
}
