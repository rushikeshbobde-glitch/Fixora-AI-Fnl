import { useEffect, useState } from "react";
import { getTickets, getTicket, investigate, performAction, getKnowledgeBase } from "./api";

const PRESETS = [
  { label: "🔒 VPN Connection Stalled", issue: "My VPN is not connecting and corporate gateway keeps timing out." },
  { label: "📶 Wi-Fi / DHCP Lease Lost", issue: "My laptop cannot connect to Wi-Fi and has no valid IP address." },
  { label: "🔑 Account Locked (AD)", issue: "I forgot my password and my corporate account is locked after failed attempts." },
  { label: "🖨️ Printer Spooler Blocked", issue: "The office printer is jamming and print spooler is offline." },
  { label: "🚨 Critical Outage (Safety)", issue: "The production server is down and customer transactions are failing." }
];

const AGENT_META = {
  "Ticket Triage Agent": { icon: "🧭", desc: "Extracts intent, category, and business impact priority." },
  "Knowledge / RAG Agent": { icon: "📚", desc: "Retrieves grounded IT runbooks & evidence from PostgreSQL." },
  "System Diagnosis Agent": { icon: "🔬", desc: "Correlates evidence with symptoms to establish root cause." },
  "Troubleshooting Agent": { icon: "📋", desc: "Generates execution sequence and selects mock IT tools." },
  "Resolution Agent": { icon: "⚙️", desc: "Safely executes approved non-destructive simulated IT actions." },
  "Verification Agent": { icon: "🧪", desc: "Validates tool outputs against health & recovery criteria." },
  "Escalation Agent": { icon: "🛡️", desc: "Enforces autonomous safety boundaries and human oversight." },
  "Human Operator Supervision": { icon: "👨‍💻", desc: "Operator in the loop action recorded in audit log." }
};

