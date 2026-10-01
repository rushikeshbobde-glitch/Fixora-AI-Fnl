import { useEffect, useState } from "react";
import { getTickets, investigate } from "./api";

const examples = [
  "My VPN is not connecting",
  "My laptop cannot connect to Wi-Fi",
  "I forgot my password and my account is locked",
  "The office printer is not printing"
];

function AgentCard({ index, item }) {
  return (
    <div className="agent-card">
      <span className="agent-number">AGENT {String(index + 1).padStart(2, "0")}</span>
      <h4>{item.agent}</h4>
      <p>{JSON.stringify(item.output, null, 2)}</p>
    </div>
  );
}

export default function App() {
  const [issue, setIssue] = useState(examples[0]);
  const [result, setResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshTickets() {
    try {
      setTickets(await getTickets());
    } catch {
      // Backend may not be started yet.
    }
  }

  useEffect(() => {
    refreshTickets();
  }, []);

  async function handleInvestigate() {
    if (!issue.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await investigate(issue);
      setResult(data);
      await refreshTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">AGENTIC AI · PROBLEM STATEMENT #12</div>
          <h1>Fixora AI</h1>
          <p>Autonomous IT Service Desk & Resolution Agent</p>
        </div>
        <div className="online">● PostgreSQL + FastAPI</div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <h2>From Employee Problem → Verified Resolution</h2>
            <p>
              Fixora coordinates specialized agents, retrieves knowledge,
              performs simulated diagnostics, verifies the result, and
              escalates cases that require human oversight.
            </p>
          </div>
        </section>

        <section className="two-column">
          <div className="panel">
            <h3>New IT Ticket</h3>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={6}
            />

            <div className="examples">
              {examples.map((item) => (
                <button key={item} onClick={() => setIssue(item)}>
                  {item}
                </button>
              ))}
            </div>

            <button
              className="primary"
              disabled={loading}
              onClick={handleInvestigate}
            >
              {loading ? "Agents Investigating..." : "Investigate Ticket"}
            </button>

            {error && <div className="error">{error}</div>}
          </div>

          <div className="panel">
            <h3>Decision</h3>
            {!result ? (
              <div className="empty">Run an investigation to see the result.</div>
            ) : (
              <>
                <div className={`status ${result.status === "RESOLUTION_READY" ? "ready" : "escalate"}`}>
                  {result.status.replaceAll("_", " ")}
                </div>
                <div className="decision-grid">
                  <div><span>Category</span><strong>{result.category}</strong></div>
                  <div><span>Priority</span><strong>{result.priority}</strong></div>
                  <div><span>Confidence</span><strong>{Math.round(result.confidence * 100)}%</strong></div>
                  <div><span>Ticket</span><strong>#{result.ticket_id}</strong></div>
                </div>
                <p><b>Diagnosis:</b> {result.diagnosis}</p>
                <p><b>Resolution:</b> {result.resolution}</p>
                <p><b>Escalation:</b> {result.escalation_reason}</p>
              </>
            )}
          </div>
        </section>

        {result && (
          <>
            <section className="panel">
              <div className="section-title">
                <h3>Agent Execution Trail</h3>
                <span>{result.workflow.length} stages</span>
              </div>
              <div className="workflow">
                {result.workflow.map((item, index) => (
                  <AgentCard key={`${item.agent}-${index}`} index={index} item={item} />
                ))}
              </div>
            </section>

            <section className="two-column">
              <div className="panel">
                <h3>Evidence</h3>
                {result.evidence.length ? (
                  <ul>
                    {result.evidence.map((e) => (
                      <li key={e.code}>
                        <b>{e.code}</b> — {e.title}
                        <br />
                        <span>{e.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty">No matching evidence.</div>
                )}
              </div>

              <div className="panel">
                <h3>PostgreSQL Ticket History</h3>
                <div className="history">
                  {tickets.map((ticket) => (
                    <div className="history-row" key={ticket.id}>
                      <b>#{ticket.id}</b>
                      <span>{ticket.issue}</span>
                      <em>{ticket.status}</em>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
