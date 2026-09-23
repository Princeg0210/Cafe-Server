# Application User Flow

## Integrated Café Management System

---

## Complete End-to-End Customer & Operational Journey

### 1. Online Reservation

Customer selects:

- Date
- Time
- Number of guests

through the web-based reservation portal.

↓

System checks:

- Table availability
- Reservation capacity
- Applicable booking rules

↓

If capacity is available:

**Reservation Confirmed**

↓

System sends confirmation and configured booking reminders through the available notification channels.

> **Business Rule:** Reservation capacity and item-level production capacity are separate controls. A reservation does not automatically reserve a specific quantity of menu items unless explicitly configured.

---

### 2. Customer Arrival & Table QR

Customer arrives at the café and is seated at the assigned table.

↓

Customer scans the unique QR code placed on the table.

↓

Backend validates:

- QR token
- Table ID
- Table status
- Active dining session

↓

The system opens the customer's active table session.

---

### 3. Table QR Hub

After scanning the table QR, the customer sees **EXACTLY TWO primary options**:

### Option 1 — ORDER MENU

Customer can:

- Browse menu categories
- View menu items
- View prices
- View item availability
- Select quantities
- Add special instructions
- Add items to cart
- Submit the order

↓

**Order Submitted**

---

### Option 2 — VIEW BILL

Customer can view the current running bill, including:

- Ordered items
- Quantities
- Item prices
- Subtotal
- Applicable taxes/charges
- Current cumulative total

> **Important:** The table QR interface does **not** provide a payment option. Payment is completed only at the POS counter.

---

### 4. Backend Order Routing

Once an order is submitted:

**Customer QR**
↓
**Backend**
↓
**Order Validation**
↓
**Item-Level Kitchen Mapping**
↓
**Kitchen Routing**

The system automatically routes individual items to the appropriate kitchen.

Example:

```text
Customer Order
      ↓
Item Mapping Engine
     ↙              ↘
Kitchen 1          Kitchen 2
Hot Food           Beverages / Bar
     ↓                 ↓
KDS / Printer       KDS / Printer
