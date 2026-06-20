import { jsPDF } from "jspdf";
import { drawStamp } from "./pdf.js";

const INK    = [26, 24, 20];
const WARM_1 = [87, 82, 74];
const WARM_2 = [147, 140, 128];
const GOLD   = [176, 136, 62];
const YES    = [79, 122, 91];
const NO     = [168, 92, 74];
const BLUE   = [91, 143, 212];
const PAPER  = [252, 251, 246];
const LINE   = [230, 224, 210];

const THEME_COLORS = {
  Urban: YES, Energy: GOLD, Climate: BLUE, Health: NO,
  Education: [139, 111, 168], Safety: [196, 106, 90], Transport: [63, 140, 140],
  Economy: [158, 139, 63], Other: WARM_2,
};

const STATUS_COLORS = {
  new: WARM_2, reviewing: GOLD, in_progress: BLUE, done: YES,
};
const STATUS_LABELS = { new: "New", reviewing: "Reviewing", in_progress: "In progress", done: "Done" };

function wrapText(doc, text, maxWidth) {
  return doc.splitTextToSize(text || "", maxWidth);
}

function drawBarChart(doc, x, y, w, entries, colorMap, fallback) {
  const max = Math.max(...entries.map(e => e.count), 1);
  const barH = 5.5;
  const gap = 3;
  entries.forEach((e, i) => {
    const rowY = y + i * (barH + gap);
    const barW = (e.count / max) * (w - 38);
    const color = colorMap[e.key] || fallback;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text(e.label, x, rowY + barH - 1.3, { maxWidth: 30 });

    doc.setFillColor(...LINE);
    doc.rect(x + 32, rowY, w - 32, barH, "F");
    doc.setFillColor(...color);
    doc.rect(x + 32, rowY, Math.max(barW, 1.5), barH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...INK);
    doc.text(String(e.count), x + 32 + (w - 32) + 2, rowY + barH - 1.3);
  });
  return y + entries.length * (barH + gap);
}

