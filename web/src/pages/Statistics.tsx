import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons";
import { jsPDF } from "jspdf";
import { apiFetch } from "../lib/supabase";

export default function StatisticsPage() {
  const [filterMode, setFilterMode] = useState<"month" | "custom">("month");
  
  // Available months (computed dynamically or defaulted)
  const uniqueMonths = useMemo(() => {
    const list = [];
    const now = new Date();
    // Generate past 24 months
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      list.push(mStr);
    }
    return list;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => uniqueMonths[0]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [gymSettings, setGymSettings] = useState<any>({
    gym_name: "Lexus Fitness Group",
    gym_tagline: "Fitness Center & Personal Training",
    gym_address: "123 Fitness Street, City - 123456",
    gym_phone: "+91 9876543210",
    gym_email: "info@lexusfitness.com",
    gym_gst: "27AAABCU9603R1ZM",
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/statistics/summary";
      if (filterMode === "month") {
        url += `?month=${selectedMonth}`;
      } else {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await apiFetch(url);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load statistics summary:", err);
    } finally {
      setLoading(false);
    }
  }, [filterMode, selectedMonth, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await apiFetch("/api/settings/list");
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setGymSettings(data);
        }
      } catch (err) {
        console.error("Error loading settings for stats page:", err);
      }
    }
    fetchSettings();
  }, []);

  // Date Formatting Utilities
  function formatMonthName(monthStr: string) {
    if (!monthStr) return "";
    const [y, m] = monthStr.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }

  function formatMonthShort(monthStr: string) {
    if (!monthStr) return "";
    const [y, m] = monthStr.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "short" });
  }
  
  const chartTitleSuffix = useMemo(() => {
    if (filterMode === "month") {
      return formatMonthName(selectedMonth);
    }
    const labels = stats?.trends?.labels || [];
    if (labels.length <= 31) {
      const startStr = startDate ? new Date(startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) : "";
      const endStr = endDate ? new Date(endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) : "";
      return `Daily: ${startStr} - ${endStr}`;
    }
    const startStr = startDate ? new Date(startDate).toLocaleDateString("en-IN", { month: 'short', year: 'numeric' }) : "";
    const endStr = endDate ? new Date(endDate).toLocaleDateString("en-IN", { month: 'short', year: 'numeric' }) : "";
    return `Monthly: ${startStr} - ${endStr}`;
  }, [filterMode, selectedMonth, startDate, endDate, stats]);

  // Hover stats for interactive charts
  const [hoveredPoint, setHoveredPoint] = useState<null | {
    x: number;
    y: number;
    val: number;
    label: string;
  }>(null);

  const [hoveredBar, setHoveredBar] = useState<null | {
    x: number;
    y: number;
    val: number;
    type: string;
    month: string;
  }>(null);

  // SVG Line Chart Constants
  const lineChartWidth = 500;
  const lineChartHeight = 200;
  const chartPadding = 30;

  const lineChartPoints = useMemo(() => {
    if (!stats || !stats.trends) return [];
    const labels = stats.trends.labels || [];
    const revs = stats.trends.revenue || [];
    const maxVal = Math.max(...revs, 1000);
    return labels.map((l: string, i: number) => {
      const x = chartPadding + (i * (lineChartWidth - 2 * chartPadding)) / (labels.length - 1 || 1);
      const y = lineChartHeight - chartPadding - ((revs[i] || 0) / maxVal) * (lineChartHeight - 2 * chartPadding);
      return { x, y, val: revs[i] || 0, label: l };
    });
  }, [stats]);

  const linePath = useMemo(() => {
    return lineChartPoints.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [lineChartPoints]);

  const areaPath = useMemo(() => {
    if (lineChartPoints.length === 0) return "";
    return `${linePath} L ${lineChartPoints[lineChartPoints.length - 1].x} ${lineChartHeight - chartPadding} L ${lineChartPoints[0].x} ${lineChartHeight - chartPadding} Z`;
  }, [lineChartPoints, linePath]);

  // SVG Bar Chart Constants
  const barChartWidth = 500;
  const barChartHeight = 200;
  const barPadding = 35;

  const barChartLayout = useMemo(() => {
    if (!stats || !stats.trends) return [];
    const labels = stats.trends.labels || [];
    const adms = stats.trends.admissions || [];
    const renw = stats.trends.renewals || [];
    const maxVal = Math.max(...adms, ...renw, 5);
    const slotWidth = (barChartWidth - 2 * barPadding) / (labels.length || 1);
    const spaceBetween = Math.max(1, Math.min(4, slotWidth * 0.15));
    const barWidth = Math.max(1.5, Math.min(14, (slotWidth * 0.85 - spaceBetween) / 2));

    return labels.map((l: string, i: number) => {
      const slotCenter = barPadding + i * slotWidth + slotWidth / 2;
      const h1 = ((adms[i] || 0) / maxVal) * (barChartHeight - 2 * barPadding);
      const h2 = ((renw[i] || 0) / maxVal) * (barChartHeight - 2 * barPadding);

      const x1 = slotCenter - barWidth - spaceBetween / 2;
      const y1 = barChartHeight - barPadding - h1;

      const x2 = slotCenter + spaceBetween / 2;
      const y2 = barChartHeight - barPadding - h2;

      return {
        month: l,
        new: { x: x1, y: y1, w: barWidth, h: h1, val: adms[i] || 0 },
        renewal: { x: x2, y: y2, w: barWidth, h: h2, val: renw[i] || 0 },
        slotCenter,
      };
    });
  }, [stats]);

  // Donut SVG component logic
  function DonutChart({
    data,
    total,
  }: {
    data: { value: number; color: string; label: string }[];
    total: number;
  }) {
    const radius = 50;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercentage = 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="var(--border)"
              strokeWidth={strokeWidth}
            />
            {data.map((item, idx) => {
              if (item.value <= 0 || total === 0) return null;
              const percentage = (item.value / total) * 100;
              const strokeLength = (percentage / 100) * circumference;
              const strokeOffset = circumference - (accumulatedPercentage / 100) * circumference;
              accumulatedPercentage += percentage;

              return (
                <circle
                  key={idx}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  transform="rotate(-90 70 70)"
                  style={{
                    transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              );
            })}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)" }}>
              {total > 100000 ? `₹${(total / 1000).toFixed(0)}k` : `₹${total.toLocaleString("en-IN")}`}
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%", fontSize: "0.8rem" }}>
          {data.map((item, idx) => {
            if (item.value === 0) return null;
            return (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  {item.label}
                </span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>
                  ₹{item.value.toLocaleString("en-IN")} ({((item.value / (total || 1)) * 100).toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // PDF Exporter Function
  function handlePdfExport() {
    if (!stats) return;
    const doc = new jsPDF();
    const primaryColor = [99, 102, 241]; // Indigo RGB
    const textColor = [31, 41, 55]; // Slate-800
    const mutedTextColor = [107, 114, 128]; // Slate-500

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let y = 15;

    // Draw top branding line
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 5, "F");

    // Gym Title & Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(gymSettings.gym_name || "Lexus Fitness Group", 15, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(gymSettings.gym_tagline || "Fitness Center & Personal Training", 15, y + 16);
    doc.text(`Address: ${gymSettings.gym_address || "N/A"}`, 15, y + 21);
    doc.text(`Phone: ${gymSettings.gym_phone || "N/A"} | GST: ${gymSettings.gym_gst || "N/A"}`, 15, y + 26);

    // Document Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(
      filterMode === "month" ? "MONTHLY REVENUE REPORT" : "REVENUE PERFORMANCE REPORT",
      pageWidth - 15,
      y + 10,
      { align: "right" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    
    const periodLabel = filterMode === "month"
      ? `Report Month: ${formatMonthName(selectedMonth)}`
      : `Period: ${new Date(startDate).toLocaleDateString("en-IN")} - ${new Date(endDate).toLocaleDateString("en-IN")}`;
      
    doc.text(periodLabel, pageWidth - 15, y + 16, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 15, y + 22, { align: "right" });

    // Header divider line
    y += 32;
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y, pageWidth - 15, y);

    // 1. Executive Summary Grid
    y += 10;
    doc.setFillColor(249, 250, 251); // Soft gray background
    doc.rect(15, y, pageWidth - 30, 36, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, y, pageWidth - 30, 36, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("EXECUTIVE FINANCIAL OVERVIEW", 20, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text("Total Collections", 20, y + 18);
    doc.text(filterMode === "month" ? "New Admissions Revenue" : "Period Joins Revenue", 80, y + 18);
    doc.text("Renewals Revenue", 145, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`INR ${(stats.kpis?.total_revenue || 0).toLocaleString("en-IN")}`, 20, y + 26);
    doc.text(`INR ${(stats.kpis?.new_joins_revenue || 0).toLocaleString("en-IN")} (${stats.kpis?.new_joins_count || 0} joins)`, 80, y + 26);
    doc.text(`INR ${(stats.kpis?.renewals_revenue || 0).toLocaleString("en-IN")}`, 145, y + 26);

    // 2. Dual breakdown grids
    y += 48;

    // Plan breakdown table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("PLAN SALES", 15, y);

    y += 5;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 85, 6, "F");
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Plan Name", 18, y + 4.5);
    doc.text("Active Count", 60, y + 4.5);

    y += 6;
    doc.setFont("helvetica", "normal");
    if (stats.breakdowns?.plans) {
      Object.entries(stats.breakdowns.plans).forEach(([planLabel, count]: [string, any]) => {
        doc.text(planLabel, 18, y + 4.5);
        doc.text(String(count), 60, y + 4.5);
        doc.line(15, y + 6, 100, y + 6);
        y += 6;
      });
    }

    // Payment methods table (right column)
    let yRight = y - ((stats.breakdowns?.plans ? Object.keys(stats.breakdowns.plans).length : 0) * 6 + 6 + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("PAYMENT MODES", 110, yRight);

    yRight += 5;
    doc.setFillColor(243, 244, 246);
    doc.rect(110, yRight, 85, 6, "F");
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Method", 113, yRight + 4.5);
    doc.text("Transactions", 150, yRight + 4.5);

    yRight += 6;
    doc.setFont("helvetica", "normal");
    if (stats.breakdowns?.methods) {
      Object.entries(stats.breakdowns.methods).forEach(([methodLabel, count]: [string, any]) => {
        doc.text(methodLabel, 113, yRight + 4.5);
        doc.text(String(count), 150, yRight + 4.5);
        doc.line(110, yRight + 6, 195, yRight + 6);
        yRight += 6;
      });
    }

    y = Math.max(y, yRight) + 12;

    // 3. Transactions Register
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("TRANSACTION REGISTER", 15, y);

    y += 5;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, y, pageWidth - 30, 7.5, "F");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Date", 18, y + 5);
    doc.text("Member Name", 40, y + 5);
    doc.text("Method", 92, y + 5);
    doc.text("Amount", 118, y + 5);
    doc.text("Notes / References", 143, y + 5);

    y += 7.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const txns = stats.transactions || [];
    txns.forEach((p: any) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 5, "F");

        y = 18;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        
        const pageHeader = filterMode === "month"
          ? `Monthly Transaction Register — ${formatMonthName(selectedMonth)}`
          : `Transaction Register — ${new Date(startDate).toLocaleDateString("en-IN")} to ${new Date(endDate).toLocaleDateString("en-IN")}`;
          
        doc.text(pageHeader, 15, y);
        doc.line(15, y + 2, pageWidth - 15, y + 2);

        y += 8;
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, y, pageWidth - 30, 7.5, "F");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("Date", 18, y + 5);
        doc.text("Member Name", 40, y + 5);
        doc.text("Method", 92, y + 5);
        doc.text("Amount", 118, y + 5);
        doc.text("Notes / References", 143, y + 5);

        y += 7.5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      }

      const dateStr = p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—";
      const name = p.name || "N/A";
      const methodStr = p.method || "CASH";
      const notes = p.notes || "—";

      doc.text(dateStr, 18, y + 4.5);
      doc.text(name, 40, y + 4.5);
      doc.text(methodStr, 92, y + 4.5);
      doc.text(`INR ${p.amount.toLocaleString("en-IN")}`, 118, y + 4.5);

      const maxNotesLen = 38;
      const notesTrimmed = notes.length > maxNotesLen ? notes.slice(0, maxNotesLen - 3) + "..." : notes;
      doc.text(notesTrimmed, 143, y + 4.5);

      doc.setDrawColor(243, 244, 246);
      doc.line(15, y + 6, pageWidth - 15, y + 6);

      y += 6;
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: "right" });
      doc.text(`${gymSettings.gym_name || "Lexus Fitness Group"} Report — Confidential`, 15, pageHeight - 8);
    }

    const saveName = filterMode === "month"
      ? `LexusGym_Report_${selectedMonth}.pdf`
      : `LexusGym_Report_${startDate}_to_${endDate}.pdf`;
      
    doc.save(saveName);
  }

  // Assemble charts datasets
  const planChartData = useMemo(() => {
    if (!stats || !stats.breakdowns?.plans) return [];
    // The backend breakdown of plans returns count of active members per plan.
    // Let's approximate plan revenue share or just show count share!
    // Since plan picker returns plans as a dictionary with labels, let's map them.
    const planPrices: Record<string, { price: number; color: string }> = {
      "Flex Plan (30 Days)": { price: 1000, color: "#06b6d4" },
      "Power Plan (90 Days)": { price: 2700, color: "#8b5cf6" },
      "Transform Plan (180 Days)": { price: 5400, color: "#f59e0b" },
      "Prime Plan (365 Days)": { price: 9999, color: "#10b981" },
      "Custom/Manual Fees": { price: 2000, color: "#ec4899" }
    };
    return Object.entries(stats.breakdowns.plans).map(([label, count]: [string, any]) => {
      const meta = planPrices[label] || { price: 1000, color: "#ec4899" };
      return {
        value: count * meta.price,
        color: meta.color,
        label
      };
    });
  }, [stats]);

  const methodChartData = useMemo(() => {
    if (!stats || !stats.breakdowns?.methods) return [];
    const colors: Record<string, string> = {
      "Cash": "#6b7280",
      "UPI/QR": "#06b6d4",
      "Card": "#8b5cf6",
      "Bank Transfer": "#10b981",
      "Online/Other": "#ec4899"
    };
    // Sum total revenue in stats to find approximate revenue per method or just count share?
    // Let's map it based on counts first. Wait, let's look at transactions to sum method revenue!
    const methodRevs: Record<string, number> = {};
    const txns = stats.transactions || [];
    txns.forEach((p: any) => {
      let methodGroup = "Online/Other";
      const m = (p.method || "").toLowerCase();
      if (m.includes("cash")) methodGroup = "Cash";
      else if (m.includes("upi")) methodGroup = "UPI/QR";
      else if (m.includes("card")) methodGroup = "Card";
      else if (m.includes("bank")) methodGroup = "Bank Transfer";
      
      methodRevs[methodGroup] = (methodRevs[methodGroup] || 0) + (p.amount || 0);
    });

    return Object.entries(stats.breakdowns.methods).map(([label]) => {
      return {
        value: methodRevs[label] || 0,
        color: colors[label] || "#ec4899",
        label
      };
    }).filter(x => x.value > 0);
  }, [stats]);

  const totalRevenue = stats?.kpis?.total_revenue || 0;
  const growthPct = stats?.kpis?.growth_pct || 0;
  const newJoinsCount = stats?.kpis?.new_joins_count || 0;
  const newJoinsRevenue = stats?.kpis?.new_joins_revenue || 0;
  const renewalsRevenue = stats?.kpis?.renewals_revenue || 0;
  const transactionCount = stats?.transactions?.length || 0;

  if (loading || !stats) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem", color: "var(--text-muted)" }}>
        <span className="spinner" style={{ width: "2rem", height: "2rem", borderWidth: "3px", borderTopColor: "var(--accent)" }} />
        Loading statistics details…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Title Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
            Gym Statistics
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Analyze revenue generation, plan distribution, and business growth.
          </p>
        </div>

        {/* Filters and Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Mode Switcher */}
          <div style={{ display: "flex", gap: "0.15rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.6rem", padding: "0.2rem" }}>
            <button
              type="button"
              onClick={() => setFilterMode("month")}
              style={{
                padding: "0.35rem 0.7rem",
                fontSize: "0.8rem",
                borderRadius: "0.45rem",
                border: "none",
                cursor: "pointer",
                background: filterMode === "month" ? "rgba(139,92,246,0.15)" : "transparent",
                color: filterMode === "month" ? "#a78bfa" : "var(--text-muted)",
                fontWeight: 600,
                transition: "all 0.15s"
              }}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("custom")}
              style={{
                padding: "0.35rem 0.7rem",
                fontSize: "0.8rem",
                borderRadius: "0.45rem",
                border: "none",
                cursor: "pointer",
                background: filterMode === "custom" ? "rgba(139,92,246,0.15)" : "transparent",
                color: filterMode === "custom" ? "#a78bfa" : "var(--text-muted)",
                fontWeight: 600,
                transition: "all 0.15s"
              }}
            >
              Range
            </button>
          </div>

          {filterMode === "month" ? (
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span style={{ position: "absolute", left: "0.75rem", color: "var(--text-muted)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                <Icon name="calendar" size={16} />
              </span>
              <select
                className="input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  fontSize: "0.9rem",
                  padding: "0.4rem 1rem 0.4rem 2.2rem",
                  minHeight: "36px",
                  width: "auto",
                  cursor: "pointer",
                  borderRadius: "0.6rem",
                }}
              >
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthName(m)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  fontSize: "0.85rem",
                  padding: "0.3rem 0.5rem",
                  minHeight: "36px",
                  width: "125px",
                  borderRadius: "0.6rem",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>to</span>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  fontSize: "0.85rem",
                  padding: "0.3rem 0.5rem",
                  minHeight: "36px",
                  width: "125px",
                  borderRadius: "0.6rem",
                  cursor: "pointer",
                }}
              />
            </div>
          )}

          <button
            onClick={handlePdfExport}
            className="btn btn-primary"
            style={{
              fontSize: "0.85rem",
              padding: "0.4rem 1rem",
              minHeight: "36px",
            }}
          >
            <Icon name="download" size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* Total Revenue */}
        <motion.div
          className="stat-card success"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ fontSize: "1.2rem", marginBottom: "0.2rem" }}>💰</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--success)" }}>
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            Total Collections ({filterMode === "month" ? formatMonthShort(selectedMonth) : "Custom Period"})
          </div>
        </motion.div>

        {/* MoM Growth Indicator */}
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={{
            borderColor: growthPct >= 0 ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)",
          }}
        >
          <div style={{ fontSize: "1.2rem", marginBottom: "0.2rem" }}>
            {growthPct >= 0 ? "📈" : "📉"}
          </div>
          <div
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: growthPct >= 0 ? "var(--success)" : "var(--danger)",
            }}
          >
            {growthPct >= 0 ? "+" : ""}
            {growthPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            {filterMode === "month" ? "Growth vs Previous Month" : `Growth vs Prior Period (${stats.period?.duration_days} days)`}
          </div>
        </motion.div>

        {/* New Admissions */}
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{ borderColor: "rgba(6,182,212,0.3)" }}
        >
          <div style={{ fontSize: "1.2rem", marginBottom: "0.2rem" }}>🤝</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent2)" }}>
            {newJoinsCount} Joins
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            New Admissions (₹{newJoinsRevenue.toLocaleString("en-IN")})
          </div>
        </motion.div>

        {/* Renewals */}
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{ borderColor: "rgba(139,92,246,0.3)" }}
        >
          <div style={{ fontSize: "1.2rem", marginBottom: "0.2rem" }}>🔄</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)" }}>
            ₹{renewalsRevenue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            Renewals Collections ({transactionCount - newJoinsCount} transactions)
          </div>
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
        {/* Custom SVG Line Chart - Revenue Trend */}
        <div className="glass" style={{ padding: "1.25rem", position: "relative" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.85rem" }}>
            📊 Revenue Growth Trend ({chartTitleSuffix})
          </h3>

          <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`}
              width="100%"
              height="200"
              style={{ overflow: "visible" }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const y = chartPadding + p * (lineChartHeight - 2 * chartPadding);
                return (
                  <line
                    key={idx}
                    x1={chartPadding}
                    y1={y}
                    x2={lineChartWidth - chartPadding}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="0.75"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Area Path */}
              {areaPath && (
                <path d={areaPath} fill="url(#chartGradient)" />
              )}

              {/* Line Path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="transparent"
                  stroke="var(--accent)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {lineChartPoints.map((pt: any, idx: number) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint?.label === pt.label ? 7 : 5}
                  fill="var(--bg)"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* X Axis Labels */}
              {lineChartPoints.map((pt: any, idx: number) => {
                const showLabel = lineChartPoints.length <= 10 || idx % Math.ceil(lineChartPoints.length / 6) === 0;
                if (!showLabel) return null;
                return (
                  <text
                    key={idx}
                    x={pt.x}
                    y={lineChartHeight - 10}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    {pt.label}
                  </text>
                );
              })}
            </svg>

            {/* Line Tooltip */}
            <AnimatePresence>
              {hoveredPoint && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    left: `${(hoveredPoint.x / lineChartWidth) * 100}%`,
                    top: hoveredPoint.y - 48,
                    transform: "translateX(-50%)",
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    padding: "0.3rem 0.5rem",
                    borderRadius: "0.4rem",
                    fontSize: "0.75rem",
                    pointerEvents: "none",
                    boxShadow: "var(--glow)",
                    zIndex: 10,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>
                    {hoveredPoint.label}
                  </div>
                  <div style={{ color: "var(--accent)", fontWeight: 700 }}>
                    ₹{hoveredPoint.val.toLocaleString("en-IN")}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dual Bar Chart - New vs Renewals */}
        <div className="glass" style={{ padding: "1.25rem", position: "relative" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.85rem" }}>
            📈 Admissions vs. Renewals ({chartTitleSuffix})
          </h3>

          <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${barChartWidth} ${barChartHeight}`}
              width="100%"
              height="200"
              style={{ overflow: "visible" }}
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const y = barPadding + p * (barChartHeight - 2 * barPadding);
                return (
                  <line
                    key={idx}
                    x1={barPadding}
                    y1={y}
                    x2={barChartWidth - barPadding}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="0.75"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Bars */}
              {barChartLayout.map((b: any, idx: number) => (
                <g key={idx}>
                  {/* New Admissions Bar */}
                  {b.new.h > 0 && (
                    <rect
                      x={b.new.x}
                      y={b.new.y}
                      width={b.new.w}
                      height={b.new.h}
                      rx="3.5"
                      fill="var(--accent2)"
                      style={{ cursor: "pointer", transition: "fill 0.2s" }}
                      onMouseEnter={() =>
                        setHoveredBar({
                          x: b.new.x + b.new.w / 2,
                          y: b.new.y,
                          val: b.new.val,
                          type: "New Admissions",
                          month: b.month,
                        })
                      }
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  )}

                  {/* Renewals Bar */}
                  {b.renewal.h > 0 && (
                    <rect
                      x={b.renewal.x}
                      y={b.renewal.y}
                      width={b.renewal.w}
                      height={b.renewal.h}
                      rx="3.5"
                      fill="var(--accent)"
                      style={{ cursor: "pointer", transition: "fill 0.2s" }}
                      onMouseEnter={() =>
                        setHoveredBar({
                          x: b.renewal.x + b.renewal.w / 2,
                          y: b.renewal.y,
                          val: b.renewal.val,
                          type: "Renewals",
                          month: b.month,
                        })
                      }
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  )}
                </g>
              ))}

              {/* X Axis Labels */}
              {barChartLayout.map((b: any, idx: number) => {
                const showLabel = barChartLayout.length <= 10 || idx % Math.ceil(barChartLayout.length / 6) === 0;
                if (!showLabel) return null;
                return (
                  <text
                    key={idx}
                    x={b.slotCenter}
                    y={barChartHeight - 12}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    {b.month}
                  </text>
                );
              })}
            </svg>

            {/* Bar Tooltip */}
            <AnimatePresence>
              {hoveredBar && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    left: `${(hoveredBar.x / barChartWidth) * 100}%`,
                    top: hoveredBar.y - 48,
                    transform: "translateX(-50%)",
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    padding: "0.3rem 0.5rem",
                    borderRadius: "0.4rem",
                    fontSize: "0.75rem",
                    pointerEvents: "none",
                    boxShadow: "var(--glow)",
                    zIndex: 10,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>
                    {hoveredBar.month}
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>{hoveredBar.type}:</span>
                    <span style={{ fontWeight: 700, color: hoveredBar.type === "Renewals" ? "var(--accent)" : "var(--accent2)" }}>
                      {hoveredBar.val} transactions
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bar Legend */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem", fontSize: "0.8rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent2)" }} />
              New Admissions
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
              Renewals
            </span>
          </div>
        </div>
      </div>

      {/* Donuts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
        {/* Plans Distribution Donut */}
        <div className="glass" style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
            📦 Plans Sales Share
          </h3>
          <DonutChart data={planChartData} total={totalRevenue} />
        </div>

        {/* Methods Distribution Donut */}
        <div className="glass" style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
            💳 Payment Methods Share
          </h3>
          <DonutChart data={methodChartData} total={totalRevenue} />
        </div>
      </div>

      {/* Transaction Register Details */}
      <div className="glass" style={{ padding: "1.25rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.85rem" }}>
          📃 Transaction Log ({transactionCount} transactions)
        </h3>

        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Date</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Member</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Method</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Amount</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Notes / Plan</th>
              </tr>
            </thead>
            <tbody>
              {transactionCount === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No transactions recorded in this period.
                  </td>
                </tr>
              ) : (
                stats.transactions.map((p: any) => {
                  const dateStr = p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—";
                  const methodLabel = p.method === "UPI" ? "UPI / QR" : p.method === "CARD" ? "Card" : p.method === "BANK" ? "Bank Transfer" : "Cash";

                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.65rem 0.5rem" }}>{dateStr}</td>
                      <td style={{ padding: "0.65rem 0.5rem", fontWeight: 600, color: "var(--text)" }}>{p.name}</td>
                      <td style={{ padding: "0.65rem 0.5rem" }}>{methodLabel}</td>
                      <td style={{ padding: "0.65rem 0.5rem", fontWeight: 700, color: "var(--success)" }}>
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "0.65rem 0.5rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {p.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
