import { useEffect, useState, useRef } from "react";
import { getTickets, getTicket, investigate, performAction, getKnowledgeBase, getSystemStatus, sendVoiceChatMessage } from "./api";

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
  { name: "Sarah Connor", email: "sarah.connor@fixora.local", dept: "Security & Ops", avatar: "👩‍🚀" }
];

const AGENT_META = {
  "Ticket Triage Agent": { icon: "🧭", desc: "Extracts intent, category, and business impact priority." },
  "Knowledge / RAG Agent": { icon: "📚", desc: "Retrieves grounded IT runbooks & past ticket precedents." },
  "System Diagnosis Agent": { icon: "🔬", desc: "Probes live system status and establishes root cause." },
  "Troubleshooting Agent": { icon: "📋", desc: "Dynamically selects non-destructive tools based on issue signals." },
  "Resolution Agent": { icon: "⚙️", desc: "Safely executes approved simulated IT remediation tools." },
  "Verification Agent": { icon: "🧪", desc: "Validates tool outputs against service recovery criteria." },
  "Escalation Agent": { icon: "🛡️", desc: "Enforces autonomous safety boundaries and human operator routing." },
  "Human Operator Supervision": { icon: "👨‍💻", desc: "Operator in the loop supervisor action recorded in audit trail." }
};

