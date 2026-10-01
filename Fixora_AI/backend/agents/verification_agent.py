def run(category, action_results):
    if not action_results:
        return {"verified": False, "message": "No approved tool action was available."}

    statuses = [x["result"].get("status") for x in action_results]
    has_remediation = any(x["result"].get("action") == "remediated" and x["result"].get("status") == "success" for x in action_results)
    has_unsupported = any(s == "unsupported" for s in statuses)

    if has_unsupported:
        verified = False
        message = "Simulation failed: unsupported tool requested."
    elif has_remediation:
        verified = True
        message = "Autonomous remediation verified: simulated service state restored successfully."
    elif all(s in {"reachable", "online", "success", "no_critical_error"} for s in statuses):
        verified = True
        message = "Diagnostics verified: system parameters are within normal operating thresholds."
    else:
        verified = False
        message = "The simulated verification indicates that human follow-up may be required."

    return {
        "verified": verified,
        "message": message,
        "remediation_applied": has_remediation
    }

