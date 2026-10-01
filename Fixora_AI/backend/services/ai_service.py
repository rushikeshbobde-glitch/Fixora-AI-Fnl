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
        "temperature": 0.2,
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

