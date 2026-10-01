const API = "http://127.0.0.1:8000/api";

export async function investigate(issue) {
  const response = await fetch(`${API}/tickets`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      issue,
      employee_name: "Demo Employee",
      employee_email: "demo@fixora.local"
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
