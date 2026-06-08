import os
from datetime import datetime
from fpdf import FPDF

class InvoicePDF(FPDF):
    def header(self):
        pass
        
    def footer(self):
        pass

def generate_invoice_pdf(member: dict, payment: dict, settings: dict, extra: dict = None) -> bytes:
    """
    Generates a premium invoice receipt PDF using fpdf2.
    Matches coordinate offsets and typography of the JS client version.
    """
    pdf = InvoicePDF(format="A4", unit="mm")
    pdf.add_page()
    pdf.set_auto_page_break(False)
    
    primary_rgb = (99, 102, 241) # Indigo Hex
    
    gym_name = settings.get("gym_name", "Lexus Fitness Group")
    gym_tagline = settings.get("gym_tagline", "Fitness Center & Personal Training")
    gym_address = settings.get("gym_address", "123 Fitness Street, City - 123456")
    gym_phone = settings.get("gym_phone", "+91 9876543210")
    gym_email = settings.get("gym_email", "info@lexusfitness.com")
    gym_gst = settings.get("gym_gst", "27AAABCU9603R1ZM")
    
    # Gym Header Details
    pdf.set_text_color(*primary_rgb)
    pdf.set_font("Helvetica", "B", 24)
    pdf.text(20, 26, gym_name)
    
    pdf.set_text_color(100, 100, 100)
    pdf.set_font("Helvetica", "", 14)
    pdf.text(20, 34, gym_tagline)
    pdf.text(20, 41, gym_address)
    pdf.text(20, 48, f"Phone: {gym_phone}  |  Email: {gym_email}")
    if gym_gst:
        pdf.set_font("Helvetica", "B", 14)
        pdf.text(20, 55, f"GSTIN: {gym_gst}")
        
    # Draw Gym Logo (falls back cleanly if file is missing)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(current_dir, "logo.png")
    if os.path.exists(logo_path):
        try:
            pdf.image(logo_path, x=155, y=18, w=35)
        except Exception as e:
            print("PDF Logo Image render error:", e)

    # Horizontal Divider Line
    pdf.set_draw_color(226, 232, 240)
    pdf.set_line_width(0.5)
    pdf.line(20, 60, 190, 60)
    
    # Invoice Card Background
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(20, 64, 170, 46, "F")
    
    # Billed To (Left Column)
    pdf.set_text_color(*primary_rgb)
    pdf.set_font("Helvetica", "B", 13)
    pdf.text(25, 71, "BILLED TO")
    
    pdf.set_text_color(30, 30, 30)
    pdf.set_font("Helvetica", "B", 15)
    pdf.text(25, 79, member.get("name", "N/A"))
    
    pdf.set_text_color(70, 70, 70)
    pdf.set_font("Helvetica", "", 13)
    pdf.text(25, 87, f"Member ID / Adm No: {member.get('admission_no', 'N/A')}")
    pdf.text(25, 95, f"Phone: {member.get('phone', 'N/A')}")
    if member.get("address"):
        pdf.text(25, 103, f"Address: {member.get('address')[:45]}")
        
    # Invoice info (Right Column)
    pdf.set_text_color(*primary_rgb)
    pdf.set_font("Helvetica", "B", 13)
    pdf.text(115, 71, "INVOICE DETAILS")
    
    pdf.set_text_color(70, 70, 70)
    pdf.set_font("Helvetica", "", 13)
    invoice_no = f"LFG-{str(payment.get('id', 'INV'))[:8].upper()}"
    date_str = payment.get("paid_on") or datetime.now().strftime("%Y-%m-%d")
    try:
        formatted_date = datetime.strptime(date_str, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        formatted_date = date_str
        
    pdf.text(115, 79, f"Invoice No: {invoice_no}")
    pdf.text(115, 87, f"Date: {formatted_date}")
    pdf.text(115, 95, f"Method: {str(payment.get('method', 'cash')).upper()}")
    
    # Paid Status Badge
    pdf.set_fill_color(209, 250, 229)
    pdf.rect(158, 66, 24, 8, "F")
    pdf.set_text_color(5, 150, 105)
    pdf.set_font("Helvetica", "B", 12)
    pdf.text(164, 72, "PAID")
    
    # Membership Timeline
    pdf.set_text_color(*primary_rgb)
    pdf.set_font("Helvetica", "B", 13)
    pdf.text(20, 116, "MEMBERSHIP TIMELINE")
    
    pdf.set_draw_color(241, 245, 249)
    pdf.line(20, 118, 190, 118)
    
    pdf.set_text_color(60, 60, 60)
    pdf.set_font("Helvetica", "", 13.5)
    
    join_date = member.get("join_date") or "N/A"
    try:
        formatted_join = datetime.strptime(join_date, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        formatted_join = join_date
        
    expiry_date = member.get("next_due_date") or "N/A"
    try:
        formatted_expiry = datetime.strptime(expiry_date, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        formatted_expiry = expiry_date
        
    pdf.text(25, 125, f"Join Date: {formatted_join}")
    pdf.text(25, 132, f"Cycle Start: {formatted_date}")
    pdf.text(115, 125, f"Expiry Date: {formatted_expiry}")
    pdf.text(115, 132, f"Duration: {member.get('fee_cycle_days', 30)} Days")
    
    # Billing Table Header
    pdf.set_fill_color(*primary_rgb)
    pdf.rect(20, 140, 170, 10, "F")
    
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 13.5)
    pdf.text(25, 146.5, "Item Description")
    pdf.text(165, 146.5, "Amount")
    
    # Billing Calculations
    extra_data = extra or {}
    trainer = float(extra_data.get("trainerCharges", 0))
    diet = float(extra_data.get("dietCharges", 0))
    admission = float(extra_data.get("admissionFee", 0))
    total = float(payment.get("amount", 0.0))
    base_fee = total - trainer - diet - admission
    
    items = [
        {"desc": f"Gym Membership - {member.get('fee_cycle_days', 30)} Days", "amt": base_fee}
    ]
    if trainer > 0:
        items.append({"desc": "Personal Training (PT) Charges", "amt": trainer})
    if diet > 0:
        items.append({"desc": "Diet Plan Charges", "amt": diet})
    if admission > 0:
        items.append({"desc": "Admission & Registration Fee", "amt": admission})
        
    current_y = 150
    pdf.set_font("Helvetica", "", 13.5)
    pdf.set_text_color(50, 50, 50)
    
    for i, item in enumerate(items):
        if i % 2 == 1:
            pdf.set_fill_color(248, 250, 252)
            pdf.rect(20, current_y, 170, 11, "F")
            
        pdf.text(25, current_y + 7.5, item["desc"])
        amt_str = f"Rs. {item['amt']:.2f}"
        pdf.text(180 - pdf.get_string_width(amt_str), current_y + 7.5, amt_str)
        
        pdf.set_draw_color(241, 245, 249)
        pdf.line(20, current_y + 11, 190, current_y + 11)
        current_y += 11
        
    # Summary total block
    total_y = current_y + 4
    pdf.set_fill_color(243, 244, 246)
    pdf.rect(110, total_y, 80, 15, "F")
    
    pdf.set_text_color(100, 100, 100)
    pdf.set_font("Helvetica", "B", 11)
    pdf.text(115, total_y + 9.5, "TOTAL AMOUNT PAID")
    
    pdf.set_text_color(*primary_rgb)
    pdf.set_font("Helvetica", "B", 16)
    tot_str = f"Rs. {total:.2f}"
    pdf.text(185 - pdf.get_string_width(tot_str), total_y + 10.5, tot_str)
    
    notes_end = total_y + 15
    notes_str = payment.get("notes")
    if notes_str:
        notes_y = total_y + 24
        pdf.set_text_color(100, 100, 100)
        pdf.set_font("Helvetica", "B", 13)
        pdf.text(20, notes_y, "Notes / Remarks:")
        
        pdf.set_text_color(70, 70, 70)
        pdf.set_font("Helvetica", "", 13)
        pdf.text(20, notes_y + 7, notes_str[:85])
        notes_end = notes_y + 12
        
    # Signatures
    sig_y = max(notes_end + 18, 230)
    pdf.set_draw_color(226, 232, 240)
    pdf.line(25, sig_y, 75, sig_y)
    
    pdf.set_text_color(100, 100, 100)
    pdf.set_font("Helvetica", "", 13)
    pdf.text(32, sig_y + 7, "Authorized Signature")
    
    # Stamp / Seal Overlay
    seal_path = os.path.join(current_dir, "paid-seal.png")
    if os.path.exists(seal_path):
        try:
            pdf.image(seal_path, x=37, y=sig_y - 25, w=30, h=30)
        except Exception as e:
            print("PDF Seal Stamp render error:", e)
            
    pdf.line(135, sig_y, 185, sig_y)
    pdf.text(147, sig_y + 7, "Member Signature")
    
    # Terms list
    terms_y = sig_y + 16
    pdf.set_text_color(120, 120, 120)
    pdf.set_font("Helvetica", "B", 11)
    pdf.text(20, terms_y, "Terms & Conditions:")
    
    pdf.set_text_color(140, 140, 140)
    pdf.set_font("Helvetica", "", 11)
    pdf.text(20, terms_y + 6, "- This is a computer-generated digital receipt and requires no physical signature.")
    pdf.text(20, terms_y + 11, "- Fees once paid are non-refundable and non-transferable under any circumstances.")
    pdf.text(20, terms_y + 16, "- Please adhere to gym safety protocols and respect trainer instructions.")
    
    # Footer brand bar
    bar_y = terms_y + 22
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(20, bar_y, 170, 9, "F")
    
    pdf.set_text_color(*primary_rgb)
    pdf.set_font("Helvetica", "B", 12.5)
    brand_msg = f"Thank you for choosing {gym_name}! Let's reach your goals together."
    pdf.text(105 - (pdf.get_string_width(brand_msg) / 2), bar_y + 6.5, brand_msg)
    
    return pdf.output()