export function generateReportPdf({ report, ideaCount, statusCounts, themeCounts, generatedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  let y = 0;

  const newPageIfNeeded = (needed) => {
    if (y + needed > H - 40) {
      doc.addPage();
      doc.setFillColor(...PAPER);
      doc.rect(0, 0, W, H, "F");
      y = 24;
    }
  };

  doc.setFillColor(...PAPER);
  doc.rect(0, 0, W, H, "F");

  // Header
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.line(M, 26, W - M, 26);

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text("AGORA", M, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WARM_2);
  doc.text("MUNICIPAL SYNTHESIS REPORT  ·  CITIZEN INPUT OVERVIEW", M, 21.5);

  const genDate = new Date(generatedAt || Date.now());
  const dateStr = genDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const refCode = `AG-RPT-${genDate.getFullYear()}${String(genDate.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`;

  doc.setFontSize(8);
  doc.text(`Ref. ${refCode}`, W - M, 12, { align: "right" });
  doc.text(dateStr, W - M, 16, { align: "right" });

  y = 36;

  // Stat strip
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text(String(ideaCount), M, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WARM_2);
  doc.text("IDEAS SUBMITTED THIS PERIOD", M + 18, y + 4);

  const statusEntries = Object.entries(statusCounts || {});
  let sx = M + 95;
  statusEntries.forEach(([key, count]) => {
    doc.setFillColor(...(STATUS_COLORS[key] || WARM_2));
    doc.circle(sx, y + 2, 1.3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...INK);
    doc.text(`${STATUS_LABELS[key] || key}: ${count}`, sx + 3, y + 3);
    sx += 32;
  });
  y += 16;

  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 10;

  // Executive summary
  if (report?.executiveSummary) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("EXECUTIVE SUMMARY", M, y);
    y += 6;
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = wrapText(doc, report.executiveSummary, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 5 + 10;
  }

  // Theme bar chart (visual)
  if (themeCounts && Object.keys(themeCounts).length > 0) {
    newPageIfNeeded(60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("IDEAS BY THEME", M, y);
    y += 7;
    const entries = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, label: key, count }));
    y = drawBarChart(doc, M, y, W - 2 * M, entries, THEME_COLORS, WARM_2) + 6;
  }

  // Status bar chart (visual)
  if (statusCounts && Object.keys(statusCounts).length > 0) {
    newPageIfNeeded(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("IDEAS BY STATUS", M, y);
    y += 7;
    const entries = Object.entries(statusCounts)
      .map(([key, count]) => ({ key, label: STATUS_LABELS[key] || key, count }));
    y = drawBarChart(doc, M, y, W - 2 * M, entries, STATUS_COLORS, WARM_2) + 8;
  }

  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 10;

  // Top themes with insight
  if (report?.topThemes?.length) {
    newPageIfNeeded(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("THEME INSIGHTS", M, y);
    y += 7;
    report.topThemes.forEach(t => {
      newPageIfNeeded(16);
      doc.setFillColor(...(THEME_COLORS[t.theme] || WARM_2));
      doc.circle(M + 1.5, y - 1, 1.3, "F");
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(`${t.theme} (${t.count})`, M + 5, y);
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...WARM_1);
      const lines = wrapText(doc, t.insight, W - 2 * M - 5);
      doc.text(lines, M + 5, y);
      y += lines.length * 4 + 5;
    });
    y += 4;
  }

  // Recurring concerns
  if (report?.recurringConcerns?.length) {
    newPageIfNeeded(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("RECURRING CONCERNS", M, y);
    y += 6;
    report.recurringConcerns.forEach(c => {
      const lines = wrapText(doc, `•  ${c}`, W - 2 * M - 4);
      newPageIfNeeded(lines.length * 4.5 + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...WARM_1);
      doc.text(lines, M, y);
      y += lines.length * 4.5 + 2;
    });
    y += 6;
  }

  // Recommended priorities
  if (report?.recommendedPriorities?.length) {
    newPageIfNeeded(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("RECOMMENDED PRIORITIES", M, y);
    y += 7;
    report.recommendedPriorities.forEach((p, i) => {
      const lines = wrapText(doc, p, W - 2 * M - 10);
      newPageIfNeeded(lines.length * 4.3 + 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...GOLD);
      doc.text(String(i + 1).padStart(2, "0"), M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...WARM_1);
      doc.text(lines, M + 8, y);
      y += lines.length * 4.3 + 3;
    });
    y += 6;
  }

  // Clusters
  if (report?.clusters?.length) {
    newPageIfNeeded(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("RELATED IDEA CLUSTERS", M, y);
    y += 7;
    report.clusters.forEach(c => {
      const claimLines = (c.relatedClaims || []).map(cl => wrapText(doc, `"${cl}"`, W - 2 * M - 8)).flat();
      const blockH = 6 + claimLines.length * 4;
      newPageIfNeeded(blockH + 4);
      doc.setDrawColor(...LINE);
      doc.setFillColor(255, 254, 250);
      doc.rect(M, y - 4, W - 2 * M, blockH, "FD");
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(c.title, M + 4, y + 1);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...WARM_2);
      doc.text(claimLines, M + 4, y + 5.5);
      y += blockH + 6;
    });
  }

  // Stamp on the last page
  newPageIfNeeded(45);
  const stampY = H - 32;
  drawStamp(doc, W - M - 18, stampY, 17, refCode, dateStr);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...WARM_2);
  doc.text("This synthesis was generated by Agora Civic Intelligence from citizen-submitted ideas collected", M, H - 18);
  doc.text("on the platform. It is intended for internal municipal review and monthly public reporting.", M, H - 14);
  doc.setFont("helvetica", "bold");
  doc.text("EVIDENCE OVER NOISE", M, H - 9);

  doc.save(`Agora-Monthly-Report-${refCode}.pdf`);
}
