import qrcode
import os

def create_qr(data, filename):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(filename)
    print(f"Generated {filename}")

if __name__ == "__main__":
    # Table 1
    create_qr("https://cafe-piza.vercel.app/table/qr_sec_b7ba9c59d35e4074a30034abb48ee0a9", "table1_qr.png")
    
    # Table 2
    create_qr("https://cafe-piza.vercel.app/table/qr_sec_c2a8e419f72b491295e865f12a14e9b2", "table2_qr.png")
