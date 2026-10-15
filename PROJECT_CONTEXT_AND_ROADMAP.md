# JAADOO Pizza Project — Comprehensive Project Context & Feature Blueprint

> **Location:** 32 Sitaphal ki gali, Udaipur, Rajasthan  
> **Concept:** Artisanal Neapolitan Pizzeria & Specialty Cafe  
> **System Architecture:** Unified Custom Operational Platform (POS, KDS, Dynamic QR, Reservations, Admin Ledger)  
> **Design Philosophy:** Ground-Tested, Zero-Bloat, Minimal Friction, Built specifically for Udaipur's Heritage Cafe Reality  

---

## 1. Executive Overview & Physical Context

The **JAADOO Pizza Project** is a boutique dining destination located in the heritage heart of Udaipur (*Sitaphal ki gali*). Unlike generic restaurant chains or shopping mall food courts, Jaadoo Cafe operates in a unique architectural environment featuring multiple dining zones:
- **Ground Floor Dining & Counter**
- **Open-Air Heritage Courtyard**
- **First Floor Seating**
- **Terrace Lounge**

### Why Mass-Market SaaS (Petpooja / AirMenu) Fails Here:
1. **Never Visited On-Ground:** Corporate SaaS solutions build one-size-fits-all software from corporate offices. They don't know the physical bottlenecks, winding alleyways, residential parking restrictions, or dynamic table shifting between indoor and courtyard areas.
2. **Rigid Table Lock-In:** Traditional systems force static QR codes glued to specific tables. When guests move from indoor tables to the courtyard as evening falls, orders get scrambled and bills get mixed up.
3. **Advance Deposit Disconnect:** When guests pay a ₹500 booking deposit, legacy systems require manual cashier discounts or separate credit ledgers, causing frequent closing-time financial mismatches.
4. **Heavy Clunky Software:** Petpooja's legacy desktop client requires multiple nested clicks to bill an order, suffers from Windows background print-spooler freezes, and drops tablet Wi-Fi connections during peak dinner rushes.

### Our Ground Reality Solution:
We physically visited Jaadoo Cafe, mapped its physical floors, observed real cashier and kitchen workflows, and conducted **live on-site user testing with actual diners**. 100% of tested diners and staff reported that our custom platform is significantly faster, clearer, and more intuitive.

---

## 2. Technical Stack & Infrastructure

- **Frontend Application:** Next.js 16 (App Router, Turbopack, React 19, Tailwind CSS, Lucide Icons, Shadcn UI primitives).
- **Backend API:** High-performance asynchronous FastAPI (Python 3.11), SQLAlchemy ORM, Pydantic v2 schemas.
- **Real-Time Communication:** Bi-directional WebSockets (`/ws`) for zero-latency KDS ticket dispatch and POS table state synchronization.
- **Database:** Dual support for SQLite (rapid local testing) and Lakebase / Neon PostgreSQL (production cloud).
- **Thermal Printing:** Native browser ESC/POS 80mm printable layout with custom CSS `@page` styling, bypassing fragile third-party print spoolers.
- **Document Intelligence:** OCR-powered invoice processing for backend ingredient and expense ledger entry.

---

## 3. Complete Module & Feature Breakdown

### A. Public Guest Web Experience (`/`, `/menu`, `/about`, `/location`)
- **Brand Story & Ambience Showcase:** Modern, warm cafe aesthetics highlighting wood-fired artisanal pizzas, homemade gelato, and heritage hospitality.
- **Interactive Live Menu:**
  - Categorized browsing (Artisanal Pizzas, Pasta, Gelato, Beverages, Small Plates).
  - Prominent dietary tags: **Pure Veg**, **Non-Veg**, **Chef's Special**, and **Spice Levels**.
  - Detailed allergen indicators (Gluten, Dairy, Nuts).
- **Professional Location & Parking Guide:**
  - Clear, courteous navigation instructions tailored to *Sitaphal ki gali*, advising guests on nearby designated parking zones to respect residential alleyway regulations.

---

### B. Table Reservation & Advance Booking Engine (`/book-table`, `/api/v1/reservations`)
- **Real-Time Slot Selection:** Select date, meal timing, and guest count with live capacity validation.
- **Dietary & Special Request Capture:** Pre-captures customer allergy warnings and celebration notes.
- **Advance Deposit Workflow:**
  - Seamless advance deposit integration (e.g., ₹500 per table reservation).
  - Issues an instant booking reference code (`RES-XXXX`).
  - Automatically dispatches booking status to both the POS floor overview and the Admin dashboard.
