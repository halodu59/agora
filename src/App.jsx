import React, { useState, useRef, useEffect } from "react";
import { generateCivicPdf } from "./lib/pdf.js";

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const STEPS = [
  { en: "Detecting language & translating your idea",     es: "Detectando idioma y traduciendo tu idea",       fr: "Détection de la langue et traduction" },
  { en: "Searching live sources & policy databases",      es: "Buscando fuentes en vivo y bases de datos",     fr: "Recherche de sources et bases de données" },
  { en: "Matching evidence against the claim",            es: "Cotejando evidencia con la afirmación",         fr: "Confrontation des preuves à l'affirmation" },
  { en: "Synthesizing the verdict & building your dossier", es: "Sintetizando el veredicto y construyendo tu expediente", fr: "Synthèse du verdict et construction du dossier" },
];

const EXAMPLES = [
  { tag: "Urban",   text: "Pedestrianizing the city center will destroy 30% of local businesses within two years." },
  { tag: "Energy",  text: "150 new EV fast chargers will overload the city's residential electrical grid by 200%." },
  { tag: "Climate", text: "The municipal tree canopy project reduced urban heat island temperatures by 2.4°C in summer 2025." },
];

const CHAT_SUGGESTIONS = [
  { en: "Add a counter-argument",       es: "Agrega un contraargumento",      fr: "Ajouter un contre-argument" },
  { en: "Soften the letter's tone",     es: "Suaviza el tono de la carta",    fr: "Adoucir le ton de la lettre" },
  { en: "Make it shorter",              es: "Hazlo más corto",                fr: "Raccourcir le contenu" },
  { en: "Add cost estimates",           es: "Agrega estimaciones de costo",   fr: "Ajouter des estimations de coût" },
];

const VERDICT_COLORS = {
  verified: { color: "#4F7A5B", bg: "rgba(79,122,91,.08)" },
  alert:    { color: "#A85C4A", bg: "rgba(168,92,74,.08)" },
  nuance:   { color: "#B0883E", bg: "rgba(176,136,62,.08)" },
  muted:    { color: "#938C80", bg: "rgba(147,140,128,.08)" },
};

const VERDICT_MARKS = { verified: "✓", alert: "✕", nuance: "≈", muted: "?" };

function t(obj, lang) {
  return obj?.[lang] || obj?.en || "";
}

const SPEECH_LANG = { en: "en-US", es: "es-ES", fr: "fr-FR", pt: "pt-PT", ar: "ar-SA" };

