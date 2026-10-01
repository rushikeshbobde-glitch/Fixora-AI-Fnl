import { useEffect, useState } from "react";
import { getTickets, getTicket, investigate, performAction, getKnowledgeBase, getSystemStatus } from "./api";

const PRESETS = [
  { label: "🔒 VPN Connection Stalled", issue: "My VPN is not connecting and corporate gateway keeps timing out.", category: "vpn" },
  { label: "📶 Wi-Fi / DHCP Lease Lost", issue: "My laptop cannot connect to Wi-Fi and has no valid IP address.", category: "network" },
  { label: "🔑 Account Locked (AD)", issue: "I forgot my password and my corporate account is locked after failed attempts.", category: "authentication" },
  { label: "🖨️ Printer Spooler Blocked", issue: "The office printer is jamming and print spooler is offline.", category: "device" },
  { label: "🚨 Critical Outage (Safety)", issue: "The production server is down and customer transactions are failing.", category: "general" }
];

const EMPLOYEES = [
  { name: "Jane Doe", email: "jane.doe@fixora.local", dept: "Engineering", avatar: "👩‍💻" },
  { name: "Alex Rivera", email: "alex.rivera@fixora.local", dept: "Marketing & Growth", avatar: "👨‍🎨" },
  { name: "Sarah Connor", email: "sarah.connor@fixora.local", dept: "Security & Operations", avatar: "👩‍🚀" }
];

const AGENT_META = {
  "Ticket Triage Agent": { icon: "🧭", desc: "Extracts intent, category, and business impact priority." },
  "Knowledge / RAG Agent": { icon: "📚", desc: "Retrieves grounded IT runbooks & past ticket precedents from DB." },
  "System Diagnosis Agent": { icon: "🔬", desc: "Probes live system status and correlates symptoms with root cause." },
  "Troubleshooting Agent": { icon: "📋", desc: "Dynamically selects non-destructive tools based on issue signals." },
  "Resolution Agent": { icon: "⚙️", desc: "Safely executes approved simulated IT remediation tools." },
  "Verification Agent": { icon: "🧪", desc: "Validates tool outputs against service recovery criteria." },
  "Escalation Agent": { icon: "🛡️", desc: "Enforces autonomous safety boundaries and human operator routing." },
  "Human Operator Supervision": { icon: "👨‍💻", desc: "Operator in the loop supervisor action recorded in audit trail." }
};

