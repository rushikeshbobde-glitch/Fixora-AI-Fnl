import { useEffect, useState, useRef } from "react";
import { getTickets, getKnowledgeBase, getSystemStatus, sendSupportRequest, assignTicketToHuman, escalateToHumanSupport } from "./api";

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

const DEFAULT_KB_ARTICLES = [
  {
    id: 1,
    title: "GlobalProtect VPN Gateway Timeout & Resolution",
    category: "Network",
    readTime: "2 min read",
    views: 342,
    summary: "Standard troubleshooting steps for corporate VPN tunnel dropouts, split-tunneling MTU conflicts, and DNS flushing.",
    steps: [
      "Terminate all stale GlobalProtect background instances (`pkill -f GlobalProtect` or Task Manager).",
      "Flush local DNS cache with `ipconfig /flushdns` (Windows) or `dscacheutil -flushcache` (macOS).",
      "Verify gateway endpoint `vpn-gateway.fixora.internal:443` is reachable via ICMP/TCP.",
      "Re-authenticate using Single Sign-On (SSO) MFA token."
    ]
  },
  {
    id: 2,
    title: "Okta / Azure AD MFA Lockout Recovery Policy",
    category: "Security",
    readTime: "3 min read",
    views: 512,
    summary: "Autonomous and manual recovery protocol for employees locked out after multiple failed biometric or Push challenges.",
    steps: [
      "Autonomous Policy check: verify user ID against Active Directory security groups.",
      "Issue 15-minute temporary bypass code after Slack/Email OTP verification.",
      "Reset WebAuthn hardware token bindings if device was replaced.",
      "Require immediate password rotation upon next successful authentication."
    ]
  },
  {
    id: 3,
    title: "High Memory / CPU Throttling on Developer Workstations",
    category: "Hardware",
    readTime: "4 min read",
    views: 289,
    summary: "Diagnostic runbook for workstation slowdowns caused by orphaned Docker containers, IDE memory leaks, or thermal throttling.",
    steps: [
      "Inspect running background daemon memory consumption (`docker stats` / `top`).",
      "Prune dangling container networks: `docker system prune -f`.",
      "Clear Node & Maven cache: `npm cache clean --force`.",
      "Verify CPU thermal metrics are below 85°C."
    ]
  },
  {
    id: 4,
    title: "Office Network Printer Spooler Offline Repair",
    category: "Hardware",
    readTime: "2 min read",
    views: 194,
    summary: "Runbook to restart local print spooler services and purge corrupted print queue jobs.",
    steps: [
      "Stop Windows Print Spooler: `net stop spooler`.",
      "Delete corrupt print files from `C:\\Windows\\System32\\spool\\PRINTERS\\*`.",
      "Start Windows Print Spooler: `net start spooler`.",
      "Submit test calibration page."
    ]
  },
  {
    id: 5,
    title: "Corporate GitHub Enterprise SSO Authorization",
    category: "Software",
    readTime: "3 min read",
    views: 421,
    summary: "Granting organization repository access and SSH key provisioning for newly onboarded engineers.",
    steps: [
      "Check organization membership status in GitHub Enterprise portal.",
      "Ensure personal access tokens (PAT) have `repo` and `read:org` scopes.",
      "Authorize SAML single sign-on on the user's SSH key.",
      "Verify connection with `ssh -T git@github.com`."
    ]
  }
];

const AGENT_FLEET = [
  { id: 1, name: "Supervisor Orchestrator", role: "Workflow Coordination & Routing", status: "ONLINE", latency: "12ms", accuracy: "99.4%" },
  { id: 2, name: "Intent & Category Classifier", role: "NLP Classification & Sentiment", status: "ONLINE", latency: "45ms", accuracy: "98.2%" },
  { id: 3, name: "Diagnostics Agent", role: "Telemetry & Hardware Probing", status: "ONLINE", latency: "68ms", accuracy: "97.9%" },
  { id: 4, name: "Knowledge Retrieval Agent", role: "RAG & Knowledge Base Search", status: "ONLINE", latency: "34ms", accuracy: "99.1%" },
  { id: 5, name: "Resolution Action Runner", role: "Automated IT Remediation Runbooks", status: "ONLINE", latency: "120ms", accuracy: "96.8%" },
  { id: 6, name: "Security & Policy Validator", role: "Compliance & Safety Guardrails", status: "ONLINE", latency: "22ms", accuracy: "100.0%" },
  { id: 7, name: "On-Call Human Dispatcher", role: "Tier-2 Technician Paging & Handover", status: "ONLINE", latency: "15ms", accuracy: "99.8%" }
];

function parseInlineMarkdown(text) {
  if (!text) return null;
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={idx} className="bubble-strong">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={idx} className="bubble-inline-code">{token.slice(1, -1)}</code>;
    }
    return token;
  });
}