export default function App() {
  const [activeTab, setActiveTab] = useState("desk"); // 'desk' | 'kb' | 'architecture'
  const [issue, setIssue] = useState(PRESETS[0].issue);
  const [employeeName, setEmployeeName] = useState("Jane Doe");
  const [employeeEmail, setEmployeeEmail] = useState("jane.doe@fixora.local");
  
  const [result, setResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [filter, setFilter] = useState("ALL");

  async function loadInitialData() {
    try {
      const [ticketList, kb] = await Promise.all([
        getTickets().catch(() => []),
        getKnowledgeBase().catch(() => [])
      ]);
      setTickets(ticketList);
      setKbArticles(kb);
      if (ticketList.length > 0 && !result) {
        // Load the latest ticket
        const latest = await getTicket(ticketList[0].id).catch(() => null);
        if (latest) setResult(latest);
      }
    } catch {
      // Backend may be booting up
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function handleInvestigate() {
    if (!issue.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await investigate(issue, employeeName, employeeEmail);
      setResult(data);
      const updatedList = await getTickets();
      setTickets(updatedList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTicket(id) {
    setError("");
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

  const filteredTickets = tickets.filter(t => {
    if (filter === "RESOLVED") return t.status === "RESOLUTION_READY" || t.status === "RESOLVED_BY_HUMAN";
    if (filter === "ESCALATED") return t.status === "ESCALATE_TO_HUMAN" || t.status === "DISPATCHED_TO_TIER2";
    return true;
  });

  return (
    <div className="app">
      {/* Navigation Topbar */}
      <header className="topbar">
        <div className="brand">
          <div className="logo-badge">
            <span className="logo-spark">✦</span> FIXORA AI
          </div>
          <div>
            <h1>Autonomous IT Service Desk</h1>
            <p className="subtitle">Problem Statement #12 · Multi-Agent Orchestration & Deterministic Safety</p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="nav-pills">
            <button className={activeTab === "desk" ? "nav-btn active" : "nav-btn"} onClick={() => setActiveTab("desk")}>
              ⚡ Incident Desk
            </button>
            <button className={activeTab === "kb" ? "nav-btn active" : "nav-btn"} onClick={() => setActiveTab("kb")}>
              📚 Knowledge Base ({kbArticles.length})
            </button>
          </div>
          <div className="live-indicator">
            <span className="pulse-dot"></span> PostgreSQL / SQLite Sync
          </div>
        </div>
      </header>

      {/* KPI Stats Bar */}
      <section className="stats-bar">
        <div className="stat-card">
          <span className="stat-label">TOTAL INCIDENTS</span>
          <strong className="stat-value">{totalCount}</strong>
          <span className="stat-meta">Audited in Database</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">AUTO-RESOLVED RATE</span>
          <strong className="stat-value success">{resolutionRate}%</strong>
          <span className="stat-meta">{resolvedCount} Verified Resolutions</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">HUMAN ESCALATIONS</span>
          <strong className="stat-value warning">{escalatedCount}</strong>
          <span className="stat-meta">Safety-gated Incidents</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ACTIVE AGENTS</span>
          <strong className="stat-value highlight">7 Pipelines</strong>
          <span className="stat-meta">Zero Infrastructure Risk</span>
        </div>
      </section>

      <main className="container">
        {activeTab === "kb" ? (
          /* Knowledge Base Tab */
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Grounded Knowledge Base (RAG Source of Truth)</h2>
                <p>Knowledge articles stored in PostgreSQL used by the Knowledge/RAG Agent for evidence retrieval.</p>
              </div>
              <button className="secondary" onClick={loadInitialData}>Refresh KB</button>
            </div>

            <div className="kb-grid">
              {kbArticles.map((art) => (
                <div key={art.code} className="kb-card">
                  <div className="kb-badge">{art.code} · {art.category.toUpperCase()}</div>
                  <h3>{art.title}</h3>
                  <p className="kb-content">{art.content}</p>
                  
                  <div className="kb-section">
                    <strong>Approved Steps:</strong>
                    <ol>
                      {art.steps.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ol>
                  </div>

                  <div className="kb-section">
                    <strong>Registered Simulated Tools:</strong>
                    <div className="tool-chips">
                      {art.tools.map((t) => <span key={t} className="tool-chip">{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* Incident Desk Tab */
          <>
            {/* Input & Active Decision Hero Section */}
            <div className="two-column">
              {/* Left Column: Input Form */}
              <div className="panel">
                <div className="panel-header">
                  <h3>Submit New IT Incident</h3>
                  <span className="badge-agent">Agent Triage Ready</span>
                </div>

                <div className="preset-container">
                  <span className="preset-label">Test Scenarios:</span>
                  <div className="preset-chips">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className={`preset-chip ${issue === p.issue ? "selected" : ""}`}
                        onClick={() => setIssue(p.issue)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Describe Employee IT Issue:</label>
                  <textarea
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    rows={4}
                    placeholder="e.g. My VPN cannot connect or Wi-Fi DHCP lease expired..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Employee Name</label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Employee Email</label>
                    <input
                      type="email"
                      value={employeeEmail}
                      onChange={(e) => setEmployeeEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="primary-btn"
                  disabled={loading}
                  onClick={handleInvestigate}
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner"></span> Running Multi-Agent Investigation...
                    </span>
                  ) : (
                    "⚡ Investigate Ticket with Multi-Agent Pipeline"
                  )}
                </button>

                {error && <div className="error-alert">{error}</div>}
              </div>

              {/* Right Column: Decision & Safety Outcome */}
              <div className="panel decision-panel">
                <div className="panel-header">
                  <h3>Active Incident Decision</h3>
                  {result && (
                    <span className="ticket-id-tag">Ticket #{result.ticket_id}</span>
                  )}
                </div>

                {!result ? (
                  <div className="empty-state">
                    <span className="empty-icon">🔍</span>
                    <h4>No Ticket Selected</h4>
                    <p>Submit a new incident or click any ticket from the PostgreSQL history below to inspect.</p>
                  </div>
                ) : (
                  <div className="decision-content">
                    <div className="status-header">
                      <div className={`status-pill status-${result.status.toLowerCase()}`}>
                        {result.status === "RESOLUTION_READY" && "✅ RESOLUTION READY"}
                        {result.status === "ESCALATE_TO_HUMAN" && "🚨 ESCALATE TO HUMAN"}
                        {result.status === "DISPATCHED_TO_TIER2" && "👨‍💻 DISPATCHED TO TIER 2"}
                        {result.status === "RESOLVED_BY_HUMAN" && "✅ RESOLVED BY OPERATOR"}
                        {!["RESOLUTION_READY", "ESCALATE_TO_HUMAN", "DISPATCHED_TO_TIER2", "RESOLVED_BY_HUMAN"].includes(result.status) && result.status}
                      </div>

                      <div className="confidence-meter">
                        <div className="confidence-label">
                          <span>Confidence Score</span>
                          <strong>{Math.round((result.confidence || 0) * 100)}%</strong>
                        </div>
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{ width: `${Math.round((result.confidence || 0) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="info-chips-grid">
                      <div className="info-box">
                        <span className="info-label">Category</span>
                        <strong>{result.category?.toUpperCase() || "N/A"}</strong>
                      </div>
                      <div className="info-box">
                        <span className="info-label">Priority Level</span>
                        <strong className={`priority-${result.priority}`}>{result.priority?.toUpperCase() || "NORMAL"}</strong>
                      </div>
                    </div>

                    <div className="decision-block">
                      <div className="block-title">🔬 Root Cause Diagnosis</div>
                      <p className="block-text">{result.diagnosis || "Under analysis..."}</p>
                    </div>

                    <div className="decision-block">
                      <div className="block-title">⚙️ Resolution / Tool Action</div>
                      <p className="block-text">{result.resolution || "Simulated execution completed."}</p>
                    </div>

                    {result.escalation_reason && (
                      <div className="decision-block escalation-block">
                        <div className="block-title">🛡️ Safety Gate & Escalation Reason</div>
                        <p className="block-text">{result.escalation_reason}</p>
                      </div>
                    )}

                    {/* Human-in-the-Loop Operator Actions */}
                    <div className="operator-box">
                      <div className="operator-header">
                        <span>👨‍💻 Operator Supervision Controls</span>
                      </div>
                      <div className="operator-actions">
                        <button
                          className="action-btn tier2"
                          disabled={actionLoading}
                          onClick={() => handleOperatorAction("DISPATCH_TIER2")}
                        >
                          Dispatch to Tier-2
                        </button>
                        <button
                          className="action-btn approve"
                          disabled={actionLoading}
                          onClick={() => handleOperatorAction("APPROVE_AUTO_FIX")}
                        >
                          Approve Fix Override
                        </button>
                        <button
                          className="action-btn resolve"
                          disabled={actionLoading}
                          onClick={() => handleOperatorAction("RESOLVE_MANUAL")}
                        >
                          Mark Manually Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Workflow Pipeline Stepper */}
            {result && result.workflow && (
              <section className="panel pipeline-panel">
                <div className="panel-header">
                  <div>
                    <h3>Autonomous Multi-Agent Execution Trail</h3>
                    <p>Sequential audit trace across all 7 specialized agents persisted in PostgreSQL.</p>
                  </div>
                  <span className="stage-count">{result.workflow.length} Execution Stages</span>
                </div>

                {/* Horizontal Visual Pipeline Stepper */}
                <div className="pipeline-stepper">
                  {result.workflow.map((item, idx) => {
                    const meta = AGENT_META[item.agent] || { icon: "🤖", desc: "" };
                    return (
                      <div key={idx} className="stepper-item">
                        <div className="stepper-node">
                          <span className="stepper-icon">{meta.icon}</span>
                          <span className="stepper-num">0{idx + 1}</span>
                        </div>
                        <span className="stepper-name">{item.agent.replace(" Agent", "")}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Agent Detail Cards Grid */}
                <div className="agent-cards-grid">
                  {result.workflow.map((item, idx) => {
                    const meta = AGENT_META[item.agent] || { icon: "🤖", desc: "Agent execution" };
                    const isExpanded = expandedAgent === idx;

                    return (
                      <div key={idx} className="agent-card">
                        <div className="agent-card-top">
                          <div className="agent-title-row">
                            <span className="agent-icon">{meta.icon}</span>
                            <div>
                              <span className="agent-idx">STAGE {idx + 1}</span>
                              <h4>{item.agent}</h4>
                            </div>
                          </div>
                          <span className="status-dot-done">COMPLETED</span>
                        </div>

                        <p className="agent-desc">{meta.desc}</p>

                        {/* Structured Output Renderers */}
                        <div className="agent-structured-output">
                          {item.agent === "Ticket Triage Agent" && (
                            <div className="output-tags">
                              <span className="tag">Category: <b>{item.output.category}</b></span>
                              <span className="tag">Priority: <b>{item.output.priority}</b></span>
                            </div>
                          )}

                          {item.agent === "Knowledge / RAG Agent" && (
                            <div className="output-kb-matches">
                              <span>Matched {item.output.matches?.length || 0} Grounded KB Articles:</span>
                              {item.output.matches?.map((m) => (
                                <div key={m.code} className="kb-mini-tag">
                                  <b>{m.code}</b>: {m.title}
                                </div>
                              ))}
                            </div>
                          )}

                          {item.agent === "System Diagnosis Agent" && (
                            <div className="diagnosis-highlight">
                              <b>Diagnosis:</b> {item.output.diagnosis}
                            </div>
                          )}

                          {item.agent === "Troubleshooting Agent" && (
                            <div className="steps-preview">
                              <b>Execution Plan:</b>
                              <ul>
                                {item.output.steps?.slice(0, 2).map((s, sIdx) => <li key={sIdx}>{s}</li>)}
                                {item.output.steps?.length > 2 && <li>+{item.output.steps.length - 2} more steps</li>}
                              </ul>
                            </div>
                          )}

                          {item.agent === "Resolution Agent" && (
                            <div className="tool-actions-preview">
                              <b>Simulated Actions:</b>
                              {item.output.actions?.map((act, aIdx) => (
                                <div key={aIdx} className="tool-run-row">
                                  <span className="tool-name">⚙️ {act.name}</span>
                                  <span className={`tool-status ${act.result?.status === "success" || act.result?.status === "reachable" ? "success" : "warn"}`}>
                                    {act.result?.status || "done"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {item.agent === "Verification Agent" && (
                            <div className={`verification-badge ${item.output.verified ? "verified-pass" : "verified-fail"}`}>
                              {item.output.verified ? "✓ Verification Passed" : "⚠ Verification Required Follow-up"}
                              <div className="verification-subtext">{item.output.message}</div>
                            </div>
                          )}

                          {item.agent === "Escalation Agent" && (
                            <div className="escalation-summary">
                              <div>Outcome: <b>{item.output.status}</b></div>
                              <div className="escalation-reason-text">{item.output.reason}</div>
                            </div>
                          )}

                          {item.agent === "Human Operator Supervision" && (
                            <div className="operator-summary">
                              <div>Action: <b>{item.output.action_taken}</b></div>
                              <div className="operator-note-text">{item.output.operator_note}</div>
                            </div>
                          )}
                        </div>

                        {/* Collapsible Technical JSON Payload */}
                        <div className="json-toggle-container">
                          <button
                            className="json-toggle-btn"
                            onClick={() => setExpandedAgent(isExpanded ? null : idx)}
                          >
                            {isExpanded ? "▲ Hide Raw JSON Payload" : "▼ Inspect JSON Payload"}
                          </button>
                          {isExpanded && (
                            <pre className="json-viewer">{JSON.stringify(item.output, null, 2)}</pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Evidence & Database Audit Trail */}
            <div className="two-column">
              {/* Evidence Section */}
              <div className="panel">
                <div className="panel-header">
                  <h3>Retrieved Grounded Evidence</h3>
                  <span className="badge-agent">RAG Cited Sources</span>
                </div>

                {result?.evidence && result.evidence.length > 0 ? (
                  <div className="evidence-list">
                    {result.evidence.map((e, idx) => (
                      <div key={idx} className="evidence-item">
                        <div className="evidence-top">
                          <span className="evidence-code">{e.code}</span>
                          <strong className="evidence-title">{e.title}</strong>
                        </div>
                        <p className="evidence-reason">{e.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No knowledge evidence associated with current view.</p>
                  </div>
                )}
              </div>

              {/* PostgreSQL Ticket History Section */}
              <div className="panel">
                <div className="panel-header">
                  <h3>PostgreSQL Audit History</h3>
                  <div className="filter-chips">
                    <button className={filter === "ALL" ? "filter-chip active" : "filter-chip"} onClick={() => setFilter("ALL")}>All</button>
                    <button className={filter === "RESOLVED" ? "filter-chip active" : "filter-chip"} onClick={() => setFilter("RESOLVED")}>Resolved</button>
                    <button className={filter === "ESCALATED" ? "filter-chip active" : "filter-chip"} onClick={() => setFilter("ESCALATED")}>Escalated</button>
                  </div>
                </div>

                <div className="history-list">
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => {
                      const isSelected = result?.ticket_id === ticket.id;
                      return (
                        <div
                          key={ticket.id}
                          className={`history-item ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectTicket(ticket.id)}
                        >
                          <div className="history-left">
                            <span className="history-id">#{ticket.id}</span>
                            <div className="history-details">
                              <span className="history-issue">{ticket.issue}</span>
                              <div className="history-tags">
                                {ticket.category && <span className="mini-tag">{ticket.category}</span>}
                                {ticket.priority && <span className={`mini-tag priority-${ticket.priority}`}>{ticket.priority}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="history-right">
                            <span className={`status-tag status-${ticket.status.toLowerCase()}`}>
                              {ticket.status.replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <p>No tickets matching the selected filter.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

