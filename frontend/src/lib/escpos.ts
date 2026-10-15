// KOT ticket as raw ESC/POS bytes, for thermal printers that have no Windows/Mac driver
// (most Bluetooth / USB receipt printers). Sent straight to the printer over Web Serial.

export type EscPosKot = {
  kotNumber: string;
  tableLine: string; // e.g. "Ground floor - TABLE 3"
  time: string;
  orderNumber?: string | null;
  allergyInfo?: string | null;
  items: { name: string; quantity: number; special_instructions?: string | null }[];
};

const ESC = 0x1b;
const GS = 0x1d;
const INIT = [ESC, 0x40];
const ALIGN_LEFT = [ESC, 0x61, 0];
const ALIGN_CENTER = [ESC, 0x61, 1];
const NORMAL = [ESC, 0x21, 0x00];
const BOLD_TALL = [ESC, 0x21, 0x18]; // emphasised + double height (same width, so wrapping stays simple)
const BIG = [ESC, 0x21, 0x38]; // emphasised + double height + double width
const CUT = [GS, 0x56, 66, 0]; // feed and partial cut; printers without a cutter ignore it

// Printers use a basic code page: keep text to plain ASCII
export function toPrinterText(s: string): string {
  return s
    .replace(/₹/g, "Rs")
    .replace(/×/g, "x")
    .replace(/[»›]/g, ">")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/·/g, "-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      for (let w = word; w.length; w = w.slice(width)) {
        const piece = w.slice(0, width);
        if (!line) line = piece;
        else if (line.length + 1 + piece.length <= width) line += " " + piece;
        else {
          lines.push(line);
          line = piece;
        }
      }
    }
    lines.push(line);
  }
  return lines;
}

export function kotTicketEscPos(t: EscPosKot, paperMm: 58 | 80): Uint8Array {
  const width = paperMm >= 80 ? 48 : 32; // characters per line in the normal font
  const out: number[] = [];
  const cmd = (c: number[]) => out.push(...c);
  const text = (s: string) => {
    for (const ch of toPrinterText(s)) out.push(ch.charCodeAt(0));
  };
  const line = (s = "") => text(s + "\n");
  const rule = () => line("-".repeat(width));

  cmd(INIT);
  cmd(ALIGN_CENTER);
  cmd(NORMAL);
  line("JAADOO - KITCHEN ORDER");
  cmd(BIG);
  line(t.kotNumber);
  cmd(BOLD_TALL);
  wrap(t.tableLine.toUpperCase(), width).forEach((l) => line(l));
  cmd(NORMAL);
  line(t.orderNumber ? `${t.time} - ${t.orderNumber}` : t.time);

  if (t.allergyInfo) {
    cmd(BOLD_TALL);
    line("!! ALLERGY / DIETARY !!");
    wrap(t.allergyInfo.toUpperCase(), width).forEach((l) => line(l));
    cmd(NORMAL);
  }

  rule();
  cmd(ALIGN_LEFT);
  for (const it of t.items) {
    cmd(BOLD_TALL);
    const qty = `${it.quantity} x `;
    wrap(it.name, width - qty.length).forEach((l, i) => line((i === 0 ? qty : " ".repeat(qty.length)) + l));
    cmd(NORMAL);
    if (it.special_instructions) {
      wrap(`> ${it.special_instructions}`, width - qty.length).forEach((l) => line(" ".repeat(qty.length) + l));
    }
  }
  cmd(ALIGN_CENTER);
  rule();
  line(`${t.items.reduce((n, it) => n + Number(it.quantity || 0), 0)} item(s)`);
  line();
  line();
  line();
  if (paperMm >= 80) cmd(CUT);
  return Uint8Array.from(out);
}

// ---------------------------------------------------------------------------
// Customer bill
// ---------------------------------------------------------------------------
export type EscPosBill = {
  header: string[]; // first line printed large
  info: [string, string][]; // left / right pairs, e.g. ["Table: T3", "Floor: Ground"]
  allergyInfo?: string | null;
  items: { name: string; quantity: number; rate: number; amount: number; note?: string | null }[];
  totals: { label: string; value: number; bold?: boolean }[];
  netDue: number;
  footer: string[];
};

export const money = (n: number) => `Rs ${n.toFixed(2)}`;

// Left text and right text on one line, padded to the paper width
export function twoCols(left: string, right: string, width: number): string {
  const r = toPrinterText(right);
  const l = toPrinterText(left).slice(0, Math.max(0, width - r.length - 1));
  return l + " ".repeat(Math.max(1, width - l.length - r.length)) + r;
}

export function billEscPos(b: EscPosBill, paperMm: 58 | 80): Uint8Array {
  const width = paperMm >= 80 ? 48 : 32;
  const out: number[] = [];
  const cmd = (c: number[]) => out.push(...c);
  const line = (s = "") => {
    for (const ch of toPrinterText(s) + "\n") out.push(ch.charCodeAt(0));
  };
  const rule = (ch = "-") => line(ch.repeat(width));

  cmd(INIT);
  cmd(ALIGN_CENTER);
  b.header.forEach((h, i) => {
    cmd(i === 0 ? BOLD_TALL : NORMAL);
    wrap(h, width).forEach((l) => line(l));
  });
  cmd(NORMAL);
  cmd(ALIGN_LEFT);
  rule();
  b.info.forEach(([l, r]) => line(twoCols(l, r, width)));
  if (b.allergyInfo) {
    cmd(BOLD_TALL);
    wrap(`ALLERGY: ${b.allergyInfo}`, width).forEach((l) => line(l));
    cmd(NORMAL);
  }
  rule();
  for (const it of b.items) {
    wrap(it.name, width).forEach((l) => line(l));
    line(twoCols(`  ${it.quantity} x ${it.rate.toFixed(2)}`, it.amount.toFixed(2), width));
    if (it.note) wrap(`  * ${it.note}`, width).forEach((l) => line(l));
  }
  rule();
  for (const t of b.totals) {
    if (t.bold) cmd([ESC, 0x45, 1]);
    line(twoCols(t.label, (t.value < 0 ? "-" : "") + money(Math.abs(t.value)), width));
    if (t.bold) cmd([ESC, 0x45, 0]);
  }
  rule("=");
  cmd(BOLD_TALL);
  line(twoCols("NET DUE", money(b.netDue), width));
  cmd(NORMAL);
  rule("=");
  cmd(ALIGN_CENTER);
  b.footer.forEach((f) => wrap(f, width).forEach((l) => line(l)));
  line();
  line();
  line();
  if (paperMm >= 80) cmd(CUT);
  return Uint8Array.from(out);
}
