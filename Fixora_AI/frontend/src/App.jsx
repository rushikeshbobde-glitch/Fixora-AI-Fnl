import { useEffect, useState, useRef } from "react";
import { getTickets, getKnowledgeBase, getSystemStatus, sendSupportRequest } from "./api";

const QUICK_CATEGORIES = [
  {
    id: "troubleshoot",
    icon: "🔧",
    label: "Troubleshoot",
    sample: "My laptop is slow",
    fullPrompt: "My laptop is running very slow and applications are freezing."
  },
  {
    id: "account",
    icon: "👤",
    label: "Account Help",
    sample: "Can't access email",
    fullPrompt: "I can't access my email and my corporate account seems locked."
  },
  {
    id: "software",
    icon: "🪟",
    label: "Software",
    sample: "Install software",
    fullPrompt: "I need help installing and updating required corporate software."
  },
  {
    id: "network",
    icon: "📶",
    label: "Network",
    sample: "VPN not working",
    fullPrompt: "My VPN is not connecting and corporate gateway keeps timing out."
  }
];

const POPULAR_TOPICS = [
  { icon: "✉️", title: "Email & Accounts", prompt: "I can't access my email and password reset is failing." },
  { icon: "💻", title: "Laptop & Hardware", prompt: "My laptop is running very slow and freezing." },
  { icon: "📥", title: "Software Installation", prompt: "I need assistance installing corporate developer tools." },
  { icon: "📶", title: "Network & VPN", prompt: "My VPN is not connecting to the corporate gateway." },
  { icon: "🛡️", title: "Security Issues", prompt: "My account is locked out after repeated MFA prompts." },
  { icon: "❓", title: "General Help", prompt: "The office printer is jamming and print spooler is offline." }
];

function renderFormattedText(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (!line.trim()) {
      return <div key={idx} style={{ height: "6px" }} />;
    }
    // Parse bold tags **text**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (line.startsWith("• ") || line.startsWith("- ")) {
      return (
        <div key={idx} className="bubble-bullet-line">
          <span className="bullet-dot">•</span>
          <span className="bullet-content">{renderedParts}</span>
        </div>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      const numMatch = line.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        return (
          <div key={idx} className="bubble-num-line">
            <span className="num-badge">{numMatch[1]}.</span>
            <span className="num-content">{numMatch[2]}</span>
          </div>
        );
      }
    }
    return <p key={idx}>{renderedParts}</p>;
  });
}

