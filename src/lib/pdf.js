import { jsPDF } from "jspdf";

const INK    = [26, 24, 20];
const WARM_1 = [87, 82, 74];
const WARM_2 = [147, 140, 128];
const GOLD   = [176, 136, 62];
const YES    = [79, 122, 91];
const NO     = [168, 92, 74];
const PAPER  = [252, 251, 246];
const LINE   = [230, 224, 210];

const VERDICT_LABEL = {
  verified: { en: "VERIFIED",  color: YES },
  alert:    { en: "ALERT",     color: NO },
  nuance:   { en: "NUANCED",   color: GOLD },
  muted:    { en: "UNCLEAR",   color: WARM_2 },
};

function wrapText(doc, text, maxWidth) {
  return doc.splitTextToSize(text || "", maxWidth);
}

function drawStamp(doc, x, y, radius, refCode, dateStr) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.circle(x, y, radius, "S");
  doc.circle(x, y, radius - 2.2, "S");

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text("AGORA", x, y - 3, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("CIVIC INTELLIGENCE", x, y + 1, { align: "center" });
  doc.text(refCode, x, y + 4.5, { align: "center" });
  doc.text(dateStr, x, y + 7.5, { align: "center" });

  // rotated micro-text ring effect (simple top/bottom labels instead of true curved text)
  doc.setFontSize(4.4);
  doc.text("· OFFICIAL RECORD ·", x, y - radius + 5, { align: "center" });
}

export function generateCivicPdf({ claimText, result, citizenName }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18; // margin
  let y = 0;

  // Background
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, W, H, "F");

  // Header band
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
  doc.text("CIVIC DOSSIER  ·  OFFICIAL CITIZEN RECORD", M, 21.5);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const refCode = `AG-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...WARM_2);
  doc.text(`Ref. ${refCode}`, W - M, 12, { align: "right" });
  doc.text(dateStr, W - M, 16, { align: "right" });

  y = 36;

  // Submitted by
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WARM_2);
  doc.text("SUBMITTED BY", M, y);
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(citizenName?.trim() || "A concerned citizen", M, y + 5.5);
  y += 13;

  // Claim box
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 254, 250);
  const claimLines = wrapText(doc, claimText, W - 2 * M - 8);
  const claimBoxH = claimLines.length * 5 + 10;
  doc.rect(M, y, W - 2 * M, claimBoxH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...WARM_2);
  doc.text("THE IDEA", M + 4, y + 6);
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(claimLines, M + 4, y + 11.5);
  y += claimBoxH + 10;

  // Verdict row
  const vinfo = VERDICT_LABEL[result.verdictStyle] || VERDICT_LABEL.muted;
  doc.setFillColor(...vinfo.color);
  doc.circle(M + 5, y + 3, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const mark = result.verdictStyle === "verified" ? "OK" : result.verdictStyle === "alert" ? "X" : "~";
  doc.text(mark, M + 5, y + 4.2, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...vinfo.color);
  doc.text(result.verdict || vinfo.en, M + 14, y + 1.5);

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  const verdictLines = wrapText(doc, result.verdictSimple, W - 2 * M - 16);
  doc.text(verdictLines, M + 14, y + 6.5);
  y += 6.5 + verdictLines.length * 5.5 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...WARM_2);
  doc.text(`${result.confidence ?? 0}% confidence`, M + 14, y);
  y += 9;

  // Synthesis
  if (result.synthesisText) {
    doc.setFont("times", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...WARM_1);
    const lines = wrapText(doc, result.synthesisText, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 5 + 8;
  }

  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 8;

  const dossier = result.civicDossier;
  if (dossier?.proposalTitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("FORMAL PROPOSAL", M, y);
    y += 5.5;
    doc.setFont("times", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...INK);
    const titleLines = wrapText(doc, dossier.proposalTitle, W - 2 * M);
    doc.text(titleLines, M, y);
    y += titleLines.length * 5.5 + 3;

    if (dossier.executiveSummary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...WARM_1);
      const sumLines = wrapText(doc, dossier.executiveSummary, W - 2 * M - 4);
      doc.text(sumLines, M + 4, y);
      y += sumLines.length * 4.6 + 8;
    }
  }

  // Evidence
  if (dossier?.keyEvidence?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("KEY EVIDENCE", M, y);
    y += 6;

    const colW = (W - 2 * M) / 3 - 3;
    dossier.keyEvidence.slice(0, 3).forEach((e, i) => {
      const x = M + i * (colW + 4.5);
      doc.setDrawColor(...LINE);
      doc.setFillColor(255, 254, 250);
      doc.rect(x, y, colW, 22, "FD");
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      doc.text(`${e.stat}${e.unit ? " " + e.unit : ""}`, x + 3, y + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...WARM_1);
      const lbl = wrapText(doc, e.label || "", colW - 6);
      doc.text(lbl.slice(0, 2), x + 3, y + 13);
      doc.setFontSize(5.5);
      doc.setTextColor(...WARM_2);
      doc.text(wrapText(doc, e.source || "", colW - 6).slice(0, 1), x + 3, y + 19.5);
    });
    y += 28;
  }

  // Action plan
  if (dossier?.actionSteps?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("ACTION PLAN", M, y);
    y += 6;
    doc.setFontSize(8.5);
    dossier.actionSteps.slice(0, 4).forEach((s, i) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GOLD);
      doc.text(String(i + 1).padStart(2, "0"), M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...WARM_1);
      const lines = wrapText(doc, s, W - 2 * M - 10);
      doc.text(lines, M + 8, y);
      y += lines.length * 4.3 + 3;
    });
    y += 4;
  }

  // New page if needed for letter + stamp
  if (y > H - 70) { doc.addPage(); doc.setFillColor(...PAPER); doc.rect(0, 0, W, H, "F"); y = 24; }

  // Petition letter box
  if (dossier?.petitionText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WARM_2);
    doc.text("READY-TO-SEND LETTER", M, y);
    y += 5;
    const letterLines = wrapText(doc, dossier.petitionText, W - 2 * M - 8);
    const boxH = Math.min(letterLines.length * 4.6 + 10, H - y - 45);
    doc.setDrawColor(...LINE);
    doc.setFillColor(255, 254, 250);
    doc.rect(M, y, W - 2 * M, boxH, "FD");
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(letterLines, M + 4, y + 6, { maxWidth: W - 2 * M - 8 });
    y += boxH + 12;
  }

  // Official stamp, bottom right
  const stampY = H - 32;
  drawStamp(doc, W - M - 18, stampY, 16, refCode, dateStr);

  // Footer note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...WARM_2);
  doc.text(
    "This document was generated by Agora Civic Intelligence from a citizen-submitted idea, cross-checked",
    M, H - 18
  );
  doc.text(
    "against live sources. If adopted for municipal review, the citizen's name may appear in the public report.",
    M, H - 14
  );
  doc.setFont("helvetica", "bold");
  doc.text("EVIDENCE OVER NOISE", M, H - 9);

  doc.save(`Agora-Dossier-${refCode}.pdf`);
}