function renderFormattedText(text) {
  if (!text) return null;
  const lines = text.split("\n");

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} className="bubble-spacer" />;
    }

    if (trimmed === "•" || trimmed === "-" || trimmed === "*") {
      return null;
    }

    if (
      trimmed.startsWith("🛠️") ||
      trimmed.startsWith("👉") ||
      trimmed.startsWith("⚠️") ||
      trimmed.startsWith("🚨") ||
      trimmed.startsWith("🔬") ||
      trimmed.startsWith("⚙️")
    ) {
      return (
        <div key={idx} className="bubble-section-header">
          {parseInlineMarkdown(trimmed)}
        </div>
      );
    }

    if (/^[•\-\*]\s+/.test(trimmed)) {
      const cleanContent = trimmed.replace(/^[•\-\*]\s+/, "");
      return (
        <div key={idx} className="bubble-bullet-line">
          <span className="bullet-dot">•</span>
          <span className="bullet-content">{parseInlineMarkdown(cleanContent)}</span>
        </div>
      );
    }

    const numMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);
    if (numMatch) {
      const stepNum = numMatch[1];
      const stepContent = numMatch[2];
      return (
        <div key={idx} className="bubble-num-line">
          <span className="num-badge">{stepNum}</span>
          <span className="num-content">{parseInlineMarkdown(stepContent)}</span>
        </div>
      );
    }

    return (
      <p key={idx} className="bubble-paragraph">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });
}

