import React, { useState, useEffect } from "react";
import { generateReportPdf } from "./lib/reportPdf.js";

const STATUS_LABELS = {
  new:         { label: "New",          color: "#938C80" },
  reviewing:   { label: "Reviewing",    color: "#B0883E" },
  in_progress: { label: "In progress",  color: "#5B8FD4" },
  done:        { label: "Done",         color: "#4F7A5B" },
};

const THEME_COLORS = {
  Urban: "#4F7A5B", Energy: "#B0883E", Climate: "#5B8FD4", Health: "#A85C4A",
  Education: "#8B6FA8", Safety: "#C46A5A", Transport: "#3F8C8C", Economy: "#9E8B3F", Other: "#938C80",
};

const TOKEN_KEY = "agora_admin_token";

export default function AdminDashboard() {
  const [token, setToken]       = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn]   = useState(false);

  const [ideas, setIdeas]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterTheme, setFilterTheme]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId]     = useState(null);
  const [report, setReport]     = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const authedFetch = (url, opts = {}) => fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true); setLoginError("");
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Login failed"); setLoggingIn(false); return; }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
    } catch {
      setLoginError("Could not reach the server.");
    }
    setLoggingIn(false);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
  };

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/ideas-list");
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch {
      setIdeas([]);
    }
    setLoading(false);
  };

  useEffect(() => { if (token) loadIdeas(); }, [token]);

  const updateStatus = async (id, status) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    try {
      const res = await authedFetch("/api/idea-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.status === 401) logout();
    } catch {}
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await authedFetch("/api/synthesize-report");
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setReport(data);
    } catch {
      setReport({ report: null, ideaCount: 0 });
    }
    setReportLoading(false);
  };

  if (!token) {
    return (
      <div className="app-root admin-root">
        <header className="app-header">
          <div className="app-brand" style={{ cursor: "default" }}>
            <div className="app-logo">Ψ</div>
            <div>
              <div className="app-name">AGORA</div>
              <div className="app-tagline">Municipal Dashboard</div>
            </div>
          </div>
        </header>
        <main className="app-main admin-main" style={{ alignItems: "center" }}>
          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-title">Staff sign-in</div>
            <p className="login-desc">This dashboard is for municipal staff only. Enter the access password to continue.</p>
            <input
              type="password"
              className="modal-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
            />
            {loginError && <div className="login-error">{loginError}</div>}
            <button className="admin-btn" type="submit" disabled={loggingIn || !password.trim()} style={{ width: "100%", padding: ".75rem" }}>
              {loggingIn ? "Checking…" : "Sign in"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  const themes = ["all", ...Array.from(new Set(ideas.map(i => i.theme)))];
  const filtered = ideas.filter(i =>
    (filterTheme === "all" || i.theme === filterTheme) &&
    (filterStatus === "all" || i.status === filterStatus)
  );

  const statusCounts = ideas.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  return (
    <div className="app-root admin-root">
      <header className="app-header">
        <div className="app-brand" style={{ cursor: "default" }}>
          <div className="app-logo">Ψ</div>
          <div>
            <div className="app-name">AGORA</div>
            <div className="app-tagline">Municipal Dashboard</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".6rem" }}>
          <a href="/" className="live-pill" style={{ textDecoration: "none" }}>
            ← Back to citizen view
          </a>
          <button className="live-pill" onClick={logout} style={{ cursor: "pointer", border: "1px solid var(--ink-12)" }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="app-main admin-main">

        {/* Stats bar */}
        <div className="admin-stats-row">
          <div className="admin-stat">
            <div className="admin-stat-num">{ideas.length}</div>
            <div className="admin-stat-label">Total ideas</div>
          </div>
          {Object.entries(STATUS_LABELS).map(([key, s]) => (
            <div className="admin-stat" key={key}>
              <div className="admin-stat-num" style={{ color: s.color }}>{statusCounts[key] || 0}</div>
              <div className="admin-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Monthly report */}
        <div className="admin-section">
          <div className="admin-section-header">
            <span>Monthly synthesis report</span>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button className="admin-btn" onClick={generateReport} disabled={reportLoading || ideas.length === 0}>
                {reportLoading ? "Generating…" : "Generate report"}
              </button>
              {report?.report && (
                <button className="admin-btn ghost" onClick={() => generateReportPdf(report)}>
                  Download PDF
                </button>
              )}
            </div>
          </div>

          {report?.report && (
            <div className="report-card">
              <p className="report-summary">{report.report.executiveSummary}</p>

              {report.report.topThemes?.length > 0 && (
                <div className="report-block">
                  <span className="report-block-label">Top themes</span>
                  <div className="report-theme-grid">
                    {report.report.topThemes.map((t, i) => (
                      <div key={i} className="report-theme-card">
                        <span className="theme-dot" style={{ background: THEME_COLORS[t.theme] || "#938C80" }} />
                        <div>
                          <div className="report-theme-name">{t.theme} <span className="report-theme-count">({t.count})</span></div>
                          <div className="report-theme-insight">{t.insight}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.report.recurringConcerns?.length > 0 && (
                <div className="report-block">
                  <span className="report-block-label">Recurring concerns</span>
                  {report.report.recurringConcerns.map((c, i) => (
                    <div key={i} className="report-line">• {c}</div>
                  ))}
                </div>
              )}

              {report.report.recommendedPriorities?.length > 0 && (
                <div className="report-block">
                  <span className="report-block-label">Recommended priorities</span>
                  {report.report.recommendedPriorities.map((p, i) => (
                    <div key={i} className="report-priority">
                      <span className="report-priority-n">{i + 1}</span>{p}
                    </div>
                  ))}
                </div>
              )}

              {report.report.clusters?.length > 0 && (
                <div className="report-block">
                  <span className="report-block-label">Related idea clusters</span>
                  {report.report.clusters.map((c, i) => (
                    <div key={i} className="report-cluster">
                      <div className="report-cluster-title">{c.title}</div>
                      {c.relatedClaims?.map((claim, j) => (
                        <div key={j} className="report-cluster-claim">"{claim}"</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="report-footer-note">
                Generated {new Date(report.generatedAt).toLocaleString()} · {report.ideaCount} ideas analyzed
              </div>
            </div>
          )}

          {report && !report.report && (
            <p className="admin-empty-note">Not enough data yet to generate a synthesis.</p>
          )}
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <select className="admin-select" value={filterTheme} onChange={e => setFilterTheme(e.target.value)}>
            {themes.map(t => <option key={t} value={t}>{t === "all" ? "All themes" : t}</option>)}
          </select>
          <select className="admin-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <button className="admin-btn ghost" onClick={loadIdeas}>Refresh</button>
        </div>

        {/* Ideas list */}
        <div className="admin-section">
          {loading && <p className="admin-empty-note">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="admin-empty-note">No ideas match these filters.</p>}

          {filtered.map(idea => (
            <div key={idea.id} className="admin-idea-row">
              <div className="admin-idea-summary" onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}>
                <span className="theme-dot" style={{ background: THEME_COLORS[idea.theme] || "#938C80" }} />
                <div className="admin-idea-text">
                  <div className="admin-idea-claim">{idea.claimText}</div>
                  <div className="admin-idea-meta">
                    {idea.theme} · {idea.citizenName || "Anonymous"} · {new Date(idea.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <select
                  className="status-select"
                  value={idea.status}
                  onClick={e => e.stopPropagation()}
                  onChange={e => updateStatus(idea.id, e.target.value)}
                  style={{ color: STATUS_LABELS[idea.status]?.color, borderColor: STATUS_LABELS[idea.status]?.color }}
                >
                  {Object.entries(STATUS_LABELS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </div>

              {expandedId === idea.id && (
                <div className="admin-idea-detail">
                  <div className="detail-row"><strong>Verdict:</strong> {idea.result?.verdictSimple}</div>
                  {idea.result?.civicDossier?.proposalTitle && (
                    <div className="detail-row"><strong>Proposal:</strong> {idea.result.civicDossier.proposalTitle}</div>
                  )}
                  {idea.result?.civicDossier?.executiveSummary && (
                    <div className="detail-row">{idea.result.civicDossier.executiveSummary}</div>
                  )}
                  {idea.result?.civicDossier?.actionSteps?.length > 0 && (
                    <div className="detail-row">
                      <strong>Action plan:</strong>
                      <ul>
                        {idea.result.civicDossier.actionSteps.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

      </main>

      <footer className="app-footer">
        <span>Agora · Municipal Dashboard</span>
        <span>For internal staff use</span>
      </footer>
    </div>
  );
}