export default function App() {
  const [selectedEmployee, setSelectedEmployee] = useState(EMPLOYEES[0]);
  const [activeView, setActiveView] = useState("chat"); // 'chat' | 'telemetry' | 'kb'
  
  // Chat & Voice state
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "ai",
      text: "Hello! I am Fixora AI, your autonomous IT helpdesk assistant. You can type your tech problem below or tap 'Start AI Audio Call' to speak with me directly. How can I assist your setup today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [error, setError] = useState("");

  // Live Audio Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callTranscript, setCallTranscript] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [operatorNote, setOperatorNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState(null);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const callTimerRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load Initial Data
  async function loadData() {
    try {
      const [ticketList, kb, health] = await Promise.all([
        getTickets().catch(() => []),
        getKnowledgeBase().catch(() => []),
        getSystemStatus().catch(() => null)
      ]);
      setTickets(ticketList);
      setKbArticles(kb);
      setSystemHealth(health);
      if (ticketList.length > 0 && !activeTicket) {
        const latest = await getTicket(ticketList[0].id).catch(() => null);
        if (latest) setActiveTicket(latest);
      }
    } catch {
      // Backend starting
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Text-to-Speech function
  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  // Handle Send Text Message
  async function handleSendMessage(msgToSend) {
    const text = (msgToSend || inputText).trim();
    if (!text) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    setError("");

    try {
      const res = await sendVoiceChatMessage(text, selectedEmployee.name, selectedEmployee.email, false, activeTicket?.ticket_id);
      
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.reply,
        ticket: res.ticket,
        actionType: res.action_type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (res.ticket) {
        setActiveTicket(res.ticket);
        const updatedTickets = await getTickets().catch(() => []);
        setTickets(updatedTickets);
      }
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          text: `⚠️ I encountered a connection issue: ${err.message}. Please check if the local server is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Handle Live Audio Call Start/Stop
  function startAudioCall() {
    setIsCallActive(true);
    setCallDuration(0);
    setCallTranscript("Connecting to Fixora Voice Agent...");

    // Timer
    callTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);

    // Initial greeting
    const welcomeSpeech = `Hello ${selectedEmployee.name.split(" ")[0]}! I'm on the line. What IT problem are you facing right now?`;
    speakText(welcomeSpeech);
    setCallTranscript(welcomeSpeech);

    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = async (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const spoken = lastResult[0].transcript.trim();
          if (spoken.length > 2) {
            setCallTranscript(`You: "${spoken}"`);
            await processVoiceCallInput(spoken);
          }
        }
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition notice:", e.error);
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn("Speech recognition start failed:", err);
      }
    } else {
      setCallTranscript("Voice synthesis active. Type or use preset chips to simulate speech.");
    }
  }

  async function processVoiceCallInput(spokenText) {
    setIsSpeaking(true);
    setCallTranscript(`Analyzing your issue: "${spokenText}"...`);

    try {
      const res = await sendVoiceChatMessage(spokenText, selectedEmployee.name, selectedEmployee.email, true, activeTicket?.ticket_id);
      
      const replySpeech = res.spoken_audio_text || res.reply;
      setCallTranscript(replySpeech);
      speakText(replySpeech);

      if (res.ticket) {
        setActiveTicket(res.ticket);
        const updatedList = await getTickets().catch(() => []);
        setTickets(updatedList);
      }

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, sender: "user", text: spokenText, isVoice: true, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: `a-${Date.now()}`, sender: "ai", text: res.reply, ticket: res.ticket, isVoice: true, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch (err) {
      const errMsg = "I had trouble processing that request. Please try again or switch to text chat.";
      setCallTranscript(errMsg);
      speakText(errMsg);
    }
  }

  function endAudioCall() {
    setIsCallActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function formatCallTime(secs) {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  }

  async function handleOperatorAction(actionType) {
    if (!activeTicket?.ticket_id) return;
    setActionLoading(true);
    try {
      const updated = await performAction(activeTicket.ticket_id, actionType, operatorNote);
      setActiveTicket(updated);
      setOperatorNote("");
      const updatedList = await getTickets().catch(() => []);
      setTickets(updatedList);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="app-container">
      {/* Topbar */}
      <header className="desk-topbar">
        <div className="topbar-brand">
          <div className="brand-orb">⚡</div>
          <div className="brand-names">
            <span className="brand-main">FIXORA <span className="neon">AI</span></span>
            <span className="brand-sub">Autonomous IT Service Desk & Voice Assistant</span>
          </div>
        </div>

        <div className="topbar-nav">
          <button
            className={`nav-tab-btn ${activeView === "chat" ? "active" : ""}`}
            onClick={() => setActiveView("chat")}
          >
            💬 Support Hub
          </button>
          <button
            className={`nav-tab-btn ${activeView === "telemetry" ? "active" : ""}`}
            onClick={() => setActiveView("telemetry")}
          >
            🔬 Multi-Agent Telemetry ({activeTicket ? `#${activeTicket.ticket_id}` : "Idle"})
          </button>
          <button
            className={`nav-tab-btn ${activeView === "kb" ? "active" : ""}`}
            onClick={() => setActiveView("kb")}
          >
            📚 Runbooks ({kbArticles.length})
          </button>
        </div>

        <div className="topbar-user-pill">
          <span className="emp-avatar">{selectedEmployee.avatar}</span>
          <select
            className="emp-select"
            value={selectedEmployee.email}
            onChange={(e) => {
              const emp = EMPLOYEES.find(x => x.email === e.target.value);
              if (emp) setSelectedEmployee(emp);
            }}
          >
            {EMPLOYEES.map(e => (
              <option key={e.email} value={e.email}>{e.name} ({e.dept})</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Support Interface */}
      <main className="desk-main">
        {activeView === "chat" && (
          <div className="chat-layout">
            {/* Left Sidebar: Quick Presets & Self Service */}
            <aside className="chat-sidebar">
              {/* Audio Call Action Card */}
              <div className="voice-call-cta-card">
                <div className="cta-icon-glow">🎙️</div>
                <div className="cta-title">Live Voice Call with AI</div>
                <p className="cta-desc">Speak naturally to Fixora AI. It diagnoses your issue, runs automated recovery, and speaks back.</p>
                <button
                  className={`btn-voice-call ${isCallActive ? "active-call" : ""}`}
                  onClick={isCallActive ? endAudioCall : startAudioCall}
                >
                  {isCallActive ? "🔴 End Call (" + formatCallTime(callDuration) + ")" : "📞 Start AI Audio Call"}
                </button>
              </div>

              {/* Quick Problem Presets */}
              <div className="sidebar-section">
                <div className="section-label">⚡ 1-Click Problem Simulations</div>
                <div className="chips-column">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      className="sidebar-chip"
                      onClick={() => handleSendMessage(p.issue)}
                    >
                      <span>{p.label}</span>
                      <span className="chip-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Health Status */}
              <div className="sidebar-section health-section">
                <div className="section-label">📡 System Diagnostics Status</div>
                <div className="health-badge-list">
                  <div className="health-row"><span className="dot online"></span> VPN Gateway (18ms)</div>
                  <div className="health-row"><span className="dot online"></span> Azure AD / LDAP Sync</div>
                  <div className="health-row"><span className="dot online"></span> DHCP/DNS (1.1.1.1)</div>
                  <div className="health-row"><span className="dot degraded"></span> Print Spooler (Healed)</div>
                </div>
              </div>
            </aside>

            {/* Center / Right: Interactive Chat & Resolution Stream */}
            <section className="chat-viewport">
              <div className="chat-header-bar">
                <div className="agent-online-status">
                  <span className="pulse-circle"></span>
                  <div>
                    <div className="agent-name">Fixora Autonomous Resolution Desk</div>
                    <div className="agent-sub">Powered by 7 Multi-Agent Reasoning Pipelines</div>
                  </div>
                </div>

                {activeTicket && (
                  <div className="ticket-active-badge">
                    <span className="t-badge-id">Ticket #{activeTicket.ticket_id}</span>
                    <span className={`t-badge-status ${activeTicket.status === "RESOLUTION_READY" ? "resolved" : "escalated"}`}>
                      {activeTicket.status.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Messages Scroll Area */}
              <div className="chat-messages-area">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
                    <div className="bubble-avatar">
                      {m.sender === "ai" ? "⚡" : selectedEmployee.avatar}
                    </div>
                    <div className="bubble-content-wrapper">
                      <div className="bubble-meta">
                        <span className="sender-name">{m.sender === "ai" ? "Fixora AI Desk" : selectedEmployee.name}</span>
                        <span className="msg-time">{m.timestamp}</span>
                        {m.isVoice && <span className="voice-tag">🎙️ Voice Call</span>}
                      </div>

                      <div className="bubble-text">
                        {m.text.split('\n').map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>

                      {/* If message resulted in ticket resolution / execution */}
                      {m.ticket && (
                        <div className="embedded-ticket-card">
                          <div className="etc-header">
                            <span className="etc-title">⚙️ Autonomous Multi-Agent Action Summary</span>
                            <span className="etc-confidence">{Math.round((m.ticket.confidence || 0.9) * 100)}% Verified</span>
                          </div>

                          <div className="etc-body">
                            <div className="etc-item">
                              <span className="etc-label">Diagnosis:</span>
                              <span className="etc-val">{m.ticket.diagnosis}</span>
                            </div>
                            <div className="etc-item">
                              <span className="etc-label">Resolution Applied:</span>
                              <span className="etc-val">{m.ticket.resolution}</span>
                            </div>
                            {m.ticket.dynamic_tools && (
                              <div className="etc-tools-row">
                                <span className="etc-label">Dynamic Tool:</span>
                                {m.ticket.dynamic_tools.map((dt, idx) => (
                                  <span key={idx} className={`tool-pill ${dt.decision === "SELECTED" ? "selected" : "skipped"}`}>
                                    {dt.tool} ({dt.decision})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="etc-footer">
                            <button
                              className="btn-inspect-telemetry"
                              onClick={() => setActiveView("telemetry")}
                            >
                              🔍 View 7-Agent Execution Trace →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="chat-bubble-row ai">
                    <div className="bubble-avatar">⚡</div>
                    <div className="bubble-content-wrapper">
                      <div className="thinking-bubble">
                        <span className="pulse-dot-ai"></span>
                        <span>Investigating knowledge runbooks, probing system status & selecting dynamic tools...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="chat-input-container">
                <div className="input-box-wrapper">
                  <textarea
                    className="chat-textarea"
                    rows="2"
                    placeholder="Type your tech trouble, error message, or hardware issue... (or click voice call on left)"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <div className="input-actions-bar">
                    <button
                      type="button"
                      className="btn-mic-quick"
                      title="Simulate Voice Input"
                      onClick={() => handleSendMessage(PRESETS[0].issue)}
                    >
                      🎙️
                    </button>
                    <button
                      type="button"
                      className="btn-send"
                      disabled={loading || !inputText.trim()}
                      onClick={() => handleSendMessage()}
                    >
                      {loading ? "Solving..." : "⚡ Send to AI"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* View 2: Multi-Agent Telemetry & Operator Supervision */}
        {activeView === "telemetry" && (
          <div className="telemetry-layout">
            <div className="telemetry-left">
              <div className="telemetry-card">
                <div className="card-top-header">
                  <h2>7-Stage Multi-Agent Execution Graph</h2>
                  <span className="tag-pills">Ticket #{activeTicket?.ticket_id || "None"}</span>
                </div>
                <p className="card-description">
                  Sequential audit trace across all 7 specialized agents persisted in PostgreSQL.
                </p>

                {activeTicket?.workflow ? (
                  <div className="workflow-stages-list">
                    {activeTicket.workflow.map((item, index) => {
                      const meta = AGENT_META[item.agent] || { icon: "⚡", desc: "Agent Step" };
                      const isExpanded = expandedAgent === index;
                      return (
                        <div key={index} className="wf-stage-card">
                          <div className="wf-card-header" onClick={() => setExpandedAgent(isExpanded ? null : index)}>
                            <div className="wf-title-group">
                              <span className="wf-icon">{meta.icon}</span>
                              <div>
                                <div className="wf-step-num">STAGE 0{index + 1}</div>
                                <div className="wf-agent-name">{item.agent}</div>
                              </div>
                            </div>
                            <span className="badge-done">COMPLETED</span>
                          </div>

                          <div className="wf-summary-snippet">
                            {item.agent === "Ticket Triage Agent" && (
                              <div>Category: <strong>{item.output.category}</strong> · Priority: <strong>{item.output.priority}</strong></div>
                            )}
                            {item.agent === "Knowledge / RAG Agent" && (
                              <div>Matched <strong>{item.output.matches?.length || 0} Grounded Runbooks</strong> & Correlated <strong>{item.output.previous_tickets_investigated?.length || 0} Past Tickets</strong></div>
                            )}
                            {item.agent === "System Diagnosis Agent" && (
                              <div>Diagnosis: <strong>{item.output.diagnosis}</strong></div>
                            )}
                            {item.agent === "Troubleshooting Agent" && (
                              <div>Dynamic Rationale: <em>{item.output.dynamic_selection_reason || "Runbook tools"}</em></div>
                            )}
                            {item.agent === "Resolution Agent" && (
                              <div>Tools Executed: {item.output.actions?.map(a => <code key={a.name} className="code-tag">{a.name} ({a.result?.status})</code>)}</div>
                            )}
                            {item.agent === "Verification Agent" && (
                              <div>{item.output.verified ? "✓ Verified Clean" : "✕ Escalation Advised"}: {item.output.message}</div>
                            )}
                            {item.agent === "Escalation Agent" && (
                              <div>Status: <strong>{item.output.status}</strong> · Confidence: {Math.round((item.output.confidence || 0) * 100)}%</div>
                            )}
                          </div>

                          <button
                            className="btn-expand-json"
                            onClick={() => setExpandedAgent(isExpanded ? null : index)}
                          >
                            {isExpanded ? "▲ Hide Payload" : "▼ Inspect JSON Payload"}
                          </button>

                          {isExpanded && (
                            <pre className="json-box">{JSON.stringify(item.output, null, 2)}</pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-notice">No ticket telemetry selected. Send a message in Support Hub first.</div>
                )}
              </div>
            </div>

            <div className="telemetry-right">
              {/* Operator Supervision */}
              <div className="telemetry-card operator-box">
                <h3>👨‍💻 Human Operator Supervision</h3>
                <p className="card-sub">Authorize manual overrides or tier-2 queue dispatch.</p>

                <input
                  type="text"
                  className="op-input"
                  placeholder="Supervisor note..."
                  value={operatorNote}
                  onChange={(e) => setOperatorNote(e.target.value)}
                />

                <div className="op-buttons-grid">
                  <button
                    className="btn-op dispatch"
                    onClick={() => handleOperatorAction("DISPATCH_TIER2")}
                    disabled={actionLoading || !activeTicket}
                  >
                    🚨 Dispatch Tier-2
                  </button>
                  <button
                    className="btn-op approve"
                    onClick={() => handleOperatorAction("APPROVE_AUTO_FIX")}
                    disabled={actionLoading || !activeTicket}
                  >
                    ✓ Override & Fix
                  </button>
                  <button
                    className="btn-op resolve"
                    onClick={() => handleOperatorAction("RESOLVE_MANUAL")}
                    disabled={actionLoading || !activeTicket}
                  >
                    🛡️ Mark Resolved
                  </button>
                </div>
              </div>

              {/* Previous Tickets Correlated */}
              {activeTicket?.previous_tickets && activeTicket.previous_tickets.length > 0 && (
                <div className="telemetry-card">
                  <h3>🔍 Previous Similar Tickets</h3>
                  <div className="prev-tickets-col">
                    {activeTicket.previous_tickets.map((pt) => (
                      <div key={pt.ticket_id} className="pt-card">
                        <div className="pt-top">
                          <span>Ticket #{pt.ticket_id}</span>
                          <span className="pt-badge">{pt.status}</span>
                        </div>
                        <div className="pt-text">{pt.issue}</div>
                        <div className="pt-res">{pt.resolution}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 3: Knowledge Base Runbooks */}
        {activeView === "kb" && (
          <div className="kb-view-layout">
            <h2>📚 Enterprise IT Knowledge Base Runbooks</h2>
            <div className="kb-cards-grid">
              {kbArticles.map((article) => (
                <div key={article.code} className="kb-runbook-card">
                  <div className="kb-top-row">
                    <span className="kb-code-pill">{article.code}</span>
                    <span className="kb-cat-pill">{article.category.toUpperCase()}</span>
                  </div>
                  <h3>{article.title}</h3>
                  <p>{article.content}</p>
                  <div className="kb-steps-box">
                    <strong>Standard Steps:</strong>
                    <ol>
                      {article.steps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <button
                    className="btn-test-runbook"
                    onClick={() => {
                      setActiveView("chat");
                      handleSendMessage(`Troubleshoot ${article.title.toLowerCase()}`);
                    }}
                  >
                    ⚡ Test Runbook in Chat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Live Audio Call Modal Screen */}
      {isCallActive && (
        <div className="voice-call-overlay">
          <div className="voice-call-modal">
            <div className="call-header">
              <div className="calling-tag">LIVE AI AUDIO CALL</div>
              <div className="call-timer">{formatCallTime(callDuration)}</div>
            </div>

            {/* Glowing Voice Orb */}
            <div className="voice-orb-container">
              <div className={`voice-orb ${isSpeaking ? "speaking" : "listening"}`}>
                <div className="orb-inner">⚡</div>
                <div className="orb-ring ring-1"></div>
                <div className="orb-ring ring-2"></div>
                <div className="orb-ring ring-3"></div>
              </div>
            </div>

            <div className="voice-status-text">
              {isSpeaking ? "Fixora AI is speaking..." : "Listening to your microphone..."}
            </div>

            {/* Live Transcript Box */}
            <div className="live-transcript-box">
              <div className="transcript-label">Live Call Audio Transcript:</div>
              <p className="transcript-body">{callTranscript}</p>
            </div>

            {/* Quick voice simulation chips */}
            <div className="voice-quick-chips">
              <span>Speak a scenario:</span>
              <button onClick={() => processVoiceCallInput("My VPN is offline and timing out.")}>🔒 VPN Stalled</button>
              <button onClick={() => processVoiceCallInput("Printer is jamming and spooler offline.")}>🖨️ Printer Jam</button>
              <button onClick={() => processVoiceCallInput("My account is locked out.")}>🔑 Account Lock</button>
            </div>

            {/* Call Action Controls */}
            <div className="call-controls-bar">
              <button
                className={`btn-call-ctrl ${isMuted ? "muted" : ""}`}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? "🔇 Unmute" : "🎙️ Mute"}
              </button>
              <button className="btn-call-ctrl end-call-btn" onClick={endAudioCall}>
                🔴 End Call
              </button>
              <button
                className="btn-call-ctrl"
                onClick={() => speakText(callTranscript)}
              >
                🔊 Replay Voice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