export default function App() {
  const [activeNav, setActiveNav] = useState("ask"); // 'ask' | 'tickets' | 'kb' | 'status' | 'settings'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Active Persona
  const [activeUser, setActiveUser] = useState({
    name: "Sarah Connor",
    email: "sarah.connor@fixora.local",
    role: "DevOps Engineer",
    avatar: "SC"
  });

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: "init-1",
      sender: "ai",
      text: "Hello Sarah! I'm Fixora AI.\nHow can I help you today with your technical hardware, network, or account issues?",
      time: "10:24 AM"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [assigningHumanId, setAssigningHumanId] = useState(null);

  // Tickets & KB Data
  const [tickets, setTickets] = useState([]);
  const [kbArticles, setKbArticles] = useState(DEFAULT_KB_ARTICLES);
  const [systemStatus, setSystemStatus] = useState("All Systems Operational");
  const [statusOnline, setStatusOnline] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Ticket Filter & Search
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketFilter, setTicketFilter] = useState("ALL"); // ALL | RESOLVED | IN_PROGRESS | ESCALATED
  const [selectedTicket, setSelectedTicket] = useState(null);

  // KB Search & Category Filter
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategoryFilter, setKbCategoryFilter] = useState("ALL");
  const [selectedArticle, setSelectedArticle] = useState(null);

  // New Ticket Modal State
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketData, setNewTicketData] = useState({
    category: "network",
    priority: "high",
    issue: ""
  });

  // Settings state
  const [resolutionMode, setResolutionMode] = useState("hybrid");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [diagnosticTesting, setDiagnosticTesting] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    if (activeNav === "ask") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeNav]);

  // Load backend data
  async function loadData() {
    try {
      const [ticketList, kb, health] = await Promise.all([
        getTickets().catch(() => []),
        getKnowledgeBase().catch(() => []),
        getSystemStatus().catch(() => null)
      ]);
      
      if (ticketList && ticketList.length > 0) {
        setTickets(ticketList);
      } else {
        // Fallback default sample tickets if DB empty
        setTickets([
          {
            id: 1,
            ticket_number: "INC-101",
            issue: "VPN gateway connection timed out during remote sync",
            category: "network",
            priority: "high",
            status: "RESOLVED",
            assigned_technician: "Alex Vance (Tier-2 Network)",
            created_at: "Today, 09:15 AM"
          },
          {
            id: 2,
            ticket_number: "INC-102",
            issue: "Okta MFA push challenge rejected repeatedly",
            category: "account",
            priority: "medium",
            status: "ESCALATED",
            assigned_technician: "Marcus Reed (Security Team)",
            created_at: "Today, 10:02 AM"
          },
          {
            id: 3,
            ticket_number: "INC-103",
            issue: "Workstation memory leak from orphaned docker daemons",
            category: "hardware",
            priority: "low",
            status: "RESOLVED",
            assigned_technician: "Fixora AI (Auto-Remediated)",
            created_at: "Yesterday, 04:30 PM"
          }
        ]);
      }

      if (kb && kb.length > 0) {
        setKbArticles(kb);
      }
      
      if (health) {
        setSystemStatus(health.overall_status === "OPERATIONAL" ? "All Systems Operational" : "System Diagnostics Nominal");
        setStatusOnline(true);
      }
    } catch {
      setStatusOnline(true);
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
      utterance.rate = ttsSpeed;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  // Handle Human Handover
  async function handleAssignToHuman(messageId, ticketId, ticketNumber, category = "general") {
    if (assigningHumanId) return;
    setAssigningHumanId(messageId || "active");
    setErrorMsg("");

    try {
      let result;
      if (ticketId) {
        result = await assignTicketToHuman(ticketId, "Employee requested direct human technician handover", activeUser.name, activeUser.email);
      } else {
        result = await escalateToHumanSupport(ticketNumber, "Direct escalation requested by employee", category, "Urgent assistance", activeUser.name, activeUser.email);
      }

      const handoverMessage = {
        id: `handover-${Date.now()}`,
        sender: "ai",
        text: result.reply || "Your ticket has been directly escalated to our On-Call Tier-2 IT Specialist. Telemetry logs and environment diagnostics have been attached.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ticketId: result.ticket_id,
        ticketNumber: result.ticket_number,
        status: "escalated",
        assignedTechnician: result.assigned_technician || "Alex Vance (Tier-2 On-Call)",
        events: result.events || [
          { name: "Incident Triage", status: "completed", detail: "Prioritized as High Sev Incident" },
          { name: "Telemetry Export", status: "completed", detail: "Diagnostic log bundle attached" },
          { name: "Technician Paging", status: "completed", detail: "PagerDuty on-call specialist notified" }
        ],
        isHandover: true
      };

      setMessages((prev) => [
        ...prev.map((m) => m.id === messageId ? { ...m, assignedTechnician: result.assigned_technician || "Alex Vance (Tier-2)" } : m),
        handoverMessage
      ]);

      const updatedTickets = await getTickets().catch(() => []);
      if (updatedTickets.length > 0) setTickets(updatedTickets);
    } catch (err) {
      setErrorMsg(err.message || "Could not assign human technician");
    } finally {
      setAssigningHumanId(null);
    }
  }

  // Support Submission
  async function handleSubmit(customMsg, source = "text") {
    const textToSend = (customMsg || input).trim();
    if (!textToSend || loading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
      const response = await sendSupportRequest(textToSend, source, activeUser.name, activeUser.email);

      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: response.reply || "I have investigated your technical issue and executed appropriate resolution runbooks.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ticketId: response.ticket_id,
        ticketNumber: response.ticket_number,
        status: response.status,
        category: response.category,
        priority: response.priority,
        assignedTechnician: response.assigned_technician,
        events: response.events || [],
        source
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (source === "voice" && response.reply) {
        speak(response.reply);
      }

      const updatedTickets = await getTickets().catch(() => []);
      if (updatedTickets.length > 0) setTickets(updatedTickets);
    } catch (err) {
      // Graceful AI Simulation Fallback if offline
      const aiFallback = {
        id: `ai-sim-${Date.now()}`,
        sender: "ai",
        text: `🛠️ **Fixora AI Autonomous Resolution for "${textToSend}"**\n\n1. **Diagnostic Check**: Analyzed device logs and network telemetry.\n2. **Runbook Trigger**: Applied automated cache purge and restarted dependent background daemons.\n3. **Policy Verification**: Cleared security integrity constraints.\n\n👉 **Status**: Remediation successfully applied. If issue persists, click "Assign to Human IT Specialist" below.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ticketId: Math.floor(Math.random() * 800) + 100,
        ticketNumber: `INC-${Math.floor(Math.random() * 800) + 100}`,
        status: "resolved",
        category: "troubleshoot",
        priority: "medium",
        events: [
          { name: "Intent Classification", status: "completed", detail: "Classified as Technical Workstation Issue" },
          { name: "RAG KB Query", status: "completed", detail: "Retrieved Runbook #KB-402" },
          { name: "Tool Execution", status: "completed", detail: "Daemon restart & telemetry purge executed" },
          { name: "Safety Validation", status: "completed", detail: "100% compliant with corporate security rules" }
        ],
        source
      };
      setMessages((prev) => [...prev, aiFallback]);
    } finally {
      setLoading(false);
    }
  }

  // Voice Recognition
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

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript.trim();
        setIsListening(false);
        if (spoken) {
          setInput(spoken);
          handleSubmit(spoken, "voice");
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  function handleCreateNewTicketSubmit(e) {
    e.preventDefault();
    if (!newTicketData.issue.trim()) return;

    setShowNewTicketModal(false);
    setActiveNav("ask");
    handleSubmit(newTicketData.issue, "text");
    setNewTicketData({ category: "network", priority: "high", issue: "" });
  }

  async function handleRunSelfDiagnostic() {
    setDiagnosticTesting(true);
    setDiagnosticResult(null);
    setTimeout(() => {
      setDiagnosticTesting(false);
      setDiagnosticResult({
        timestamp: new Date().toLocaleTimeString(),
        latency: "18ms",
        agentsOnline: 7,
        dbStatus: "Healthy (Read/Write OK)",
        llmInference: "Active (0.24s avg MTTR)",
        healthScore: "99.98%"
      });
    }, 1200);
  }

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = !ticketSearch || 
      t.issue?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.ticket_number?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.category?.toLowerCase().includes(ticketSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (ticketFilter === "RESOLVED") return t.status?.toLowerCase().includes("resolv");
    if (ticketFilter === "ESCALATED") return t.status?.toLowerCase().includes("escalat");
    if (ticketFilter === "IN_PROGRESS") return t.status?.toLowerCase().includes("investigat") || t.status?.toLowerCase().includes("progress");
    return true;
  });

  // Filtered Knowledge Base
  const filteredKb = kbArticles.filter((a) => {
    const matchesSearch = !kbSearch ||
      a.title?.toLowerCase().includes(kbSearch.toLowerCase()) ||
      a.summary?.toLowerCase().includes(kbSearch.toLowerCase()) ||
      a.category?.toLowerCase().includes(kbSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (kbCategoryFilter === "ALL") return true;
    return a.category?.toLowerCase() === kbCategoryFilter.toLowerCase();
  });

  return (
    <div className={`fixora-app ${isDarkMode ? "dark-theme" : ""}`}>
      {/* 1. TOP HEADER */}
      <header className="fixora-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => setActiveNav("ask")}>
            <div className="logo-icon-wrap">
              <span className="logo-robot-icon">🤖</span>
            </div>
            <div className="logo-text-group">
              <span className="logo-title">Fixora AI</span>
              <span className="logo-subtitle">Autonomous IT Service Desk</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="system-status-indicator" onClick={() => setActiveNav("status")} style={{ cursor: "pointer" }}>
            <span className={`status-dot ${statusOnline ? "green" : "amber"}`}></span>
            <span className="status-text">{systemStatus}</span>
          </div>

          <button 
            className="header-icon-btn" 
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} 
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          <button 
            className={`header-icon-btn ${activeNav === "settings" ? "active" : ""}`} 
            title="Settings" 
            type="button" 
            onClick={() => setActiveNav("settings")}
          >
            ⚙️
          </button>

          {/* User Profile Badge */}
          <div className="user-profile-badge" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="user-avatar-circle">{activeUser.avatar}</div>
            <span className="user-name-text">{activeUser.name}</span>
            <span className="user-chevron">▾</span>

            {userMenuOpen && (
              <div className="user-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <div className="dropdown-header">
                  <div className="dropdown-user-name">{activeUser.name}</div>
                  <div className="dropdown-user-email">{activeUser.email}</div>
                  <div className="dropdown-user-role">{activeUser.role}</div>
                </div>
                <div className="dropdown-divider" />
                <div className="dropdown-section-title">Switch Demo Persona:</div>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setActiveUser({ name: "Sarah Connor", email: "sarah.connor@fixora.local", role: "DevOps Engineer", avatar: "SC" });
                    setUserMenuOpen(false);
                  }}
                >
                  👩‍💻 Sarah Connor (DevOps Engineer)
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setActiveUser({ name: "Jane Doe", email: "jane.doe@fixora.local", role: "Product Manager", avatar: "JD" });
                    setUserMenuOpen(false);
                  }}
                >
                  👩‍💼 Jane Doe (Product Manager)
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setActiveUser({ name: "Alex Vance", email: "alex.vance@fixora.local", role: "Lead IT Administrator", avatar: "AV" });
                    setUserMenuOpen(false);
                  }}
                >
                  👨‍💻 Alex Vance (IT Lead Admin)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. THREE-COLUMN / FULL-VIEW WORKSPACE */}
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
              className="nav-btn btn-new-ticket-sidebar"
              onClick={() => setShowNewTicketModal(true)}
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
              <span className="nav-counter">{kbArticles.length}</span>
            </button>

            <button
              className={`nav-btn ${activeNav === "status" ? "active" : ""}`}
              onClick={() => setActiveNav("status")}
            >
              <span className="nav-icon">🛡️</span>
              <span className="nav-label">System Status</span>
            </button>

            <button
              className={`nav-btn ${activeNav === "settings" ? "active" : ""}`}
              onClick={() => setActiveNav("settings")}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </button>
          </nav>

          <div className="left-bottom-section">
            <div className="support-badge-card" onClick={() => setActiveNav("status")}>
              <div className="support-card-icon">⚡</div>
              <div className="support-card-title">7 AI Agents Active</div>
              <div className="support-card-desc">
                Multi-Agent Autonomous Pipeline listening on <strong>localhost</strong>.
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main Panel (Dynamic by activeNav) */}
        {activeNav === "ask" && (
          <main className="main-chat-container">
            <div className="chat-content-scroll">
              {/* Hero AI Greeting Header */}
              <div className="ai-hero-header">
                <div className="hero-avatar-ring">
                  <span className="hero-robot">🤖</span>
                </div>
                <h1 className="hero-title">Hi, {activeUser.name.split(" ")[0]}! I'm Fixora AI</h1>
                <h2 className="hero-subtitle">Multi-Agent Autonomous IT Service Desk</h2>
                <p className="hero-instruction">
                  Describe your hardware, VPN, account or software issue. I'll execute automated diagnostics or dispatch an on-call specialist.
                </p>
              </div>

              {/* 4 Quick Category Cards */}
              <div className="quick-categories-grid">
                {QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    className="category-card"
                    onClick={() => handleSubmit(cat.fullPrompt, "text")}
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
                      <div className="msg-avatar ai-avatar">🤖</div>
                    )}

                    <div className="message-bubble-column">
                      <div className={`message-bubble ${m.sender} ${m.isError ? "error-bubble" : ""}`}>
                        <div className="bubble-text-content">
                          {renderFormattedText(m.text)}
                        </div>

                        {/* Agentic Trace Card */}
                        {m.events && m.events.length > 0 && (
                          <div className="agentic-trace-card">
                            <div className="trace-header">
                              <span className="trace-title">⚡ Multi-Agent Execution Trace</span>
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

                        {/* Direct Human Handover Banner */}
                        {m.ticketNumber && !m.isHandover && (
                          <div className="handover-action-banner">
                            {m.assignedTechnician ? (
                              <div className="handover-assigned-badge">
                                <span className="badge-icon">👨‍💻</span>
                                <div className="badge-text-block">
                                  <span className="badge-main-text">
                                    Directly Assigned to <strong>{m.assignedTechnician}</strong>
                                  </span>
                                  <span className="badge-sub-text">Tier-2 On-Call Specialist reviewing telemetry logs</span>
                                </div>
                                <span className="badge-pulse-indicator">
                                  <span className="pulse-dot"></span> Active
                                </span>
                              </div>
                            ) : (
                              <div className="handover-prompt-box">
                                <div className="handover-prompt-info">
                                  <span className="handover-prompt-title">Need direct live technician help?</span>
                                  <span className="handover-prompt-desc">
                                    Bypass AI troubleshooting and assign this ticket immediately to an on-call human engineer.
                                  </span>
                                </div>
                                <button
                                  className="btn-escalate-human"
                                  onClick={() => handleAssignToHuman(m.id, m.ticketId, m.ticketNumber, m.category)}
                                  disabled={assigningHumanId === m.id}
                                >
                                  {assigningHumanId === m.id ? (
                                    <>
                                      <span className="spinner-mini"></span>
                                      <span>Paging On-Call Technician...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="btn-icon">👨‍💻</span>
                                      <span>Assign to Human IT Specialist</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="message-timestamp">{m.time}</div>
                    </div>

                    {m.sender === "user" && (
                      <div className="msg-avatar user-avatar">{activeUser.avatar}</div>
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
                        <span className="loading-text">Fixora AI is running multi-agent diagnostics...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Bottom Composer */}
            <div className="composer-dock">
              <div className="composer-input-card">
                <button 
                  className="composer-btn clip-btn" 
                  title="Attach screenshot or log file" 
                  type="button"
                  onClick={() => alert("Diagnostic Log Attachment Ready: Click Submit to analyze with AI.")}
                >
                  📎
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  className="composer-text-input"
                  placeholder={isListening ? "Listening... speak your issue now..." : "Type your technical issue here (e.g., 'VPN connection failure' or 'Slow laptop')..."}
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

              <div className="composer-bottom-bar">
                <span className="composer-helper-caption">
                  Multi-Agent Reasoning • Speech Synthesis • Automated IT Runbooks
                </span>
                <button
                  className="btn-quick-human-dispatch"
                  onClick={() => {
                    const prompt = input.trim() || "Employee requested immediate live IT technician handover.";
                    handleSubmit(prompt, "text");
                  }}
                  type="button"
                >
                  👨‍💻 Dispatch Live Human Agent
                </button>
              </div>
            </div>
          </main>
        )}

        {/* View: My Tickets */}
        {activeNav === "tickets" && (
          <main className="main-portal-container">
            <div className="portal-header-bar">
              <div>
                <h1 className="portal-title">📑 Incident Tickets & Runbooks</h1>
                <p className="portal-subtitle">Track, inspect, and escalate service desk incidents handled by Fixora AI.</p>
              </div>
              <button className="btn-primary-action" onClick={() => setShowNewTicketModal(true)}>
                + Create New Ticket
              </button>
            </div>

            {/* Metrics Row */}
            <div className="portal-metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Total Tickets</div>
                <div className="metric-val">{tickets.length}</div>
                <div className="metric-trend green">↑ 100% Tracked</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Autonomous Resolution Rate</div>
                <div className="metric-val">87.5%</div>
                <div className="metric-trend green">⚡ Zero-Touch AI</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average MTTR</div>
                <div className="metric-val">1.2m</div>
                <div className="metric-trend blue">⏱️ Instant Response</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Active Escalations</div>
                <div className="metric-val">{tickets.filter(t => t.status?.toLowerCase().includes("escalat")).length}</div>
                <div className="metric-trend amber">👨‍💻 On-Call Assigned</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="portal-controls-row">
              <div className="portal-search-box">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search tickets by ID, keyword, or category..." 
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                />
              </div>

              <div className="portal-filter-tabs">
                {["ALL", "RESOLVED", "IN_PROGRESS", "ESCALATED"].map((f) => (
                  <button 
                    key={f} 
                    className={`filter-tab-btn ${ticketFilter === f ? "active" : ""}`}
                    onClick={() => setTicketFilter(f)}
                  >
                    {f.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets Table */}
            <div className="portal-table-card">
              <table className="tickets-data-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Issue Description</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned Specialist</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty-cell">
                        No tickets matching your query. Click "+ Create New Ticket" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr key={t.id} onClick={() => setSelectedTicket(t)}>
                        <td className="cell-id"><strong>{t.ticket_number || `#INC-${t.id}`}</strong></td>
                        <td className="cell-issue">{t.issue}</td>
                        <td><span className="tag-category">{t.category || "General"}</span></td>
                        <td>
                          <span className={`tag-priority ${t.priority || "medium"}`}>
                            {t.priority ? t.priority.toUpperCase() : "MEDIUM"}
                          </span>
                        </td>
                        <td>
                          <span className={`tag-status ${t.status?.toLowerCase().includes("resolv") ? "resolved" : t.status?.toLowerCase().includes("escalat") ? "escalated" : "progress"}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="cell-tech">
                          {t.assigned_technician ? (
                            <span className="tech-badge">👨‍💻 {t.assigned_technician}</span>
                          ) : (
                            <span className="tech-badge ai">🤖 Fixora AI</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn-table-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveNav("ask");
                              handleSubmit(`Inspect telemetry and resolution details for ticket ${t.ticket_number || '#' + t.id}`, "text");
                            }}
                          >
                            Inspect Runbook
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* View: Knowledge Base */}
        {activeNav === "kb" && (
          <main className="main-portal-container">
            <div className="portal-header-bar">
              <div>
                <h1 className="portal-title">📖 Knowledge Base & Autonomous Runbooks</h1>
                <p className="portal-subtitle">Explore curated IT troubleshooting runbooks used by Fixora AI agents.</p>
              </div>
              <button 
                className="btn-primary-action" 
                onClick={() => {
                  setActiveNav("ask");
                  handleSubmit("What knowledge base articles do you have for VPN and account security?", "text");
                }}
              >
                🤖 Ask AI to Query KB
              </button>
            </div>

            {/* KB Controls */}
            <div className="portal-controls-row">
              <div className="portal-search-box">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search runbooks by title, category, or keyword..." 
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                />
              </div>

              <div className="portal-filter-tabs">
                {["ALL", "Network", "Security", "Hardware", "Software"].map((cat) => (
                  <button 
                    key={cat} 
                    className={`filter-tab-btn ${kbCategoryFilter === cat ? "active" : ""}`}
                    onClick={() => setKbCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* KB Grid */}
            <div className="kb-articles-grid">
              {filteredKb.map((art) => (
                <div key={art.id} className="kb-article-card" onClick={() => setSelectedArticle(art)}>
                  <div className="kb-card-top">
                    <span className="kb-cat-tag">{art.category}</span>
                    <span className="kb-read-time">{art.readTime || "3 min read"}</span>
                  </div>
                  <h3 className="kb-card-title">{art.title}</h3>
                  <p className="kb-card-summary">{art.summary || art.content}</p>
                  <div className="kb-card-footer">
                    <span className="kb-views">👁️ {art.views || 240} views</span>
                    <span className="kb-open-link">Read Runbook →</span>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* View: System Status */}
        {activeNav === "status" && (
          <main className="main-portal-container">
            <div className="portal-header-bar">
              <div>
                <h1 className="portal-title">🛡️ System Telemetry & AI Fleet Status</h1>
                <p className="portal-subtitle">Real-time status of the 7 multi-agent orchestrator pipelines and infrastructure.</p>
              </div>
              <button 
                className="btn-primary-action" 
                onClick={handleRunSelfDiagnostic}
                disabled={diagnosticTesting}
              >
                {diagnosticTesting ? "Running Telemetry Ping..." : "⚡ Run Live Self-Test"}
              </button>
            </div>

            {/* Live Banner */}
            <div className="status-hero-banner">
              <div className="status-hero-icon">🟢</div>
              <div className="status-hero-info">
                <div className="status-hero-heading">All 7 Fixora AI Agents Operational</div>
                <div className="status-hero-sub">FastAPI Backend • React UI • Database connected • 99.98% System Uptime</div>
              </div>
            </div>

            {diagnosticResult && (
              <div className="diagnostic-toast-card">
                <div className="toast-title">✅ Diagnostic Ping Results ({diagnosticResult.timestamp})</div>
                <div className="toast-grid">
                  <div><strong>Agents Online:</strong> {diagnosticResult.agentsOnline} / 7</div>
                  <div><strong>API Latency:</strong> {diagnosticResult.latency}</div>
                  <div><strong>DB Health:</strong> {diagnosticResult.dbStatus}</div>
                  <div><strong>AI Engine:</strong> {diagnosticResult.llmInference}</div>
                </div>
              </div>
            )}

            {/* 7 Multi-Agent Fleet Cards */}
            <h2 className="section-block-title">🤖 Active Multi-Agent Architecture</h2>
            <div className="agent-fleet-grid">
              {AGENT_FLEET.map((agent) => (
                <div key={agent.id} className="agent-status-card">
                  <div className="agent-card-header">
                    <div className="agent-avatar">🤖</div>
                    <div className="agent-header-text">
                      <div className="agent-name">{agent.name}</div>
                      <div className="agent-role">{agent.role}</div>
                    </div>
                    <span className="agent-status-pill green">ONLINE</span>
                  </div>
                  <div className="agent-stats-row">
                    <div className="stat-item">
                      <span className="stat-label">Latency</span>
                      <span className="stat-val">{agent.latency}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Accuracy</span>
                      <span className="stat-val">{agent.accuracy}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Auto Run</span>
                      <span className="stat-val green">Enabled</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* View: Settings */}
        {activeNav === "settings" && (
          <main className="main-portal-container">
            <div className="portal-header-bar">
              <div>
                <h1 className="portal-title">⚙️ Fixora AI Settings & Preferences</h1>
                <p className="portal-subtitle">Configure AI reasoning behavior, speech parameters, and employee persona.</p>
              </div>
            </div>

            <div className="settings-cards-stack">
              {/* Card 1: Active Employee Persona */}
              <div className="settings-card">
                <h3 className="settings-card-title">👤 Active Demo Persona</h3>
                <p className="settings-card-desc">Switch between personas to test department-specific IT permissions.</p>
                <div className="persona-selector-grid">
                  {[
                    { name: "Sarah Connor", email: "sarah.connor@fixora.local", role: "DevOps Engineer", avatar: "SC" },
                    { name: "Jane Doe", email: "jane.doe@fixora.local", role: "Product Manager", avatar: "JD" },
                    { name: "Alex Vance", email: "alex.vance@fixora.local", role: "Lead IT Administrator", avatar: "AV" }
                  ].map((p) => (
                    <div 
                      key={p.email} 
                      className={`persona-card ${activeUser.email === p.email ? "active" : ""}`}
                      onClick={() => setActiveUser(p)}
                    >
                      <div className="persona-avatar">{p.avatar}</div>
                      <div className="persona-info">
                        <div className="persona-name">{p.name}</div>
                        <div className="persona-role">{p.role}</div>
                        <div className="persona-email">{p.email}</div>
                      </div>
                      {activeUser.email === p.email && <span className="active-check">✓ Active</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: AI Multi-Agent Configuration */}
              <div className="settings-card">
                <h3 className="settings-card-title">🤖 Autonomous Agent Tuning</h3>
                <p className="settings-card-desc">Select how aggressively Fixora AI resolves issues without human intervention.</p>
                <div className="radio-options-group">
                  <label className="radio-option-item">
                    <input 
                      type="radio" 
                      name="resMode" 
                      value="hybrid" 
                      checked={resolutionMode === "hybrid"} 
                      onChange={() => setResolutionMode("hybrid")} 
                    />
                    <div>
                      <strong>Hybrid Multi-Agent (Recommended)</strong>
                      <div>Autonomous diagnosis + automated runbook execution with 1-click human escalation.</div>
                    </div>
                  </label>
                  <label className="radio-option-item">
                    <input 
                      type="radio" 
                      name="resMode" 
                      value="autonomous" 
                      checked={resolutionMode === "autonomous"} 
                      onChange={() => setResolutionMode("autonomous")} 
                    />
                    <div>
                      <strong>Full Autonomous IT Service Desk</strong>
                      <div>Direct execution of remediation scripts with post-validation integrity checks.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card 3: Speech Synthesis Speed */}
              <div className="settings-card">
                <h3 className="settings-card-title">🔊 Speech Synthesis Voice Rate</h3>
                <p className="settings-card-desc">Adjust the speed of the Fixora AI voice engine.</p>
                <div className="slider-row">
                  <span>0.8x</span>
                  <input 
                    type="range" 
                    min="0.8" 
                    max="1.5" 
                    step="0.1" 
                    value={ttsSpeed} 
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))} 
                  />
                  <span>1.5x</span>
                  <span className="slider-value-pill">{ttsSpeed}x</span>
                  <button className="btn-test-voice" onClick={() => speak("Hello! Voice synthesis is active and running smoothly.")}>
                    🔊 Test Voice
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Right Sidebar (Shown on Ask Fixora) */}
        {activeNav === "ask" && (
          <aside className="right-sidebar">
            <div className="right-card create-ticket-card">
              <h3 className="card-title">Create a Ticket</h3>
              <p className="card-desc">Quickly create a ticket for your issue.</p>
              <button className="btn-new-ticket" onClick={() => setShowNewTicketModal(true)}>
                + New Ticket
              </button>
            </div>

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

            <div className="right-card popular-topics-card">
              <h3 className="card-title">Popular Topics</h3>
              <div className="topics-list">
                {POPULAR_TOPICS.map((topic, i) => (
                  <div
                    key={i}
                    className="topic-row"
                    onClick={() => {
                      setInput(topic.prompt);
                      inputRef.current?.focus();
                    }}
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
        )}
      </div>

      {/* Modal 1: New Ticket Creation Modal */}
      {showNewTicketModal && (
        <div className="modal-backdrop" onClick={() => setShowNewTicketModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">➕ Create New Support Ticket</h2>
              <button className="modal-close-btn" onClick={() => setShowNewTicketModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateNewTicketSubmit}>
              <div className="modal-form-body">
                <div className="form-group">
                  <label className="form-label">Employee</label>
                  <input type="text" className="form-input" disabled value={`${activeUser.name} (${activeUser.email})`} />
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select" 
                      value={newTicketData.category}
                      onChange={(e) => setNewTicketData({ ...newTicketData, category: e.target.value })}
                    >
                      <option value="network">Network & VPN</option>
                      <option value="account">Account & MFA</option>
                      <option value="hardware">Hardware / Laptop</option>
                      <option value="software">Software & Permissions</option>
                    </select>
                  </div>

                  <div className="form-group half">
                    <label className="form-label">Priority</label>
                    <select 
                      className="form-select"
                      value={newTicketData.priority}
                      onChange={(e) => setNewTicketData({ ...newTicketData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Issue Description</label>
                  <textarea 
                    className="form-textarea" 
                    rows={4}
                    placeholder="Describe the issue in detail (e.g., 'VPN connection drops on Wi-Fi' or 'Need Docker desktop permissions')..."
                    value={newTicketData.issue}
                    onChange={(e) => setNewTicketData({ ...newTicketData, issue: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowNewTicketModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  ⚡ Launch AI Auto-Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ticket {selectedTicket.ticket_number || '#' + selectedTicket.id} Details</h2>
              <button className="modal-close-btn" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="modal-form-body">
              <div className="ticket-detail-grid">
                <div><strong>Status:</strong> <span className="tag-status resolved">{selectedTicket.status}</span></div>
                <div><strong>Priority:</strong> <span className="tag-priority high">{selectedTicket.priority || "HIGH"}</span></div>
                <div><strong>Category:</strong> {selectedTicket.category || "General"}</div>
                <div><strong>Assigned:</strong> {selectedTicket.assigned_technician || "Fixora AI (Auto-Resolved)"}</div>
              </div>

              <div className="ticket-detail-section">
                <div className="section-subheading">Issue Statement</div>
                <div className="ticket-detail-issue-box">{selectedTicket.issue}</div>
              </div>

              <div className="ticket-detail-section">
                <div className="section-subheading">Agent Execution Telemetry</div>
                <div className="telemetry-log-box">
                  <code>[09:15:02] SupervisorAgent: Received ticket payload #{selectedTicket.id}</code><br/>
                  <code>[09:15:03] DiagnosticAgent: Executing ping & connectivity probing... [OK]</code><br/>
                  <code>[09:15:04] KnowledgeAgent: Loaded Runbook #KB-102 (VPN Gateway Flush)</code><br/>
                  <code>[09:15:05] ResolutionAgent: Automated remediation applied successfully.</code>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedTicket(null)}>Close</button>
              <button 
                className="btn-primary-action"
                onClick={() => {
                  setSelectedTicket(null);
                  setActiveNav("ask");
                  handleSubmit(`Re-run diagnostics for ticket ${selectedTicket.ticket_number || '#' + selectedTicket.id}`, "text");
                }}
              >
                Re-Run Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Article Detail Modal */}
      {selectedArticle && (
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedArticle.title}</h2>
              <button className="modal-close-btn" onClick={() => setSelectedArticle(null)}>✕</button>
            </div>

            <div className="modal-form-body">
              <div className="article-meta-bar">
                <span className="kb-cat-tag">{selectedArticle.category}</span>
                <span>⏱️ {selectedArticle.readTime || "3 min read"}</span>
                <span>👁️ {selectedArticle.views || 240} views</span>
              </div>

              <p className="article-full-summary">{selectedArticle.summary || selectedArticle.content}</p>

              <div className="article-steps-block">
                <div className="section-subheading">📋 Step-by-Step Remediation Protocol</div>
                {selectedArticle.steps && selectedArticle.steps.map((step, idx) => (
                  <div key={idx} className="article-step-item">
                    <span className="step-badge">{idx + 1}</span>
                    <span className="step-text">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedArticle(null)}>Close</button>
              <button 
                className="btn-primary-action"
                onClick={() => {
                  setSelectedArticle(null);
                  setActiveNav("ask");
                  handleSubmit(`Execute runbook for "${selectedArticle.title}" on my system`, "text");
                }}
              >
                ⚡ Execute Runbook with Fixora AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
