import jsPDF from "jspdf";

// Fetch fresh gym details from /api/settings/list at invoice time (browser-side)
async function fetchGymDetails(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/settings/list");
    const data = await res.json();
    return {
      name:    data.gym_name    || "Lexus Fitness Group",
      tagline: data.gym_tagline || "Fitness Center & Personal Training",
      address: data.gym_address || "",
      phone:   data.gym_phone   || "",
      email:   data.gym_email   || "",
      gst:     data.gym_gst     || "",
    };
  } catch {
    return {
      name:    "Lexus Fitness Group",
      tagline: "Fitness Center & Personal Training",
      address: "",
      phone:   "",
      email:   "",
      gst:     "",
    };
  }
}

// Convert public logo to base64 for embedding
async function getLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Hex to RGB helper
function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ─── Color palette ────────────────────────────────────────────────
const PRIMARY   = "#1a1a2e";   // Deep navy
const ACCENT    = "#7c3aed";   // Purple
const ACCENT2   = "#06b6d4";   // Cyan
const SUCCESS   = "#10b981";   // Green for total
const GRAY_BG   = "#f4f4f8";
const GRAY_TEXT = "#6b7280";
const WHITE     = "#ffffff";

export async function generateInvoiceAsync(
  member: any,
  payment: any,
  extra?: { trainerCharges?: number; dietCharges?: number; admissionFee?: number }
): Promise<jsPDF> {
  const gym = await fetchGymDetails();
  const logoB64 = await getLogoBase64();
  return buildInvoicePDF(member, payment, extra, gym, logoB64);
}

// Sync wrapper — uses cached/default details (for preview)
export function generateInvoice(
  member: any,
  payment: any,
  extra?: { trainerCharges?: number; dietCharges?: number; admissionFee?: number }
): jsPDF {
  const gym = {
    name:    "Lexus Fitness Group",
    tagline: "Fitness Center & Personal Training",
    address: "", phone: "", email: "", gst: "",
  };
  return buildInvoicePDF(member, payment, extra, gym, null);
}