- **Closed-Loop Bill Crediting:** The advance deposit is permanently linked to the reservation ID and automatically deducted from the guest's final POS bill at the counter.

---

### C. Generalized Dynamic Dining QR System (`/table`, `/table/[token]`, `/api/v1/tables/qr/*`)
- **Generalized Multi-Token QR Architecture:**
  - Eliminates rigid static table stickers.
  - Cafe displays high-quality generalized QR codes at the entryway, counter, and digital stands.
- **Two Flexible Entry Modes:**
  1. **Claim Reservation:** Arriving guests enter their phone number or `RES-XXXX` booking code to claim their allotted table.
  2. **Walk-In Dining:** Walk-in diners immediately access the live menu and place orders.
- **Dynamic Floor Allotment by POS Operator:**
  - POS cashier assigns or re-assigns the guest session to any table across Ground Floor, First Floor, Terrace, or Courtyard.
  - Guests moving between indoor and outdoor seating never cause bill mix-ups or lost kitchen tickets.
- **Admin QR Management Suite:**
  - Generate new generalized QR tokens on demand with custom notes.
  - Toggle tokens **Active / Inactive** in real-time.
  - Instant token revocation and deletion with zero impact on active floor dining sessions.

---

### D. Point of Sale (POS) Portal (`/pos`)
- **Visual Multi-Floor Layout:** Real-time visual cards for Ground Floor, First Floor, Terrace, and Courtyard tables.
- **Table States at a Glance:** Color-coded status for Available, Active Dining, Billing In-Progress, and Needs Cleaning.
- **1-Tap Direct Thermal Bill Print:**
  - Cashier clicks **★ Print Bill**.
  - A clean pop-up asks for **Payment Mode**:
    - **UPI** (Google Pay / PhonePe / Paytm / Dynamic QR)
    - **Cash** (Counter Cash Tender)
    - **Card** (Debit / Credit POS Swipe)
  - Instantly renders an 80mm thermal receipt in 1 tap without multi-step navigation.
- **Printed Thermal Receipt Features:**
  - Removed outdated internal session tags.
  - Cleanly displays `Payment Mode: [UPI / Cash / Card]` alongside `Date` and `Cashier Name`.
  - Prominently displays allergy warnings (`⚠️ Allergy/Dietary: [Notes]`).
  - Automatic calculation of Net Due:  
    $$\text{Net Amount Due} = (\text{Subtotal} - \text{Discount} + \text{Tax}) - \text{Advance Deposit}$$
- **Fast Cashier Operations:**
  - Instant live item search and quick quantity modifiers.
  - KOT firing with single-click kitchen dispatch.
  - Table merging, session clearance, and customer lookup.

---

### E. Kitchen Display System (KDS) (`/kds`)
- **Zero-Latency WebSocket Stream:** Orders appear on kitchen screens within milliseconds of placement.
- **Station-Specific Routing:** Separates wood-fired pizza orders, pasta stations, beverage bars, and dessert counters.
- **Visual Order Aging Timers:** Color transitions (Green $\rightarrow$ Yellow $\rightarrow$ Red) alert chefs to orders exceeding target preparation times.
- **Allergy & Special Instructions Highlight:** Allergy warnings are highlighted in high-contrast red warning banners so kitchen staff never overlook customer safety.
- **Touchscreen Bump Bar:** Cooks bump items from *Received* $\rightarrow$ *In Preparation* $\rightarrow$ *Ready for Pickup* $\rightarrow$ *Served*.

---

### F. Admin & Executive Financial Portal (`/admin`)
- **Executive Revenue & Operations Ledger:**
  - Real-time gross sales, net revenue, total taxes, applied discounts, and deposit redemptions.
  - Exact breakdown of income by payment tender (**UPI vs. Cash vs. Card**).
  - Harmonized typography and consistent design hierarchy.
- **OCR Supplier Invoice Scanner:**
  - Upload or scan physical vendor bills and grocery invoices.
  - Automated optical extraction of vendor name, invoice date, line items, and total cost directly into the expense ledger.
- **Menu & Price Control Engine:**
  - Instant price adjustments, category re-ordering, and live stock toggles (In Stock / Sold Out).
- **Generalized Dining QR Manager:**
  - Complete control over active dining QR passes, batch generation, and print-ready QR exports.

---

### G. Manager Operations Portal (`/manager`)
- **Shift Oversight:** Monitor active table turnover, average dining duration, and pending reservation arrivals.
- **Staff Accountability:** Track orders punched per cashier and identify table bottlenecks during peak shifts.
- **End-of-Day Audit:** Automated reconciliation between cash drawer, card machine totals, and UPI merchant credits.

---