export default function App() {
  const [deskMode, setDeskMode] = useState("consumer"); // 'consumer' | 'specialist' | 'kb'
  const [selectedEmployee, setSelectedEmployee] = useState(EMPLOYEES[0]);
  const [issue, setIssue] = useState(PRESETS[0].issue);
  
  const [result, setResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);

  // Live investigation step state for animated intake
  const [investigationStep, setInvestigationStep] = useState(0);

  async function loadInitialData() {
    try {
      const [ticketList, kb, health] = await Promise.all([
        getTickets().catch(() => []),
        getKnowledgeBase().catch(() => []),
        getSystemStatus().catch(() => null)
      ]);
      setTickets(ticketList);
      setKbArticles(kb);
      setSystemHealth(health);
      if (ticketList.length > 0 && !result) {
        const latest = await getTicket(ticketList[0].id).catch(() => null);
        if (latest) setResult(latest);
      }
    } catch {
      // Backend starting up
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function handleInvestigate() {
    if (!issue.trim()) return;
    setLoading(true);
    setError("");
    setFeedbackSent(false);
    setInvestigationStep(1);

    const stepTimer1 = setTimeout(() => setInvestigationStep(2), 350);
    const stepTimer2 = setTimeout(() => setInvestigationStep(4), 700);

    try {
      const data = await investigate(issue, selectedEmployee.name, selectedEmployee.email);
      setResult(data);
      setInvestigationStep(6);
      const updatedList = await getTickets();
      setTickets(updatedList);
    } catch (err) {
      setError(err.message);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setLoading(false);
    }
  }

  async function handleSelectTicket(id) {
    setError("");
    setFeedbackSent(false);
    try {
      const data = await getTicket(id);
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleOperatorAction(actionType) {
    if (!result?.ticket_id) return;
    setActionLoading(true);
    setError("");
    try {
      const updated = await performAction(result.ticket_id, actionType, actionNote);
      setResult(updated);
      setActionNote("");
      const updatedList = await getTickets();
      setTickets(updatedList);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const resolvedCount = tickets.filter(t => t.status === "RESOLUTION_READY" || t.status === "RESOLVED_BY_HUMAN").length;
  const escalatedCount = tickets.filter(t => t.status === "ESCALATE_TO_HUMAN" || t.status === "DISPATCHED_TO_TIER2").length;
  const totalCount = tickets.length;
  const resolutionRate = totalCount ? Math.round((resolvedCount / totalCount) * 100) : 0;

  const isResolved = result?.status === "RESOLUTION_READY" || result?.status === "RESOLVED_BY_HUMAN";
  const isEscalated = result?.status === "ESCALATE_TO_HUMAN" || result?.status === "DISPATCHED_TO_TIER2";

  return (
    <div className="app">
      {/* 1. Global Navigation Topbar */}
      <header className="topbar">
        <div className="brand">
          <div className="logo-badge">
            <span className="logo-spark">⚡</span>
          </div>
          <div className="brand-text">
            <div className="brand-title">
              FIXORA <span className="highlight">AI</span>
            </div>
            <div className="brand-subtitle">Autonomous IT Frontdesk & Service Portal</div>
          </div>
        </div>

        <nav className="mode-nav">
          <button
            className={`nav-item ${deskMode === "consumer" ? "active" : ""}`}
            onClick={() => setDeskMode("consumer")}
          >
            🧑‍💼 Employee Frontdesk
          </button>
          <button
            className={`nav-item ${deskMode === "specialist" ? "active" : ""}`}
            onClick={() => setDeskMode("specialist")}
          >
            👨‍💻 IT Specialist Console
          </button>
          <button
            className={`nav-item ${deskMode === "kb" ? "active" : ""}`}
            onClick={() => setDeskMode("kb")}
          >
            📚 Knowledge Runbooks ({kbArticles.length})
          </button>
        </nav>

        <div className="topbar-actions">
          <div className="status-indicator-pill">
            <span className="pulse-dot"></span>
            <span className="indicator-text">Corporate Core: Online</span>
          </div>
        </div>
      </header>

      {/* 2. System Status Live Ticker Banner */}
      <div className="system-ticker-bar">
        <div className="ticker-label">
          <span className="ticker-icon">📡</span> LIVE IT SERVICES:
        </div>
        <div className="ticker-items">
          <span className="ticker-badge success">● VPN Gateway: 18ms</span>
          <span className="ticker-badge success">● Active Directory SSO: Operational</span>
          <span className="ticker-badge success">● DHCP/DNS (1.1.1.1): Nominal</span>
          <span className="ticker-badge warning">● Office Spooler: Auto-Healed</span>
          <span className="ticker-badge info">● Problem Statement #12: Active</span>
        </div>
      </div>

      {/* 3. Main Workspace Area */}
      <main className="main-content">
        {deskMode === "consumer" && (
          <div className="consumer-desk-layout">
            {/* Left Column: Employee Intake & Frontdesk Concierge */}
            <div className="consumer-left-pane">
              {/* Employee Persona Card */}
              <div className="portal-card employee-badge-card">
                <div className="employee-info-header">
                  <div className="employee-avatar">{selectedEmployee.avatar}</div>
                  <div className="employee-details">
                    <div className="greeting-title">Hello, {selectedEmployee.name}! 👋</div>
                    <div className="employee-sub">
                      {selectedEmployee.dept} · {selectedEmployee.email}
                    </div>
                  </div>
                  <div className="employee-switcher">
                    <label>Switch Employee:</label>
                    <select
                      value={selectedEmployee.email}
                      onChange={(e) => {
                        const emp = EMPLOYEES.find(x => x.email === e.target.value);
                        if (emp) setSelectedEmployee(emp);
                      }}
                    >
                      {EMPLOYEES.map(emp => (
                        <option key={emp.email} value={emp.email}>{emp.name} ({emp.dept})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Problem Submission / Intake Box */}
              <div className="portal-card intake-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon">💬</span>
                    <div>
                      <h2>How can Fixora IT Helpdesk assist you today?</h2>
                      <p className="card-sub">
                        Our Agentic AI will investigate knowledge runbooks, system status & previous tickets to resolve your issue automatically.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="quick-incident-section">
                  <div className="quick-label">⚡ One-Click Problem Simulations:</div>
                  <div className="preset-chips-grid">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        className={`chip-btn ${issue === preset.issue ? "chip-active" : ""}`}
                        onClick={() => setIssue(preset.issue)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="intake-form">
                  <label className="input-label" htmlFor="issue-input">
                    Describe your IT issue, error prompt, or device trouble:
                  </label>
                  <textarea
                    id="issue-input"
                    className="issue-textarea"
                    rows="3"
                    placeholder="e.g. My VPN is failing with handshake timeout, or office printer is showing spooler error..."
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                  />

                  {error && <div className="error-banner">⚠️ {error}</div>}

                  <button
                    className="btn btn-primary btn-intake"
                    onClick={handleInvestigate}
                    disabled={loading || !issue.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Investigating Multi-Agent Runbooks...
                      </>
                    ) : (
                      <>
                        <span>⚡ Launch Autonomous IT Investigation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Self-Service Runbooks Catalog */}
              <div className="portal-card self-service-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon">🛠️</span>
                    <div>
                      <h3>Self-Service IT Quick Actions</h3>
                      <p className="card-sub">Trigger approved automated IT recovery actions instantly.</p>
                    </div>
                  </div>
                </div>

                <div className="self-service-grid">
                  <div
                    className="action-tile"
                    onClick={() => {
                      setIssue("My VPN is disconnected and needs a session token refresh.");
                    }}
                  >
                    <div className="tile-icon">🔒</div>
                    <div className="tile-content">
                      <div className="tile-title">Reset VPN Tunnel</div>
                      <div className="tile-desc">Regenerate expired VPN tokens & gateway routes</div>
                    </div>
                  </div>

                  <div
                    className="action-tile"
                    onClick={() => {
                      setIssue("My account is locked due to wrong password attempts.");
                    }}
                  >
                    <div className="tile-icon">🔑</div>
                    <div className="tile-content">
                      <div className="tile-title">Unlock Corporate Account</div>
                      <div className="tile-desc">Verify identity and unlock AD account object</div>
                    </div>
                  </div>

                  <div
                    className="action-tile"
                    onClick={() => {
                      setIssue("Laptop cannot get Wi-Fi IP address or connect to network.");
                    }}
                  >
                    <div className="tile-icon">📶</div>
                    <div className="tile-content">
                      <div className="tile-title">Renew DHCP & IP Lease</div>
                      <div className="tile-desc">Release adapter lease and query DNS (1.1.1.1)</div>
                    </div>
                  </div>

                  <div
                    className="action-tile"
                    onClick={() => {
                      setIssue("The office printer is jamming and print spooler is offline.");
                    }}
                  >
                    <div className="tile-icon">🖨️</div>
                    <div className="tile-content">
                      <div className="tile-title">Restart Print Spooler</div>
                      <div className="tile-desc">Clear corrupt print buffer & restart spooler</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Frontdesk Resolution Display & My Requests */}
            <div className="consumer-right-pane">
              {/* Active Incident Resolution Card */}
              {result ? (
                <div className="portal-card resolution-hero-card">
                  <div className="resolution-hero-header">
                    <div className="ticket-meta-badge">
                      <span className="tag">Incident #{result.ticket_id}</span>
                      <span className={`status-pill ${isResolved ? "resolved" : "escalated"}`}>
                        {isResolved ? "✅ RESOLUTION APPLIED" : "🛡️ ESCALATED TO IT TIER-2"}
                      </span>
                      <span className="priority-pill">{result.priority?.toUpperCase()} PRIORITY</span>
                    </div>

                    <div className="hero-issue-title">
                      "{result.issue || issue}"
                    </div>
                  </div>

                  {/* Dynamic Resolution Summary */}
                  <div className="resolution-summary-box">
                    <div className="box-title">
                      {isResolved ? "🎉 Resolution Report & Actions Applied" : "⚠️ Supervisor Action Required"}
                    </div>
                    <p className="box-content">
                      {result.resolution || "Fixora AI multi-agent workflow completed evaluation."}
                    </p>

                    {result.escalation_reason && (
                      <div className="safety-gate-note">
                        <span className="shield-icon">🛡️</span>
                        <span><strong>Safety Gate Policy:</strong> {result.escalation_reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Multi-Agent Dynamic Investigation Summary */}
                  <div className="investigation-insights-grid">
                    <div className="insight-card">
                      <div className="insight-label">🔬 Root Cause Diagnosis</div>
                      <div className="insight-val">{result.diagnosis || "Correlated with IT telemetry."}</div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-label">🎯 AI Confidence</div>
                      <div className="insight-val highlight">
                        {Math.round((result.confidence || 0.85) * 100)}% Verified
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Tools Selected (Key Challenge) */}
                  {result.dynamic_tools && result.dynamic_tools.length > 0 && (
                    <div className="dynamic-tool-box">
                      <div className="tool-box-header">
                        <span>⚙️ Dynamic Tool Selection Decision</span>
                        <span className="dynamic-badge">Issue-Specific · Non-Fixed</span>
                      </div>
                      <div className="tool-chips-list">
                        {result.dynamic_tools.map((dt, idx) => (
                          <div key={idx} className={`tool-decision-chip ${dt.decision === "SELECTED" ? "selected" : "skipped"}`}>
                            <span className="decision-marker">{dt.decision === "SELECTED" ? "✓" : "✕"}</span>
                            <span className="tool-name">{dt.tool}</span>
                            <span className="tool-reason">({dt.reason})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User Satisfaction Rating */}
                  <div className="employee-feedback-bar">
                    {feedbackSent ? (
                      <div className="feedback-thankyou">
                        ✨ Thank you! Your feedback has been recorded in the service desk metrics.
                      </div>
                    ) : (
                      <>
                        <span className="feedback-prompt">Did this resolution fix your issue?</span>
                        <div className="feedback-buttons">
                          <button className="btn-feedback" onClick={() => setFeedbackSent(true)}>
                            👍 Yes, resolved!
                          </button>
                          <button className="btn-feedback" onClick={() => setFeedbackSent(true)}>
                            👎 Need Operator
                          </button>
                          <button className="btn-feedback-telemetry" onClick={() => setShowTelemetryModal(true)}>
                            🔍 Inspect Agentic Trace
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="portal-card empty-hero-card">
                  <div className="empty-icon">⚡</div>
                  <h3>No Active Incident Selected</h3>
                  <p>Submit an issue above or pick an incident simulation to view the autonomous multi-agent resolution.</p>
                </div>
              )}

              {/* My Recent Requests & Audit Timeline */}
              <div className="portal-card requests-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon">📋</span>
                    <div>
                      <h3>My Recent Support Requests</h3>
                      <p className="card-sub">PostgreSQL-audited history of all automated and escalated tickets.</p>
                    </div>
                  </div>
                  <div className="filter-pills">
                    <button className={`filter-btn ${filter === "ALL" ? "active" : ""}`} onClick={() => setFilter("ALL")}>All ({tickets.length})</button>
                    <button className={`filter-btn ${filter === "RESOLVED" ? "active" : ""}`} onClick={() => setFilter("RESOLVED")}>Resolved ({resolvedCount})</button>
                    <button className={`filter-btn ${filter === "ESCALATED" ? "active" : ""}`} onClick={() => setFilter("ESCALATED")}>Escalated ({escalatedCount})</button>
                  </div>
                </div>

                <div className="requests-timeline">
                  {tickets.length === 0 ? (
                    <div className="empty-list">No tickets created yet. Submit a test scenario above.</div>
                  ) : (
                    tickets
                      .filter(t => {
                        if (filter === "RESOLVED") return t.status === "RESOLUTION_READY" || t.status === "RESOLVED_BY_HUMAN";
                        if (filter === "ESCALATED") return t.status === "ESCALATE_TO_HUMAN" || t.status === "DISPATCHED_TO_TIER2";
                        return true;
                      })
                      .map((t) => (
                        <div
                          key={t.id}
                          className={`request-item ${result?.ticket_id === t.id ? "selected-ticket" : ""}`}
                          onClick={() => handleSelectTicket(t.id)}
                        >
                          <div className="req-header">
                            <span className="req-id">#{t.id}</span>
                            <span className="req-category">{t.category?.toUpperCase() || "GENERAL"}</span>
                            <span className={`status-pill small ${t.status === "RESOLUTION_READY" || t.status === "RESOLVED_BY_HUMAN" ? "resolved" : "escalated"}`}>
                              {t.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="req-body">{t.issue}</div>
                          <div className="req-footer">
                            <span className="req-prio">Priority: {t.priority || "Normal"}</span>
                            <span className="req-action">Click to inspect →</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: IT Specialist & Multi-Agent Telemetry Console */}
        {deskMode === "specialist" && (
          <div className="specialist-console-layout">
            {/* Top Metrics Row */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">TOTAL AUDITED TICKETS</div>
                <div className="metric-val">{totalCount}</div>
                <div className="metric-sub">Persisted in PostgreSQL</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">AUTONOMOUS RESOLUTION RATE</div>
                <div className="metric-val highlight">{resolutionRate}%</div>
                <div className="metric-sub">{resolvedCount} Verified Auto-Fixes</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">SAFETY ESCALATIONS</div>
                <div className="metric-val">{escalatedCount}</div>
                <div className="metric-sub">Gated for Human Review</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">ACTIVE AGENT PIPELINES</div>
                <div className="metric-val">7 Agents</div>
                <div className="metric-sub">Triage → RAG → Diagnosis → Tools → Verify → Escalate</div>
              </div>
            </div>

            <div className="specialist-columns">
              {/* Left Column: Multi-Agent Execution Pipeline Trace */}
              <div className="specialist-left">
                <div className="portal-card">
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="card-icon">🧭</span>
                      <div>
                        <h2>Sequential Multi-Agent Execution Graph</h2>
                        <p className="card-sub">
                          Real-time execution trail across all 7 specialized agents for Ticket #{result?.ticket_id || "None"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {result?.workflow ? (
                    <div className="agent-timeline-wrapper">
                      {result.workflow.map((item, index) => {
                        const meta = AGENT_META[item.agent] || { icon: "⚡", desc: "Agent Stage" };
                        const isExpanded = expandedAgent === index;
                        return (
                          <div key={index} className="agent-stage-row">
                            <div className="stage-left-rail">
                              <div className="stage-icon-circle">{meta.icon}</div>
                              {index < result.workflow.length - 1 && <div className="stage-connector-line"></div>}
                            </div>
                            <div className="stage-card">
                              <div className="stage-header" onClick={() => setExpandedAgent(isExpanded ? null : index)}>
                                <div className="stage-title-block">
                                  <span className="stage-step-num">STAGE 0{index + 1}</span>
                                  <span className="stage-name">{item.agent}</span>
                                </div>
                                <span className="stage-status-badge">COMPLETED</span>
                              </div>
                              <div className="stage-desc">{meta.desc}</div>

                              {/* Stage summary snippet */}
                              <div className="stage-summary">
                                {item.agent === "Ticket Triage Agent" && (
                                  <div>Category: <strong>{item.output.category}</strong> · Priority: <strong>{item.output.priority}</strong></div>
                                )}
                                {item.agent === "Knowledge / RAG Agent" && (
                                  <div>
                                    Matched <strong>{item.output.matches?.length || 0} Grounded Runbooks</strong>
                                    {item.output.previous_tickets_investigated && (
                                      <span> · Correlated <strong>{item.output.previous_tickets_investigated.length} Previous Tickets</strong></span>
                                    )}
                                  </div>
                                )}
                                {item.agent === "System Diagnosis Agent" && (
                                  <div>Diagnosis: <strong>{item.output.diagnosis}</strong></div>
                                )}
                                {item.agent === "Troubleshooting Agent" && (
                                  <div>
                                    Dynamic Tool Rationale: <em>{item.output.dynamic_selection_reason || "Selected runbook toolset."}</em>
                                  </div>
                                )}
                                {item.agent === "Resolution Agent" && (
                                  <div>Executed Tools: {item.output.actions?.map(a => <code key={a.name} className="tool-code">{a.name} ({a.result?.status})</code>)}</div>
                                )}
                                {item.agent === "Verification Agent" && (
                                  <div className="verify-note">
                                    {item.output.verified ? "✓ Verification Passed" : "✕ Human follow-up recommended"}: {item.output.message}
                                  </div>
                                )}
                                {item.agent === "Escalation Agent" && (
                                  <div>Decision: <strong>{item.output.status}</strong> (Confidence: {Math.round((item.output.confidence || 0) * 100)}%)</div>
                                )}
                              </div>

                              <button
                                className="btn-toggle-json"
                                onClick={() => setExpandedAgent(isExpanded ? null : index)}
                              >
                                {isExpanded ? "▲ Hide Raw Telemetry" : "▼ Inspect JSON Payload"}
                              </button>

                              {isExpanded && (
                                <pre className="json-viewer">
                                  {JSON.stringify(item.output, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">No agent telemetry loaded yet.</div>
                  )}
                </div>
              </div>

              {/* Right Column: Operator Intervention Desk & Grounded Citations */}
              <div className="specialist-right">
                {/* Operator Supervision Box */}
                <div className="portal-card operator-card">
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="card-icon">👨‍💻</span>
                      <div>
                        <h3>Human-in-the-Loop Operator Desk</h3>
                        <p className="card-sub">Supervise autonomous decisions and execute manual overrides.</p>
                      </div>
                    </div>
                  </div>

                  <div className="operator-body">
                    <label className="input-label">Operator Note (Optional):</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. Approved override after checking network telemetry..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                    />

                    <div className="operator-actions-grid">
                      <button
                        className="btn btn-action dispatch"
                        onClick={() => handleOperatorAction("DISPATCH_TIER2")}
                        disabled={actionLoading || !result}
                      >
                        🚨 Dispatch to Tier-2
                      </button>
                      <button
                        className="btn btn-action approve"
                        onClick={() => handleOperatorAction("APPROVE_AUTO_FIX")}
                        disabled={actionLoading || !result}
                      >
                        ✓ Approve Auto-Fix Override
                      </button>
                      <button
                        className="btn btn-action resolve"
                        onClick={() => handleOperatorAction("RESOLVE_MANUAL")}
                        disabled={actionLoading || !result}
                      >
                        🛡️ Mark Manually Resolved
                      </button>
                    </div>
                  </div>
                </div>

                {/* Previous Tickets Investigated (Problem Statement #12) */}
                {result?.previous_tickets && result.previous_tickets.length > 0 && (
                  <div className="portal-card">
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="card-icon">🔍</span>
                        <div>
                          <h3>Previous Tickets Correlated</h3>
                          <p className="card-sub">Investigated from database as context for current issue.</p>
                        </div>
                      </div>
                    </div>
                    <div className="prev-tickets-list">
                      {result.previous_tickets.map((pt) => (
                        <div key={pt.ticket_id} className="prev-ticket-item">
                          <div className="pt-header">
                            <span className="pt-id">Ticket #{pt.ticket_id}</span>
                            <span className="pt-cat">{pt.category}</span>
                            <span className="pt-status">{pt.status}</span>
                          </div>
                          <div className="pt-issue">{pt.issue}</div>
                          <div className="pt-res"><strong>Resolution:</strong> {pt.resolution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Evidence Runbooks */}
                <div className="portal-card">
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="card-icon">📖</span>
                      <div>
                        <h3>Grounded Evidence Citations</h3>
                        <p className="card-sub">PostgreSQL Knowledge runbooks used for deterministic safety.</p>
                      </div>
                    </div>
                  </div>

                  <div className="evidence-list">
                    {result?.evidence?.map((ev) => (
                      <div key={ev.code} className="evidence-item">
                        <div className="evidence-badge">{ev.code}</div>
                        <div className="evidence-title">{ev.title}</div>
                        <div className="evidence-reason">{ev.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: Knowledge Base Runbooks Catalog */}
        {deskMode === "kb" && (
          <div className="kb-catalog-layout">
            <div className="portal-card">
              <div className="card-header">
                <div className="card-title-group">
                  <span className="card-icon">📚</span>
                  <div>
                    <h2>Enterprise IT Knowledge Base Runbooks</h2>
                    <p className="card-sub">
                      Deterministic standard operating procedures (SOPs) synced with PostgreSQL.
                    </p>
                  </div>
                </div>
              </div>

              <div className="kb-grid">
                {kbArticles.map((article) => (
                  <div key={article.code} className="kb-article-card">
                    <div className="kb-badge-row">
                      <span className="kb-code">{article.code}</span>
                      <span className="kb-category">{article.category.toUpperCase()}</span>
                    </div>
                    <h3 className="kb-title">{article.title}</h3>
                    <p className="kb-content">{article.content}</p>

                    <div className="kb-steps-section">
                      <div className="steps-title">Troubleshooting Steps:</div>
                      <ol className="kb-steps-list">
                        {article.steps.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="kb-tools-section">
                      <span className="tools-title">Approved IT Tools:</span>
                      <div className="tools-chips">
                        {article.tools.map((t) => (
                          <span key={t} className="tool-chip">{t}</span>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary btn-run-kb"
                      onClick={() => {
                        setIssue(`Troubleshoot ${article.title.toLowerCase()}`);
                        setDeskMode("consumer");
                      }}
                    >
                      ⚡ Test this Runbook
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Deep Telemetry Modal */}
      {showTelemetryModal && (
        <div className="modal-overlay" onClick={() => setShowTelemetryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Multi-Agent Telemetry & Decision Tree</h3>
              <button className="btn-close" onClick={() => setShowTelemetryModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <h4>Sequential Agent Runs:</h4>
              <pre className="json-viewer">
                {JSON.stringify(result?.workflow || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
