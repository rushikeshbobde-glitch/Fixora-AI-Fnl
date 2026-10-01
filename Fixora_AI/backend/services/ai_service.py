from backend.config import settings


def explain_with_optional_ai(prompt: str) -> str:
    # The MVP intentionally keeps the deterministic workflow as the source of truth.
    # An OpenAI-compatible integration can be added here when AI_ENABLED=true.
    if not settings.ai_enabled:
        return ""
    return ""