function buildInvoicePDF(
  member: any,
  payment: any,
  extra: { trainerCharges?: number; dietCharges?: number; admissionFee?: number } | undefined,
  gym: Record<string, string>,
  logoB64: string | null
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297;
  const [pr, pg, pb] = hexRgb(PRIMARY);
  const [ar, ag, ab] = hexRgb(ACCENT);
  const [cr, cg, cb] = hexRgb(ACCENT2);
  const [sr, sg, sb] = hexRgb(SUCCESS);

  const date       = new Date(payment.paid_on).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const expiryDate = member.next_due_date
    ? new Date(member.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "N/A";
  const invoiceNo  = `INV-${(payment.id || "").slice(0, 8).toUpperCase() || "000000"}`;

  // ── 1. Deep navy header banner ──────────────────────────────────
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, W, 52, "F");

  // Purple accent stripe at top
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 0, W, 4, "F");

  // Cyan accent stripe
  doc.setFillColor(cr, cg, cb);
  doc.rect(0, 4, W, 2, "F");

  // ── 2. Logo ─────────────────────────────────────────────────────
  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", 12, 10, 28, 28); } catch { /* skip */ }
  }

  // ── 3. Gym name & tagline ────────────────────────────────────────
  const textX = logoB64 ? 46 : 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(gym.name, textX, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(cr, cg, cb);
  doc.text(gym.tagline, textX, 29);

  doc.setTextColor(180, 180, 200);
  doc.setFontSize(8);
  if (gym.phone) doc.text(`📞 ${gym.phone}`, textX, 36);
  if (gym.email) doc.text(`✉ ${gym.email}`, textX + 50, 36);
  if (gym.address) doc.text(`📍 ${gym.address}`, textX, 42);
  if (gym.gst) doc.text(`GST: ${gym.gst}`, textX + 50, 42);

  // ── 4. INVOICE label & meta (top-right) ─────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(ar, ag, ab);
  doc.text("INVOICE", W - 14, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 180, 210);
  doc.text(invoiceNo, W - 14, 28, { align: "right" });
  doc.text(`Date: ${date}`, W - 14, 34, { align: "right" });

  // ── 5. Gradient divider row ─────────────────────────────────────
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 52, W / 2, 1.5, "F");
  doc.setFillColor(cr, cg, cb);
  doc.rect(W / 2, 52, W / 2, 1.5, "F");

  // ── 6. Member info card ─────────────────────────────────────────
  let y = 62;
  doc.setFillColor(244, 244, 248);
  doc.roundedRect(12, y, W - 24, 34, 3, 3, "F");

  // Card left accent bar
  doc.setFillColor(ar, ag, ab);
  doc.rect(12, y, 3, 34, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(ar, ag, ab);
  doc.text("MEMBER DETAILS", 20, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 50);

  const col2 = 115;
  doc.text(`Name`, 20, y + 18);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${member.name}`, 48, y + 18);
  doc.setFont("helvetica", "normal");

  doc.text(`Admission No`, 20, y + 25);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${member.admission_no}`, 48, y + 25);
  doc.setFont("helvetica", "normal");

  doc.text(`Phone`, col2, y + 18);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${member.phone}`, col2 + 22, y + 18);
  doc.setFont("helvetica", "normal");

  if (member.address) {
    doc.text(`Address`, col2, y + 25);
    doc.setFont("helvetica", "bold");
    const addr = doc.splitTextToSize(member.address, 60);
    doc.text(`: ${addr[0]}`, col2 + 22, y + 25);
    doc.setFont("helvetica", "normal");
  }

  // ── 7. Membership info card ─────────────────────────────────────
  y += 42;
  doc.setFillColor(244, 244, 248);
  doc.roundedRect(12, y, W - 24, 28, 3, 3, "F");

  doc.setFillColor(cr, cg, cb);
  doc.rect(12, y, 3, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(cr, cg, cb);
  doc.text("MEMBERSHIP DETAILS", 20, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 50);

  doc.text("Payment Date", 20, y + 18);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${date}`, 60, y + 18);
  doc.setFont("helvetica", "normal");

  doc.text("Expiry Date", col2, y + 18);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${expiryDate}`, col2 + 28, y + 18);
  doc.setFont("helvetica", "normal");

  const cycleDays = member.fee_cycle_days || 30;
  const planLabel = cycleDays === 30 ? "Flex Plan (1 Month)"
    : cycleDays === 90  ? "Power Plan (3 Months)"
    : cycleDays === 180 ? "Transform Plan (6 Months)"
    : cycleDays === 365 ? "Prime Plan (12 Months)"
    : `${cycleDays} Days`;

  doc.text("Plan", 20, y + 25);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${planLabel}`, 60, y + 25);
  doc.setFont("helvetica", "normal");

  // ── 8. Payment table ────────────────────────────────────────────
  y += 36;

  // Table header
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(12, y, W - 24, 10, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", 20, y + 7);
  doc.text("AMOUNT", W - 20, y + 7, { align: "right" });

  y += 10;

  const rows: [string, number | null][] = [
    ["Membership Fee", Number(member.fee_amount) || 0],
    ["Trainer Charges", extra?.trainerCharges || null],
    ["Diet Plan Charges", extra?.dietCharges || null],
    ["Admission / Registration Fee", extra?.admissionFee || null],
  ];

  let total = 0;
  let rowIdx = 0;
  rows.forEach(([label, val]) => {
    if (val === null || val === 0) return;
    total += val;

    doc.setFillColor(rowIdx % 2 === 0 ? 249 : 244, rowIdx % 2 === 0 ? 249 : 244, rowIdx % 2 === 0 ? 255 : 248);
    doc.rect(12, y, W - 24, 9, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 60);
    doc.text(label, 20, y + 6.5);
    doc.text(`₹${val.toLocaleString("en-IN")}`, W - 20, y + 6.5, { align: "right" });

    y += 9;
    rowIdx++;
  });

  // Also include membership fee if nothing else added
  if (rowIdx === 0) {
    total = Number(member.fee_amount) || 0;
    doc.setFillColor(249, 249, 255);
    doc.rect(12, y - 9, W - 24, 9, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 60);
    doc.text("Membership Fee", 20, y - 2.5);
    doc.text(`₹${total.toLocaleString("en-IN")}`, W - 20, y - 2.5, { align: "right" });
    rowIdx = 1;
  }

  // Total row
  y += 2;
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(12, y, W - 24, 12, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL AMOUNT PAID", 20, y + 8.5);
  doc.text(`₹${total.toLocaleString("en-IN")}`, W - 20, y + 8.5, { align: "right" });

  y += 18;

  // Payment method badge
  const methodLabel = (payment.method || "CASH").toUpperCase();
  doc.setFillColor(ar, ag, ab);
  doc.roundedRect(12, y, 55, 9, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Paid via: ${methodLabel}`, 39.5, y + 6.5, { align: "center" });

  if (payment.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 130);
    doc.text(`Note: ${payment.notes}`, 72, y + 6.5);
  }

  // ── 9. Terms & Conditions ────────────────────────────────────────
  y += 18;
  doc.setDrawColor(220, 220, 235);
  doc.setLineWidth(0.4);
  doc.line(12, y, W - 12, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(pr, pg, pb);
  doc.text("TERMS & CONDITIONS", 12, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 145);
  doc.setFontSize(7.5);
  doc.text("• This is a computer-generated invoice and does not require a physical signature.", 12, y + 6);
  doc.text("• Please retain this invoice for future reference and membership renewal.", 12, y + 12);
  doc.text("• Membership is non-transferable and non-refundable once activated.", 12, y + 18);
  doc.text("• For queries, contact us via WhatsApp or email.", 12, y + 24);

  // ── 10. Signature lines ─────────────────────────────────────────
  y += 36;
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(0.6);
  doc.line(20, y, 80, y);
  doc.line(130, y, 190, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 130);
  doc.text("Authorized Signature", 50, y + 6, { align: "center" });
  doc.text("Member Signature", 160, y + 6, { align: "center" });

  // ── 11. Footer band ─────────────────────────────────────────────
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, H - 18, W, 18, "F");

  doc.setFillColor(ar, ag, ab);
  doc.rect(0, H - 18, W / 3, 18, "F");
  doc.setFillColor(cr, cg, cb);
  doc.rect(W / 3, H - 18, W / 3, 18, "F");
  doc.setFillColor(sr, sg, sb);
  doc.rect((W / 3) * 2, H - 18, W / 3, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Thank you for choosing ${gym.name}!`, W / 2, H - 7, { align: "center" });

  return doc;
}

export function generateBill(member: any, payment: any) {
  return generateInvoice(member, payment);
}