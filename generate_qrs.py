import qrcode
import os

def create_qr(data, filename):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(filename)
    print(f"Generated {filename}")

TABLE_QRS = [
    {"table": 1, "token": "qr_sec_b7ba9c59d35e4074a30034abb48ee0a9"},
    {"table": 2, "token": "qr_sec_c2a8e419f72b491295e865f12a14e9b2"},
    {"table": 3, "token": "qr_sec_8d1a3b5c7e9f02468ace13579bdf2468"},
    {"table": 4, "token": "qr_sec_9e2b4c6d8f0a13579bdf2468ace13579"},
    {"table": 5, "token": "qr_sec_0f3c5d7e9a1b2468ace13579bdf2468a"},
    {"table": 6, "token": "qr_sec_1a4d6e8f0b2c3579bdf2468ace13579b"},
    {"table": 7, "token": "qr_sec_2b5e7f9a1c3d468ace13579bdf2468ac"},
    {"table": 8, "token": "qr_sec_3c6f8a0b2d4e579bdf2468ace13579bd"},
    {"table": 9, "token": "qr_sec_4d7a9b1c3e5f68ace13579bdf2468ace"},
    {"table": 10, "token": "qr_sec_5e8b0c2d4f6a79bdf2468ace13579bdf"},
    {"table": 11, "token": "qr_sec_6f9c1d3e5a7b8ace13579bdf2468ace1"},
    {"table": 12, "token": "qr_sec_7a0d2e4f6b8c9bdf2468ace13579bdf2"},
    {"table": 13, "token": "qr_sec_8b1e3f5a7c9d0bdf2468ace13579bdf3"},
    {"table": 14, "token": "qr_sec_9c2f4a6b8d0e1bdf2468ace13579bdf4"},
    {"table": 15, "token": "qr_sec_0d3a5b7c9e1f2bdf2468ace13579bdf5"},
    

]

if __name__ == "__main__":
    os.makedirs("qrcodes", exist_ok=True)
    base_url = "https://cafe-piza.vercel.app"

    print("--- Generating Table Standee QR Codes ---")
    for item in TABLE_QRS:
        t_num = item["table"]
        token = item["token"]
        url = f"{base_url}/table/{token}"
        filename = f"qrcodes/table_{t_num}_qr.png"
        create_qr(url, filename)
        print(f"Table {t_num:02d}: {url}")
    print("\nAll QR code images saved in the './qrcodes/' directory!")
