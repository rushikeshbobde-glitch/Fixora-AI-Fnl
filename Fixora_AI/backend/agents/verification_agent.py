def run(category, action_results):
    if not action_results:
        return {"verified": False, "message": "No approved tool action was available."}

    statuses = [x["result"].get("status") for x in action_results]
    if category == "vpn":
        verified = "session_refresh_required" not in statuses
    else:
        verified = all(s not in {"unsupported"} for s in statuses)

    return {
        "verified": verified,
        "message": (
            "The simulated verification passed."
            if verified else
            "The simulated verification indicates that human follow-up may be required."
        )
    }