export default function App() {

  const [activeNav, setActiveNav] = useState("ask"); // 'ask' | 'tickets' | 'kb' | 'status' | 'settings'
  const [messages, setMessages] = useState([
    {
      id: "init-1",
      sender: "ai",
      text: "Hello! I'm Fixora AI.\nHow can I help you today?",
      time: "10:24 AM"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [systemStatus, setSystemStatus] = useState("All Systems Operational");
  const [statusOnline, setStatusOnline] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load initial backend data
  async function loadData() {
    try {
      const [ticketList, kb, health] = await Promise.all([
        getTickets().catch(() => []),
        getKnowledgeBase().catch(() => []),
        getSystemStatus().catch(() => null)
      ]);
      setTickets(ticketList);
      setKbArticles(kb);
      if (health) {
        setSystemStatus(health.overall_status === "OPERATIONAL" ? "All Systems Operational" : "System Diagnostics Nominal");
        setStatusOnline(true);
      }
    } catch {
      setStatusOnline(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Text-To-Speech
  function speak(text) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#_`]/g, "");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio optional
    }
  }

  // Handle Support Submission (Text or Voice)
  async function handleSubmit(customMsg, source = "text") {
    const textToSend = (customMsg || input).trim();
    if (!textToSend || loading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add User Message to Chat
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      time: currentTime,
      source
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setErrorMsg("");

    try {
      // Call POST /api/support
      const response = await sendSupportRequest(textToSend, source, "Sarah Connor", "sarah.connor@fixora.local");

      // Add AI Response with Agentic Trace to Chat
      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: response.reply || "I have investigated your technical issue.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ticketNumber: response.ticket_number,
        status: response.status,
        category: response.category,
        priority: response.priority,
        events: response.events || [],
        source
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Speak response if voice was used
      if (source === "voice" && response.reply) {
        speak(response.reply);
      }

      // Refresh recent tickets
      const updatedTickets = await getTickets().catch(() => []);
      if (updatedTickets.length > 0) {
        setTickets(updatedTickets);
      }
    } catch (err) {
      setErrorMsg(err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          text: "I couldn't reach the Fixora service desk. Please make sure the backend is running and try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Microphone / Voice Support
  function toggleMicrophone() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript.trim();
        setIsListening(false);
        if (spoken) {
          setInput(spoken);
          handleSubmit(spoken, "voice");
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech error:", err);
      setIsListening(false);
    }
  }

  function handleQuickStart(category) {
    handleSubmit(category.fullPrompt, "text");
  }

  function handlePopularTopic(topic) {
    setInput(topic.prompt);
    inputRef.current?.focus();
  }

  function handleNewTicketClick() {
    setActiveNav("ask");
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="fixora-app">
      {/* 1. Top Header */}
      <header className="fixora-header">
        <div className="header-left">
          <div className="header-logo">
            <div className="logo-icon-wrap">
              <span className="logo-robot-icon">🤖</span>
            </div>
            <div className="logo-text-group">
              <span className="logo-title">Fixora AI</span>
              <span className="logo-subtitle">IT Service Desk</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="system-status-indicator">
            <span className={`status-dot ${statusOnline ? "green" : "amber"}`}></span>
            <span className="status-text">{systemStatus}</span>
          </div>

          <button className="header-icon-btn" title="Light Mode" type="button">
            ☀️
          </button>
          <button className="header-icon-btn" title="Settings" type="button" onClick={() => setActiveNav("settings")}>
            ⚙️
          </button>

          <div className="user-profile-badge">
            <div className="user-avatar-circle">SK</div>
            <span className="user-chevron">▾</span>
          </div>
        </div>
      </header>

      {/* 2. Three-Column Workspace Layout */}
      <div className="fixora-body-layout">
        {/* Left Navigation Sidebar */}
        <aside className="left-sidebar">
          <nav className="nav-menu">
            <button
              className={`nav-btn ${activeNav === "ask" ? "active" : ""}`}
              onClick={() => setActiveNav("ask")}
            >
              <span className="nav-icon">💬</span>
              <span className="nav-label">Ask Fixora</span>
            </button>

            <button
              className={`nav-btn ${activeNav === "new-ticket" ? "active" : ""}`}
              onClick={handleNewTicketClick}
            >
              <span className="nav-icon">➕</span>
              <span className="nav-label">New Ticket</span>
            </button>

            <button
              className={`nav-btn ${activeNav === "tickets" ? "active" : ""}`}
              onClick={() => setActiveNav("tickets")}
            >
              <span className="nav-icon">📑</span>
              <span className="nav-label">My Tickets</span>
              {tickets.length > 0 && <span className="nav-counter">{tickets.length}</span>}
            </button>

            <button
              className={`nav-btn ${activeNav === "kb" ? "active" : ""}`}
              onClick={() => setActiveNav("kb")}
            >
              <span className="nav-icon">📖</span>
              <span className="nav-label">Knowledge Base</span>
            </button>

            <button
              className={`nav-btn ${activeNav === "status" ? "active" : ""}`}
              onClick={() => setActiveNav("status")}
            >
              <span className="nav-icon">🛡️</span>
              <span className="nav-label">System Status</span>
            </button>
          </nav>

          <div className="left-bottom-section">
            <button
              className={`nav-btn settings-btn ${activeNav === "settings" ? "active" : ""}`}
              onClick={() => setActiveNav("settings")}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </button>

            {/* AI-Powered Support Banner Card */}
            <div className="support-badge-card">
              <div className="support-card-icon">💻</div>
              <div className="support-card-title">AI-Powered IT Support</div>
              <div className="support-card-desc">
                Get instant help or create a ticket for your issue.
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main AI Chat Panel */}
        <main className="main-chat-container">
          <div className="chat-content-scroll">
            {/* Hero AI Greeting Header */}
            <div className="ai-hero-header">
              <div className="hero-avatar-ring">
                <span className="hero-robot">🤖</span>
              </div>
              <h1 className="hero-title">Hi! I'm Fixora AI</h1>
              <h2 className="hero-subtitle">Your IT Service Desk Assistant</h2>
              <p className="hero-instruction">
                Describe your issue in your own words, or use voice to talk with me.
              </p>
            </div>

            {/* 4 Quick Issue Category Cards */}
            <div className="quick-categories-grid">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className="category-card"
                  onClick={() => handleQuickStart(cat)}
                  disabled={loading}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-title">{cat.label}</span>
                  <span className="category-sample">"{cat.sample}"</span>
                </button>
              ))}
            </div>

            {/* Conversation Feed */}
            <div className="conversation-feed">
              {messages.map((m) => (
                <div key={m.id} className={`message-row ${m.sender}`}>
                  {m.sender === "ai" && (
                    <div className="msg-avatar ai-avatar">
                      🤖
                    </div>
                  )}

                  <div className="message-bubble-column">
                    <div className={`message-bubble ${m.sender} ${m.isError ? "error-bubble" : ""}`}>
                      <div className="bubble-text-content">
                        {renderFormattedText(m.text)}
                      </div>

                      {/* Agentic Resolution Trace Card */}
                      {m.events && m.events.length > 0 && (
                        <div className="agentic-trace-card">
                          <div className="trace-header">
                            <span className="trace-title">Agentic resolution trace</span>
                            {m.ticketNumber && (
                              <span className="trace-ticket-tag">{m.ticketNumber}</span>
                            )}
                          </div>

                          <div className="trace-checklist">
                            {m.events.map((evt, idx) => (
                              <div key={idx} className="trace-step-row">
                                <div className="trace-icon-col">
                                  {evt.status === "completed" ? (
                                    <span className="step-check green">✓</span>
                                  ) : evt.status === "failed" ? (
                                    <span className="step-check amber">⚠</span>
                                  ) : (
                                    <span className="step-check blue">●</span>
                                  )}
                                </div>
                                <div className="trace-text-col">
                                  <span className="step-name">{evt.name}</span>
                                  <span className="step-detail">{evt.detail}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="trace-footer">
                            <div className="trace-meta">
                              {m.category && <span className="meta-pill">{m.category.toUpperCase()}</span>}
                              {m.priority && <span className="meta-pill">{m.priority.toUpperCase()} PRIORITY</span>}
                            </div>
                            <span className={`status-badge ${m.status === "resolved" ? "resolved" : "escalated"}`}>
                              {m.status === "resolved" ? "✓ Verified Clean" : "⚠ Escalated to IT Support"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="message-timestamp">{m.time}</div>
                  </div>

                  {m.sender === "user" && (
                    <div className="msg-avatar user-avatar">
                      👤
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="message-row ai">
                  <div className="msg-avatar ai-avatar">🤖</div>
                  <div className="message-bubble-column">
                    <div className="message-bubble ai loading-bubble">
                      <div className="loading-dots">
                        <span></span><span></span><span></span>
                      </div>
                      <span className="loading-text">Fixora is investigating your issue with autonomous runbooks...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Fixed Message Composer at Bottom */}
          <div className="composer-dock">
            <div className="composer-input-card">
              <button className="composer-btn clip-btn" title="Attach screenshot (coming soon)" type="button">
                📎
              </button>

              <input
                ref={inputRef}
                type="text"
                className="composer-text-input"
                placeholder={isListening ? "Listening... speak your issue now..." : "Type your message here..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(input, "text");
                  }
                }}
                disabled={loading}
              />

              <button
                className={`composer-btn mic-btn ${isListening ? "listening" : ""}`}
                title="Click to speak your problem"
                type="button"
                onClick={toggleMicrophone}
              >
                {isListening ? "🔴" : "🎤"}
              </button>

              <button
                className="composer-send-btn"
                title="Send Message"
                type="button"
                onClick={() => handleSubmit(input, "text")}
                disabled={loading || !input.trim()}
              >
                ➤
              </button>
            </div>

            <div className="composer-helper-caption">
              You can type your issue, use the microphone to speak, or attach a screenshot.
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="right-sidebar">
          {/* Card 1: Create a Ticket */}
          <div className="right-card create-ticket-card">
            <h3 className="card-title">Create a Ticket</h3>
            <p className="card-desc">Quickly create a ticket for your issue.</p>
            <button className="btn-new-ticket" onClick={handleNewTicketClick}>
              + New Ticket
            </button>
          </div>

          {/* Card 2: Recent Tickets */}
          <div className="right-card recent-tickets-card">
            <div className="card-header-row">
              <h3 className="card-title">Recent Tickets</h3>
              <button className="link-btn" onClick={() => setActiveNav("tickets")}>
                View All
              </button>
            </div>

            <div className="tickets-list">
              {tickets.length === 0 ? (
                <div className="empty-tickets">No tickets recorded yet.</div>
              ) : (
                tickets.slice(0, 4).map((t) => {
                  const statusClass = t.status?.toLowerCase().includes("resolv")
                    ? "resolved"
                    : t.status?.toLowerCase().includes("escalat")
                    ? "pending"
                    : "in-progress";

                  return (
                    <div
                      key={t.id}
                      className="ticket-row"
                      onClick={() => {
                        setInput(`Investigate status of ticket ${t.ticket_number || '#' + t.id}`);
                        inputRef.current?.focus();
                      }}
                    >
                      <div className="ticket-top-line">
                        <span className="ticket-num">{t.ticket_number || `#INC-${t.id.toString().padStart(3, '0')}`}</span>
                        <span className={`ticket-pill ${statusClass}`}>{t.status}</span>
                      </div>
                      <div className="ticket-subject">{t.issue}</div>
                      <div className="ticket-time">Recent</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 3: Popular Topics */}
          <div className="right-card popular-topics-card">
            <h3 className="card-title">Popular Topics</h3>
            <div className="topics-list">
              {POPULAR_TOPICS.map((topic, i) => (
                <div
                  key={i}
                  className="topic-row"
                  onClick={() => handlePopularTopic(topic)}
                >
                  <div className="topic-left">
                    <span className="topic-icon">{topic.icon}</span>
                    <span className="topic-name">{topic.title}</span>
                  </div>
                  <span className="topic-chevron">›</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
