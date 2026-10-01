const API = import.meta.env.VITE_API_URL || "/api";

export async function investigate(issue, employeeName = "Demo Employee", employeeEmail = "demo@fixora.local") {
  const response = await fetch(`${API}/tickets`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      issue,
      employee_name: employeeName,
      employee_email: employeeEmail
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Backend request failed");
  }

  return response.json();
}

export async function getTickets() {
  const response = await fetch(`${API}/tickets`);
  if (!response.ok) throw new Error("Could not load ticket history");
  return response.json();
}

export async function getTicket(ticketId) {
  const response = await fetch(`${API}/tickets/${ticketId}`);
  if (!response.ok) throw new Error(`Could not load ticket #${ticketId}`);
  return response.json();
}

export async function performAction(ticketId, action, note = "") {
  const response = await fetch(`${API}/tickets/${ticketId}/action`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ action, note })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Action execution failed");
  }

  return response.json();
}

export async function getKnowledgeBase() {
  const response = await fetch(`${API}/kb`);
  if (!response.ok) throw new Error("Could not load knowledge base");
  return response.json();
}

