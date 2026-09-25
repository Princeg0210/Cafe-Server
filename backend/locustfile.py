import time
import random
import json
from locust import HttpUser, task, between
from app.core.security import create_access_token

# Valid JWT access token for User ID 1 ('Jaadoo' Cashier)
POS_TOKEN = create_access_token(1)

QR_TOKENS = [
    "qr_sec_b7ba9c59d35e4074a30034abb48ee0a9",
    "qr_sec_c2a8e419f72b491295e865f12a14e9b2",
    "qr_sec_8d1a3b5c7e9f02468ace13579bdf2468",
    "qr_sec_9e2b4c6d8f0a13579bdf2468ace13579",
    "qr_sec_0f3c5d7e9a1b2468ace13579bdf2468a",
    "qr_sec_1a4d6e8f0b2c3579bdf2468ace13579b",
    "qr_sec_2b5e7f9a1c3d468ace13579bdf2468ac",
    "qr_sec_3c6f8a0b2d4e579bdf2468ace13579bd",
    "qr_sec_4d7a9b1c3e5f68ace13579bdf2468ace",
    "qr_sec_5e8b0c2d4f6a79bdf2468ace13579bdf",
    "qr_sec_6f9c1d3e5a7b8ace13579bdf2468ace1",
    "qr_sec_7a0d2e4f6b8c9bdf2468ace13579bdf2"
]

MENU_ITEMS = [
    {"menu_item_id": 1, "name": "Margherita Pizza", "quantity": 1},
    {"menu_item_id": 4, "name": "Fettuccine Alfredo", "quantity": 1},
    {"menu_item_id": 6, "name": "Iced Cold Coffee", "quantity": 2},
    {"menu_item_id": 9, "name": "MARGHERITA BUFALA", "quantity": 1},
    {"menu_item_id": 12, "name": "FRESH LIME SODA", "quantity": 2},
]

class CafeCustomerUser(HttpUser):
    wait_time = between(0.1, 0.5)

    @task
    def customer_flow(self):
        qr_token = random.choice(QR_TOKENS)

        # 1. Scan QR Token -> Get/Create Session
        with self.client.post("/api/v1/tables/qr/session", json={"qr_token": qr_token}, catch_response=True) as res:
            if res.status_code != 200:
                res.failure(f"QR Session failed: {res.status_code} {res.text}")
                return
            sess_data = res.json()
            session_id = sess_data.get("id") or sess_data.get("session_id")
            session_token = sess_data.get("session_token")

        # 2. Browse Menu Categories & Items
        self.client.get("/api/v1/menu/categories")
        self.client.get("/api/v1/menu/items")

        # 3. Place Order
        order_items = random.sample(MENU_ITEMS, random.randint(1, 2))
        order_payload = {
            "qr_token": qr_token,
            "session_token": session_token,
            "items": order_items
        }
        with self.client.post("/api/v1/orders", json=order_payload, catch_response=True) as o_res:
            if o_res.status_code not in (200, 201):
                o_res.failure(f"Order placement failed: {o_res.status_code} {o_res.text}")
                return

        # 4. Fetch Running Bill using session header
        if session_id and session_token:
            sess_headers = {"X-Session-Token": session_token}
            self.client.get(f"/api/v1/sessions/{session_id}/bill", headers=sess_headers)

        # 5. POS Cashier Terminal Updates
        pos_headers = {"Authorization": f"Bearer {POS_TOKEN}"}
        self.client.get("/api/v1/pos/table-sessions", headers=pos_headers)
        self.client.get("/api/v1/pos/kots", headers=pos_headers)
