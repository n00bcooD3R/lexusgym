import jsPDF from "jspdf";

let gymDetails: Record<string, string> = {
  name: "Lexus Fitness Group",
  tagline: "Fitness Center & Personal Training",
  address: "123 Fitness Street, City - 123456",
  phone: "+91 9876543210",
  email: "info@lexusfitness.com",
  gst: "27AAABCU9603R1ZM"
};

export function setGymDetails(details: Record<string, string>) {
  gymDetails = {
    name: details.gym_name || details.name || gymDetails.name,
    tagline: details.gym_tagline || details.tagline || gymDetails.tagline,
    address: details.gym_address || details.address || gymDetails.address,
    phone: details.gym_phone || details.phone || gymDetails.phone,
    email: details.gym_email || details.email || gymDetails.email,
    gst: details.gym_gst || details.gst || gymDetails.gst,
  };
}

let logoBase64 = "";

export function setLogoBase64(base64: string) {
  logoBase64 = base64;
}

export function getGymDetails() {
  return gymDetails;
}

export function generateInvoice(member: any, payment: any, extra?: { trainerCharges?: number; dietCharges?: number; admissionFee?: number }): jsPDF {
  const doc = new jsPDF();
  const date = new Date(payment.paid_on).toLocaleDateString("en-IN");
  const joinDate = member.join_date ? new Date(member.join_date).toLocaleDateString("en-IN") : "N/A";
  const expiryDate = member.next_due_date ? new Date(member.next_due_date).toLocaleDateString("en-IN") : "N/A";
  
  const trainer = Number(extra?.trainerCharges) || 0;
  const diet = Number(extra?.dietCharges) || 0;
  const admission = Number(extra?.admissionFee) || 0;
  const total = Number(payment.amount) || (Number(member.fee_amount) + trainer + diet + admission) || 0;
  const baseMembershipFee = total - trainer - diet - admission;

  // Primary branding color: Indigo (RGB: 99, 102, 241)
  const primaryRGB = [99, 102, 241];
  
  // 1. Gym Logo & Details Header
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 155, 18, 30, 30);
    } catch (err) {
      console.error("Error drawing logo:", err);
    }
  }

  // Left Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(gymDetails.name, 20, 26);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100);
  doc.text(gymDetails.tagline, 20, 32);
  doc.text(gymDetails.address, 20, 37);
  doc.text(`Phone: ${gymDetails.phone}  |  Email: ${gymDetails.email}`, 20, 42);
  if (gymDetails.gst) {
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${gymDetails.gst}`, 20, 47);
  }

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(20, 52, 190, 52);

  // 2. Invoice Meta Details Card (Billed To vs Invoice Info)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 58, 170, 32, 2, 2, "F");

  // Billed To (Left Column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text("BILLED TO", 25, 65);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(member.name, 25, 71);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text(`Member ID / Adm No: ${member.admission_no}`, 25, 76);
  doc.text(`Phone: ${member.phone}`, 25, 81);
  if (member.address) {
    doc.text(`Address: ${member.address.slice(0, 45)}`, 25, 86);
  }

  // Invoice Details (Right Column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text("INVOICE DETAILS", 115, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text(`Invoice No: LFG-${payment.id?.slice(0, 8).toUpperCase() || "INV"}`, 115, 71);
  doc.text(`Date: ${date}`, 115, 76);
  doc.text(`Method: ${(payment.method || "cash").toUpperCase()}`, 115, 81);

  // Soft green PAID badge
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(160, 61, 22, 6, 1.5, 1.5, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text("PAID", 171, 65.2, { align: "center" });

  // 3. Membership Details Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text("MEMBERSHIP TIMELINE", 20, 99);
  
  doc.setDrawColor(241, 245, 249);
  doc.line(20, 101, 190, 101);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60);
  
  doc.text(`Join Date: ${joinDate}`, 25, 107);
  doc.text(`Cycle Start: ${date}`, 25, 112);
  
  doc.text(`Expiry Date: ${expiryDate}`, 115, 107);
  doc.text(`Duration: ${member.fee_cycle_days || 30} Days`, 115, 112);

  // 4. Billing Table Header
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(20, 122, 170, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text("Item Description", 25, 127.5);
  doc.text("Amount", 180, 127.5, { align: "right" });

  // Generate dynamic table rows
  const items = [
    { desc: `Gym Membership - ${member.fee_cycle_days || 30} Days`, amt: baseMembershipFee }
  ];
  if (trainer > 0) items.push({ desc: "Personal Training (PT) Charges", amt: trainer });
  if (diet > 0) items.push({ desc: "Diet Plan Charges", amt: diet });
  if (admission > 0) items.push({ desc: "Admission & Registration Fee", amt: admission });

  let currentY = 130;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(50);
  
  items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, currentY, 170, 8, "F");
    }
    doc.text(item.desc, 25, currentY + 5.5);
    doc.text(`₹${item.amt.toLocaleString("en-IN")}`, 180, currentY + 5.5, { align: "right" });
    
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(20, currentY + 8, 190, currentY + 8);
    
    currentY += 8;
  });

  // Total Summary Block
  const totalBoxY = currentY + 4;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(120, totalBoxY, 70, 14, 1.5, 1.5, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  doc.text("TOTAL AMOUNT PAID", 125, totalBoxY + 9);
  
  doc.setFontSize(11);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(`₹${total.toLocaleString("en-IN")}`, 185, totalBoxY + 9, { align: "right" });

  // Notes
  let notesY = totalBoxY + 23;
  if (payment.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text("Notes / Remarks:", 20, notesY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70);
    doc.text(payment.notes, 20, notesY + 5);
    notesY += 12;
  }

  // 5. Signature Fields
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(25, 245, 75, 245);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  doc.text("Authorized Signature", 50, 249, { align: "center" });
  
  doc.line(135, 245, 185, 245);
  doc.text("Member Signature", 160, 249, { align: "center" });

  // 6. Terms & Footer
  const footerY = 258;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Terms & Conditions:", 20, footerY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text("• This is a computer-generated digital receipt and requires no physical signature.", 20, footerY + 4.5);
  doc.text("• Fees once paid are non-refundable and non-transferable under any circumstances.", 20, footerY + 8.5);
  doc.text("• Please adhere to gym safety protocols and respect trainer instructions.", 20, footerY + 12.5);

  // Footer Thank You Bar
  doc.setFillColor(99, 102, 241, 0.05);
  doc.rect(20, 280, 170, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(`Thank you for choosing ${gymDetails.name}! Let's reach your goals together.`, 105, 285.2, { align: "center" });

  return doc;
}

export function generateBill(member: any, payment: any) {
  return generateInvoice(member, payment);
}