## 4. Key Comparisons: Jaadoo Custom Platform vs. Petpooja

| Operational Dimension | Petpooja (Mass-Market SaaS) | Jaadoo Custom Platform |
| :--- | :--- | :--- |
| **Site Context** | Built generically for food courts; never visited Sitaphal ki gali. | Physically visited, floor-mapped, and built for Udaipur's cafe dynamics. |
| **Customer Validation** | Generic ticketing system; no local user testing. | **Tested live with real cafe diners on-site**; 100% positive user feedback. |
| **QR Code Model** | Rigid static stickers; table movement scrambles bills. | **Generalized Dynamic QR**; cashier allots tables flexibly across floors. |
| **Advance Booking Credit** | Manual discount workarounds; frequent closing mismatches. | **Automatic closed-loop credit** deducted cleanly on the thermal receipt. |
| **Thermal Bill Printing** | Clunky multi-screen navigation; background spooler crashes. | **1-Tap Direct Print** with instant payment mode selection (UPI/Cash/Card). |
| **Dietary & Allergens** | Buried in tiny order notes; frequently missed by chefs. | **Prominent allergy flags** on both live KDS screens and bill headers. |
| **Cost & Independence** | Recurring monthly rent + paid add-ons + hardware lock-in. | **100% Owned Platform**; zero monthly per-table fees or gateway cuts. |

---

## 5. Strategic Recommendations & Future Roadmap

To further solidify Jaadoo Cafe's competitive edge and operational efficiency, we recommend the following strategic enhancements:

### 1. Automated WhatsApp Hospitality Concierge
- **Instant Booking Confirmation:** Automated WhatsApp pass containing reservation timing, live Google Map directions, and alley parking instructions.
- **Digital E-Bill Delivery:** Send an eco-friendly PDF invoice to the customer's WhatsApp as soon as the cashier prints the thermal receipt.
- **Post-Dining Review Loop:** Automatic message 45 minutes after departure inviting guests to leave a 5-star Google review.

### 2. Zero-App Customer Loyalty & Preference Memory
- **Automatic Recognition:** When a repeat customer provides their phone number, the POS instantly highlights their favorite pizza (e.g., *"Loves Burrata Margherita with extra chili flakes"*).
- **Tiered Perks:** Automatic surprise perks (e.g., free artisanal gelato on their 5th visit) applied directly to the bill without clunky loyalty card apps.

### 3. Recipe-Level Automated Inventory Depletion
- **Ingredient Cost Tracking:** Link menu items to raw ingredients (e.g., 1 Margherita Pizza = 220g fermented dough ball, 90g San Marzano sauce, 110g fresh mozzarella, fresh basil).
- **Auto-Deduction:** Selling a pizza automatically deducts ingredients in real time, triggering proactive low-stock alerts before Friday night dinner rushes.

### 4. Offline-First PWA Local Cache Resilience
- **Offline Cashier Mode:** Store active table sessions in browser local IndexedDB storage. If the cafe Wi-Fi drops momentarily, cashiers can continue punching orders and printing bills without interruption, auto-syncing as soon as connection restores.

### 5. Multi-Station Kitchen Audio Chimes
- Distinct auditory chimes on kitchen screens:
  - Deep bell for wood-fired pizza station.
  - Gentle chime for barista / dessert counter.
  - Urgent alert for dietary/allergy orders.

---

## 6. Project Files & Routes Reference

```
frontend/src/app/
├── (public)
│   ├── page.tsx               # Main brand landing & pizza showcase
│   ├── menu/page.tsx          # Dynamic live menu & allergen guide
│   ├── book-table/page.tsx    # Table reservation & advance deposit flow
│   ├── location/page.tsx      # Sitaphal ki gali location & parking guide
│   └── about/page.tsx         # Story, culinary philosophy & heritage
├── (operations)
│   ├── pos/page.tsx           # Cashier POS, floor view & 1-tap thermal billing
│   ├── kds/page.tsx           # Real-time Kitchen Display System
│   ├── admin/page.tsx         # Executive ledger, QR manager & OCR scanner
│   ├── manager/page.tsx       # Floor supervision & shift audit
│   └── table/                 # Generalized dynamic QR dining & ordering
backend/
├── app/
│   ├── api/                   # REST endpoints (orders, tables, reservations, ledger)
│   ├── models/                # Database entities (SQLAlchemy)
│   ├── schemas/               # Validation schemas (Pydantic)
│   ├── services/              # Business logic & payment workflows
│   └── workers/               # Background task processors
```

---

*Document generated on October 14, 2026. Maintained by the Advanced Engineering Team for the JAADOO Pizza Project.*
