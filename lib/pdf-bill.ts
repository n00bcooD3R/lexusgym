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
  gymDetails = { ...gymDetails, ...details };
}

export function getGymDetails() {
  return gymDetails;
}

export function generateInvoice(member: any, payment: any, extra?: { trainerCharges?: number; dietCharges?: number; admissionFee?: number }): jsPDF {
  const doc = new jsPDF();
  const date = new Date(payment.paid_on).toLocaleDateString("en-IN");
  const joinDate = member.join_date ? new Date(member.join_date).toLocaleDateString("en-IN") : "N/A";
  const expiryDate = member.next_due_date ? new Date(member.next_due_date).toLocaleDateString("en-IN") : "N/A";
  
  let y = 15;
  
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105);
  doc.text(gymDetails.name, 105, y, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(gymDetails.tagline, 105, y + 6, { align: "center" });
  doc.text(gymDetails.address, 105, y + 11, { align: "center" });
  doc.text(`Phone: ${gymDetails.phone} | Email: ${gymDetails.email}`, 105, y + 16, { align: "center" });
  if (gymDetails.gst) {
    doc.text(`GST No: ${gymDetails.gst}`, 105, y + 21, { align: "center" });
  }
  
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.8);
  doc.line(20, y + 26, 190, y + 26);
  
  y += 35;
  
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("INVOICE / BILL", 105, y, { align: "center" });
  
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Invoice No: LFG/${payment.id?.slice(0, 8).toUpperCase() || "INV"}`, 105, y, { align: "center" });
  doc.text(`Date: ${date}`, 105, y + 5, { align: "center" });
  
  y += 15;
  doc.setFillColor(245, 247, 250);
  doc.rect(20, y, 170, 30, "F");
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Member Details", 25, y + 8);
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Name: ${member.name}`, 25, y + 16);
  doc.text(`Member ID / Admission No: ${member.admission_no}`, 25, y + 22);
  doc.text(`Phone: ${member.phone}`, 120, y + 16);
  if (member.address) {
    doc.text(`Address: ${member.address}`, 120, y + 22);
  }
  
  y += 35;
  
  doc.setFillColor(245, 247, 250);
  doc.rect(20, y, 170, 25, "F");
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Membership Details", 25, y + 8);
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Join Date: ${joinDate}`, 25, y + 16);
  doc.text(`Membership Start: ${date}`, 25, y + 21);
  doc.text(`Expiry Date: ${expiryDate}`, 120, y + 16);
  doc.text(`Duration: ${member.fee_cycle_days || 30} Days`, 120, y + 21);
  
  y += 30;
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Payment Details", 25, y);
  
  y += 8;
  
  const rows = [
    ["Membership Fee", `₹${member.fee_amount}`],
    ["Trainer Charges", extra?.trainerCharges ? `₹${extra.trainerCharges}` : "—"],
    ["Diet Plan Charges", extra?.dietCharges ? `₹${extra.dietCharges}` : "—"],
    ["Admission/Registration Fee", extra?.admissionFee ? `₹${extra.admissionFee}` : "—"],
  ];
  
  let total = Number(member.fee_amount) || 0;
  if (extra?.trainerCharges) total += extra.trainerCharges;
  if (extra?.dietCharges) total += extra.dietCharges;
  if (extra?.admissionFee) total += extra.admissionFee;
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  rows.forEach(([label, value], i) => {
    doc.text(label, 25, y + (i * 7));
    doc.text(value, 180, y + (i * 7), { align: "right" });
  });
  
  y += rows.length * 7 + 5;
  doc.setDrawColor(200);
  doc.line(25, y, 185, y);
  
  y += 8;
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105);
  doc.text("TOTAL AMOUNT PAID", 25, y);
  doc.text(`₹${total}`, 180, y, { align: "right" });
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Payment Method: ${(payment.method || "cash").toUpperCase()}`, 25, y);
  doc.text(`Payment Date: ${date}`, 120, y);
  
  if (payment.notes) {
    y += 8;
    doc.setTextColor(100);
    doc.text(`Notes: ${payment.notes}`, 25, y);
  }
  
  y += 20;
  doc.setDrawColor(200);
  doc.line(20, y, 190, y);
  
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Terms & Conditions:", 25, y);
  doc.text("• This is a computer-generated receipt.", 25, y + 6);
  doc.text("• Please retain this invoice for future reference.", 25, y + 12);
  doc.text("• Membership is valid until the expiry date mentioned above.", 25, y + 18);
  
  y += 30;
  doc.line(25, y + 15, 80, y + 15);
  doc.text("Authorized Signature", 52.5, y + 22, { align: "center" });
  
  doc.line(120, y + 15, 185, y + 15);
  doc.text("Member Signature", 152.5, y + 22, { align: "center" });
  
  y += 35;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Thank you for being a part of ${gymDetails.name}!`, 105, y, { align: "center" });
  doc.text("For any queries, contact us via WhatsApp or email", 105, y + 5, { align: "center" });
  
  return doc;
}

export function generateBill(member: any, payment: any) {
  return generateInvoice(member, payment);
}