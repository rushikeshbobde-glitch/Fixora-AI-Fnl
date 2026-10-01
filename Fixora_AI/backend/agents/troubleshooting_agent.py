def run(evidence):
    if not evidence:
        return {
            "steps": ["Collect additional issue details.", "Escalate to a human technician."],
            "tools": []
        }
    return {
        "steps": evidence[0]["steps"],
        "tools": evidence[0]["tools"]
    }
