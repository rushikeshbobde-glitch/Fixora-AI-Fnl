def run(priority, evidence, verification):
    if priority == "critical":
        return {
            "status": "ESCALATE_TO_HUMAN",
            "reason": "Critical priority requires human oversight.",
            "confidence": 0.62
        }
    if not evidence:
        return {
            "status": "ESCALATE_TO_HUMAN",
            "reason": "No matching knowledge evidence was found.",
            "confidence": 0.55
        }
    if not verification["verified"]:
        return {
            "status": "ESCALATE_TO_HUMAN",
            "reason": "Verification did not confirm a safe autonomous resolution.",
            "confidence": 0.68
        }
    return {
        "status": "RESOLUTION_READY",
        "reason": "Evidence was found and simulated verification passed.",
        "confidence": 0.91
    }
