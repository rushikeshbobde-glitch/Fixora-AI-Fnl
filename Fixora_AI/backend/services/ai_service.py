import logging
import httpx
from backend.config import settings

logger = logging.getLogger("fixora")


def explain_with_optional_ai(prompt: str, system_prompt: str = "You are Fixora AI, an autonomous IT service desk reasoning agent.") -> str:
    """
    Synthesizes IT analysis with an OpenAI-compatible endpoint when AI_ENABLED=True.
    Always falls back gracefully if the API is disabled, unreachable, or unconfigured.
    """
    if not settings.ai_enabled or not settings.ai_api_key:
        return ""

    base_url = (settings.ai_base_url or "https://api.openai.com/v1").rstrip("/")
    endpoint = f"{base_url}/chat/completions"
    model = settings.ai_model or "gpt-4o-mini"

    headers = {
        "Authorization": f"Bearer {settings.ai_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 250
    }

    try:
        with httpx.Client(timeout=6.0) as client:
            response = client.post(endpoint, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            else:
                logger.warning("AI service returned status code %s: %s", response.status_code, response.text)
    except Exception as exc:
        logger.warning("Optional AI synthesis bypassed due to connection note: %s", exc)

    return ""


def synthesize_voice_response(issue: str, status: str, category: str, diagnosis: str, resolution: str, tools_executed: list[str]) -> str:
    """
    Produces a crisp, empathetic, voice-ready speech response suitable for Audio Calls and Voice Agents.
    """
    prompt = (
        f"Employee Issue: {issue}\n"
        f"Category: {category}\n"
        f"Diagnosis: {diagnosis}\n"
        f"Executed Tools: {', '.join(tools_executed)}\n"
        f"Status: {status}\n"
        f"Resolution: {resolution}\n"
        "Generate a friendly, professional, 2-3 sentence spoken voice response from Fixora AI to the employee on an audio call."
    )

    ai_speech = explain_with_optional_ai(
        prompt,
        system_prompt="You are Fixora AI, an empathetic and highly skilled IT support agent speaking directly on an audio phone call with an employee. Keep your response spoken, clear, reassuring, and under 40 words."
    )

    if ai_speech:
        return ai_speech

    # Intelligent deterministic voice fallback
    if status == "RESOLUTION_READY" or status == "RESOLVED_BY_HUMAN":
        if "vpn" in category.lower() or "vpn" in issue.lower():
            return "I've checked your connection and refreshed your corporate VPN session token. Your tunnel is now verified and active. Please reconnect now!"
        elif "auth" in category.lower() or "password" in issue.lower() or "lock" in issue.lower():
            return "I've verified your identity and unlocked your corporate directory account. A temporary one-time passcode has been sent to your registered phone."
        elif "network" in category.lower() or "wi-fi" in issue.lower() or "wifi" in issue.lower():
            return "I've released and renewed your DHCP network lease with DNS servers 1.1.1.1. Your local connection is now restored."
        elif "device" in category.lower() or "print" in issue.lower() or "spool" in issue.lower():
            return "I've cleared the corrupt print buffer and restarted the Windows Print Spooler service. Your printer is now ready to receive jobs."
        else:
            return f"I've investigated your issue and executed automated recovery runbooks. {resolution}"
    else:
        return f"I've diagnosed the problem as {diagnosis.lower() if diagnosis else 'requiring Tier-2 engineer review'}. For safety, I've escalated your ticket to Senior IT Support with all telemetry attached."