export default function App() {
  const [input, setInput]             = useState("");
  const [phase, setPhase]             = useState("idle");   // idle | loading | done
  const [step, setStep]               = useState(0);
  const [showSources, setShowSources] = useState(false);

  // ── Version history: the original analysis is version 0 and is never overwritten.
  // Each refinement via chat produces a new full structured version, kept alongside the rest.
  const [versions, setVersions]             = useState([]); // [{ label, result }]
  const [activeVersionIndex, setActiveIdx]  = useState(0);
  const result = versions[activeVersionIndex]?.result || null;

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatLoading, setChatLoading]   = useState(false);

  const [copied, setCopied]   = useState(false);
  const [showToast, setShowToast] = useState(false);

  // ── Official PDF ──
  const [showNameModal, setShowNameModal] = useState(false);
  const [citizenName, setCitizenName]     = useState("");

  // ── Submit to mairie ──
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Accessibility: voice input / voice output ──
  const [listeningField, setListeningField] = useState(null); // "main" | "chat" | null
  const [speakingId, setSpeakingId]         = useState(null);
  const recognitionRef = useRef(null);

  const chatEndRef = useRef(null);
  const timers     = useRef([]);

  const lang = result?.detectedLanguage || "en";
  const vc   = VERDICT_COLORS[result?.verdictStyle] || VERDICT_COLORS.muted;

  const speechSupported = typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (ttsSupported) window.speechSynthesis.cancel();
    recognitionRef.current?.stop();
  }, []);

  /* ── Voice input (speech-to-text) ── */
  const startListening = (field, onResult) => {
    if (!speechSupported) return;
    if (listeningField) { recognitionRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = SPEECH_LANG[lang] || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(" ");
      onResult(text);
    };
    rec.onerror = () => setListeningField(null);
    rec.onend = () => setListeningField(null);
    recognitionRef.current = rec;
    setListeningField(field);
    rec.start();
  };

  /* ── Voice output (text-to-speech) ── */
  const speak = (id, text, speakLang = lang) => {
    if (!ttsSupported || !text) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = SPEECH_LANG[speakLang] || "en-US";
    utter.rate = 0.95;
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utter);
  };

  const SpeakBtn = ({ id, text }) => {
    if (!ttsSupported || !text) return null;
    const active = speakingId === id;
    return (
      <button
        type="button"
        className={`speak-btn ${active ? "active" : ""}`}
        onClick={() => speak(id, text)}
        aria-label="Listen"
        title="Listen"
      >
        {active ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="1"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        )}
      </button>
    );
  };

  /* ── Analysis ── */
  const runAnalysis = async (claimText = input) => {
    if (!claimText.trim()) return;
    timers.current.forEach(clearTimeout);
    setPhase("loading"); setStep(0); setVersions([]); setActiveIdx(0);
    setShowSources(false); setChatMessages([]); setChatInput("");

    // Animated steps
    STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.current.push(setTimeout(() => setStep(i), i * 3800));
    });

    try {
      const res = await fetch("/api/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claimText }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      timers.current.forEach(clearTimeout);
      setStep(STEPS.length - 1);
      await delay(400);
      setVersions([{ label: null, instruction: null, result: data }]);
      setActiveIdx(0);
      setPhase("done");
    } catch (err) {
      timers.current.forEach(clearTimeout);
      setVersions([{
        label: null, instruction: null,
        result: {
          detectedLanguage: "en",
          verdict: "NETWORK ERROR", verdictStyle: "muted",
          verdictSimple: "Could not reach the server.",
          confidence: 0,
          simpleSummary: `Make sure the backend is running (npm run server). Error: ${err.message}`,
          synthesisText: "",
          proArguments: [], conArguments: [],
          civicDossier: null, eduResources: [], sources: [],
        },
      }]);
      setActiveIdx(0);
      setPhase("done");
    }
  };

  /* ── Refine: produces a new structured version, never overwrites the original ── */
  const sendChat = async (message = chatInput) => {
    if (!message.trim() || chatLoading || !result) return;
    setChatMessages(h => [...h, { role: "user", content: message }]);
    setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: input,
          previousResult: result,
          instruction: message,
          detectedLanguage: lang,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const summary = data.changeSummary || "Updated the dossier.";
      setVersions(v => [...v, { label: summary, instruction: message, result: data }]);
      setActiveIdx(versions.length); // jump to the newly created version
      setChatMessages(h => [...h, { role: "assistant", content: `✏️ ${summary}` }]);
    } catch {
      setChatMessages(h => [...h, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    }
    setChatLoading(false);
  };

  /* ── Copy letter ── */
  const copyLetter = () => {
    const text = result?.civicDossier?.petitionText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setShowToast(true);
      setTimeout(() => setCopied(false), 1800);
      setTimeout(() => setShowToast(false), 2400);
    });
  };

  /* ── Official PDF ── */
  const downloadPdf = () => {
    if (!result) return;
    generateCivicPdf({ claimText: input, result, citizenName });
    setShowNameModal(false);
  };

  /* ── Submit to mairie ── */
  const submitToMairie = async () => {
    if (!result || submitting || submitted) return;
    setSubmitting(true);
    try {
      await fetch("/api/submit-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimText: input,
          citizenName,
          result,
          detectedLanguage: lang,
        }),
      });
      setSubmitted(true);
    } catch {
      // silent fail — citizen can retry
    }
    setSubmitting(false);
  };

  /* ── Reset ── */
  const reset = () => {
    timers.current.forEach(clearTimeout);
    setPhase("idle"); setInput("");
    setVersions([]); setActiveIdx(0);
    setChatMessages([]); setChatInput(""); setStep(0);
    setSubmitted(false);
  };

  return (
    <div className="app-root">

      {/* ── Header ── */}
      <header className="app-header">
        <button className="app-brand" onClick={reset}>
          <div className="app-logo">Ψ</div>
          <div>
            <div className="app-name">AGORA</div>
            <div className="app-tagline">Vox Populi · Vox Civitatis</div>
          </div>
        </button>
        <div className="live-pill">
          <span className="pulse-dot" />
          Live research
        </div>
      </header>

      <main className="app-main">

        {/* ══ IDLE ══════════════════════════════════════════════ */}
        {phase === "idle" && (
          <div className="idle-view">

            <div>
              <h1 className="idle-title">
                Tell us your idea.<br />
                <span className="idle-title-muted">We'll help you be heard.</span>
              </h1>
              <p className="idle-desc">
                Speak or write — in any language. We check the facts and prepare your
                idea to show to the people who can act on it.
              </p>
            </div>

            {/* Input card */}
            <div className="input-card">
              <textarea
                className="input-card-textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={5}
                placeholder="Write here, or press the microphone to talk…"
              />
              <div className="input-card-footer">
                {speechSupported ? (
                  <button
                    type="button"
                    className={`mic-btn ${listeningField === "main" ? "active" : ""}`}
                    onClick={() => startListening("main", text => setInput(prev => (prev ? prev + " " : "") + text))}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    {listeningField === "main" ? "Listening…" : "Speak instead"}
                  </button>
                ) : <span className="input-card-hint">Any language · detected automatically</span>}
                <button
                  className="analyze-btn"
                  onClick={() => runAnalysis()}
                  disabled={!input.trim()}
                  style={{ opacity: input.trim() ? 1 : 0.55 }}
                >
                  Check my idea
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Examples */}
            <div>
              <div className="examples-label">
                Or try an example
                <span className="examples-label-line" />
              </div>
              <div className="examples-list">
                {EXAMPLES.map((ex, i) => (
                  <button key={i} className="example-btn"
                    onClick={() => { setInput(ex.text); runAnalysis(ex.text); }}>
                    <span className="example-tag">{ex.tag}</span>
                    {ex.text}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══ LOADING ═══════════════════════════════════════════ */}
        {phase === "loading" && (
          <div className="loading-view">
            <div className="spinner-wrap">
              <div className="spin-ring" />
              <div className="spin-ring r2" />
            </div>
            <div className="step-list">
              {STEPS.map((s, i) => {
                const isDone   = step > i;
                const isActive = step === i;
                const isPending = step < i;
                const color = isDone ? "#4F7A5B" : isActive ? "#1A1814" : "rgba(26,24,20,.32)";
                return (
                  <div key={i} className="step-row" style={{ color }}>
                    <span className="step-icon">
                      {isDone && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4F7A5B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      {isActive && <span className="step-active-dot" />}
                      {isPending && <span className="step-pending-dot" />}
                    </span>
                    {t(s, lang)}
                  </div>
                );
              })}
            </div>
            <p className="loading-note">RAG pipeline · live search · vector match · synthesis</p>
          </div>
        )}

        {/* ══ RESULTS ═══════════════════════════════════════════ */}
        {phase === "done" && result && (
          <div className="results-view">

            {/* ── Version timeline ── */}
            {versions.length > 1 && (
              <div className="version-row">
                {versions.map((v, i) => (
                  <button
                    key={i}
                    className={`version-chip ${i === activeVersionIndex ? "active" : ""}`}
                    onClick={() => setActiveIdx(i)}
                    title={v.instruction || "Original analysis"}
                  >
                    {i === 0
                      ? (lang === "es" ? "Original" : lang === "fr" ? "Original" : "Original")
                      : `v${i + 1} · ${v.label.length > 28 ? v.label.slice(0, 28) + "…" : v.label}`}
                  </button>
                ))}
              </div>
            )}

            {/* ── Claim echo ── */}
            <div className="result-section" style={{ paddingTop: 0 }}>
              <div className="claim-label-row">
                <span className="claim-label">Your idea</span>
                {result.detectedLanguage && (
                  <span className="claim-tag">{result.detectedLanguage.toUpperCase()} · detected</span>
                )}
              </div>
              <p className="claim-text">{input}</p>
            </div>

            {/* ── Verdict ── */}
            <div className="result-section">
              <div className="verdict-row">
                <div className="verdict-circle" style={{ color: vc.color, background: vc.bg, borderColor: vc.color }}>
                  {VERDICT_MARKS[result.verdictStyle] || "?"}
                </div>
                <div className="verdict-body">
                  <div className="verdict-label" style={{ color: vc.color }}>
                    {result.verdict}
                  </div>
                  <div className="verdict-headline">
                    {result.verdictSimple}
                    <SpeakBtn id="verdict" text={result.verdictSimple} />
                  </div>
                  <div className="confidence-row">
                    <div className="confidence-track">
                      <div className="confidence-fill" style={{ width: `${result.confidence}%`, background: vc.color }} />
                    </div>
                    <span className="confidence-label">{result.confidence}% confidence</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Synthesis ── */}
            {result.synthesisText && (
              <div className="result-section">
                <p className="synthesis-text">
                  {result.synthesisText}
                  <SpeakBtn id="synthesis" text={result.synthesisText} />
                </p>
              </div>
            )}

            {/* ── Pro / Con ── */}
            {(result.proArguments?.length > 0 || result.conArguments?.length > 0) && (
              <div className="result-section">
                <div className="procon-grid">
                  {result.proArguments?.length > 0 && (
                    <div>
                      <div className="procon-heading" style={{ color: "#4F7A5B" }}>
                        <span className="procon-heading-line" />
                        {lang === "es" ? "A favor" : lang === "fr" ? "Pour" : "In favor"}
                      </div>
                      {result.proArguments.map((a, i) => (
                        <div key={i} className="procon-arg">{a}</div>
                      ))}
                    </div>
                  )}
                  {result.conArguments?.length > 0 && (
                    <div>
                      <div className="procon-heading" style={{ color: "#A85C4A" }}>
                        <span className="procon-heading-line" />
                        {lang === "es" ? "Preocupaciones" : lang === "fr" ? "Objections" : "Concerns"}
                      </div>
                      {result.conArguments.map((a, i) => (
                        <div key={i} className="procon-arg">{a}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ CIVIC DOSSIER ════════════════════════════════ */}
            {result.civicDossier && (
              <div className="dossier-card">

                {/* Header */}
                <div className="dossier-header">
                  <div className="dossier-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="dossier-title">Civic Dossier</div>
                    <div className="dossier-sub">Ready to present to the people who decide.</div>
                  </div>
                </div>

                {/* Formal proposal */}
                {result.civicDossier.proposalTitle && (
                  <div className="dossier-section">
                    <span className="ds-label">Formal proposal</span>
                    <div className="proposal-title">{result.civicDossier.proposalTitle}</div>
                    {result.civicDossier.executiveSummary && (
                      <div className="proposal-summary">
                        {result.civicDossier.executiveSummary}
                        <SpeakBtn id="proposal" text={result.civicDossier.executiveSummary} />
                      </div>
                    )}
                  </div>
                )}

                {/* Key evidence */}
                {result.civicDossier.keyEvidence?.length > 0 && (
                  <div className="dossier-section">
                    <span className="ds-label">Key evidence &amp; sources</span>
                    <div className="evidence-grid">
                      {result.civicDossier.keyEvidence.map((e, i) => (
                        <div key={i} className="evidence-card">
                          <div className="evidence-stat-row">
                            <span className="evidence-stat">{e.stat}</span>
                            {e.unit && <span className="evidence-unit">{e.unit}</span>}
                          </div>
                          <div className="evidence-label">{e.label}</div>
                          <div className="evidence-source">{e.source}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scientific consensus / expert reading */}
                {result.civicDossier.scientificConsensus && (
                  <div className="dossier-section">
                    <div className="expert-box">
                      <div className="expert-label">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v18"/><path d="M3 7l9-4 9 4"/><path d="M5 9v8"/><path d="M19 9v8"/><path d="M3 17h18"/>
                        </svg>
                        Expert reading
                      </div>
                      <p className="expert-text">{result.civicDossier.scientificConsensus}</p>
                    </div>
                  </div>
                )}

                {/* Action plan */}
                {result.civicDossier.actionSteps?.length > 0 && (
                  <div className="dossier-section">
                    <span className="ds-label">Action plan</span>
                    {result.civicDossier.actionSteps.map((s, i) => (
                      <div key={i} className="action-step">
                        <span className="action-n">{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ flex: 1 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stakeholders */}
                {result.civicDossier.stakeholders?.length > 0 && (
                  <div className="dossier-section">
                    <span className="ds-label">Who to contact</span>
                    <div className="stakeholders-row">
                      {result.civicDossier.stakeholders.map((s, i) => (
                        <span key={i} className="stakeholder-chip">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ready-to-send letter */}
                {result.civicDossier.petitionText && (
                  <div className="dossier-section">
                    <div className="letter-header">
                      <span className="ds-label" style={{ marginBottom: 0 }}>Ready-to-send letter</span>
                      <div style={{ display: "flex", gap: ".5rem" }}>
                        <SpeakBtn id="letter" text={result.civicDossier.petitionText} />
                        <button className="copy-btn" onClick={copyLetter}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div className="letter-box">{result.civicDossier.petitionText}</div>
                  </div>
                )}

              </div>
            )}

            {/* ── Learn more (real Tavily URLs) ── */}
            {result.eduResources?.length > 0 && (
              <div className="result-section">
                <span className="ds-label" style={{ display:"block", marginBottom:".8rem" }}>
                  {lang === "es" ? "Aprende más" : lang === "fr" ? "Pour aller plus loin" : "Learn more"}
                </span>
                <div className="learn-grid">
                  {result.eduResources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="learn-card">
                      <span className="learn-host">{r.host}</span>
                      <span className="learn-title">{r.title}</span>
                      {r.snippet && <span className="learn-snippet">{r.snippet}</span>}
                      <span className="learn-cta">
                        Read or watch
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Sources ── */}
            {result.sources?.length > 0 && (
              <div className="result-section">
                <button className="sources-toggle" onClick={() => setShowSources(v => !v)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  <span>
                    {showSources
                      ? (lang === "es" ? "Ocultar fuentes" : lang === "fr" ? "Masquer les sources" : "Hide sources")
                      : (lang === "es" ? "Ver fuentes consultadas" : lang === "fr" ? "Voir les sources" : "Sources consulted")
                    } ({result.sources.length})
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showSources ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                </button>
                {showSources && (
                  <div className="sources-list">
                    {result.sources.map((s, i) => (
                      <div key={i} className="source-item">
                        <div className="source-meta">
                          <span className="source-cat">{s.category}</span>
                          <span className="source-score">{s.matchConfidence}</span>
                        </div>
                        <div className="source-title-line">
                          {s.url
                            ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">{s.title}</a>
                            : <span>{s.title}</span>
                          }
                        </div>
                        <p className="source-snippet">"{s.snippet.slice(0, 200)}…"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ REFINE CHAT ══════════════════════════════════ */}
            <div className="chat-section">
              <div className="chat-section-label">
                Refine with Agora
                <span />
              </div>

              {chatMessages.length > 0 && (
                <div className="chat-messages">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="chat-bubble-wrap"
                      style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div className={`chat-bubble ${msg.role === "user" ? "user" : "ai"}`}>
                        {msg.content}
                        {msg.role === "assistant" && <SpeakBtn id={`chat-${i}`} text={msg.content} />}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-thinking-wrap">
                      <div className="chat-thinking-bubble">
                        <span /><span /><span />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              <div className="chat-input-row">
                <input
                  className="chat-input"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
                  placeholder="Ask to adjust the proposal, add a counter-argument, soften the tone…"
                  disabled={chatLoading}
                />
                {speechSupported && (
                  <button
                    type="button"
                    className={`chat-mic-btn ${listeningField === "chat" ? "active" : ""}`}
                    onClick={() => startListening("chat", text => setChatInput(prev => (prev ? prev + " " : "") + text))}
                    aria-label="Speak"
                    title="Speak"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </button>
                )}
                <button className="chat-send-btn" onClick={() => sendChat()}
                  disabled={!chatInput.trim() || chatLoading}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>

              <div className="chat-suggestions">
                {CHAT_SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chat-sug-btn" onClick={() => sendChat(t(s, lang))}>
                    {t(s, lang)}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Footer actions ── */}
            <div className="footer-actions">
              <button
                className={`submit-btn ${submitted ? "done" : ""}`}
                onClick={submitToMairie}
                disabled={submitting || submitted}
              >
                {submitted ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {lang === "es" ? "Enviado a la municipalidad" : lang === "fr" ? "Envoyé à la mairie" : "Sent to your local council"}
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    {submitting
                      ? "…"
                      : (lang === "es" ? "Enviar a la municipalidad" : lang === "fr" ? "Envoyer à la mairie" : "Submit to my local council")}
                  </>
                )}
              </button>
              <button className="pdf-btn" onClick={() => setShowNameModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                {lang === "es" ? "Descargar documento oficial" : lang === "fr" ? "Télécharger le document officiel" : "Download official document"}
              </button>
              <button className="new-idea-btn" onClick={reset}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                {lang === "es" ? "Nueva idea" : lang === "fr" ? "Nouvelle idée" : "New idea"}
              </button>
            </div>

          </div>
        )}

      </main>

      <footer className="app-footer">
        <span>Agora · Civic Intelligence</span>
        <span>Evidence over noise</span>
      </footer>

      {showToast && (
        <div className="copy-toast">✓ Letter copied to clipboard</div>
      )}

      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {lang === "es" ? "Tu documento oficial" : lang === "fr" ? "Ton document officiel" : "Your official document"}
            </div>
            <p className="modal-desc">
              {lang === "es"
                ? "Tu nombre puede aparecer si la municipalidad acepta y trabaja tu idea. Esto es opcional."
                : lang === "fr"
                ? "Ton nom peut apparaître si la mairie accepte et travaille ton idée. C'est facultatif."
                : "Your name may appear if the municipality accepts and works on your idea. This is optional."}
            </p>
            <input
              className="modal-input"
              value={citizenName}
              onChange={e => setCitizenName(e.target.value)}
              placeholder={lang === "es" ? "Tu nombre (opcional)" : lang === "fr" ? "Ton nom (facultatif)" : "Your name (optional)"}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-skip-btn" onClick={downloadPdf}>
                {lang === "es" ? "Omitir" : lang === "fr" ? "Passer" : "Skip"}
              </button>
              <button className="modal-confirm-btn" onClick={downloadPdf}>
                {lang === "es" ? "Generar PDF" : lang === "fr" ? "Générer le PDF" : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
