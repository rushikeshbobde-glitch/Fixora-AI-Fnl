def check_network():
    return {"tool": "check_network", "status": "reachable", "latency_ms": 24}


def check_vpn():
    return {"tool": "check_vpn", "status": "session_refresh_required", "gateway": "demo-vpn"}


def check_auth():
    return {"tool": "check_auth", "status": "account_requires_verification"}


def check_device():
    return {"tool": "check_device", "status": "online", "diagnostics": "no_critical_error"}


def execute_tool(name):
    tools = {
        "check_network": check_network,
        "check_vpn": check_vpn,
        "check_auth": check_auth,
        "check_device": check_device,
    }
    fn = tools.get(name)
    return fn() if fn else {"tool": name, "status": "unsupported"}
