def check_network():
    return {"tool": "check_network", "status": "reachable", "latency_ms": 24, "gateway": "10.0.0.1"}


def check_vpn():
    return {"tool": "check_vpn", "status": "session_refresh_required", "gateway": "vpn.corporate.internal", "client_version": "v4.9.2"}


def check_auth():
    return {"tool": "check_auth", "status": "account_locked_failed_attempts", "user": "demo@fixora.local", "lockout_time": "12 mins ago"}


def check_device():
    return {"tool": "check_device", "status": "online", "diagnostics": "spooler_queue_blocked"}


def reset_vpn_session():
    return {
        "tool": "reset_vpn_session",
        "status": "success",
        "action": "remediated",
        "message": "VPN session token regenerated and tunnel re-established successfully.",
        "tunnel_ip": "10.8.0.45"
    }


def unlock_user_account():
    return {
        "tool": "unlock_user_account",
        "status": "success",
        "action": "remediated",
        "message": "Directory account unlocked. Temporary one-time passcode dispatched via SMS/email.",
        "user": "demo@fixora.local"
    }


def renew_dhcp_lease():
    return {
        "tool": "renew_dhcp_lease",
        "status": "success",
        "action": "remediated",
        "message": "DHCP lease released and renewed with DNS servers 1.1.1.1 / 8.8.8.8.",
        "assigned_ip": "192.168.1.144"
    }


def restart_print_spooler():
    return {
        "tool": "restart_print_spooler",
        "status": "success",
        "action": "remediated",
        "message": "Print spooler service restarted and corrupt print buffer cleared.",
        "queue_count": 0
    }


def execute_tool(name):
    tools = {
        "check_network": check_network,
        "check_vpn": check_vpn,
        "check_auth": check_auth,
        "check_device": check_device,
        "reset_vpn_session": reset_vpn_session,
        "unlock_user_account": unlock_user_account,
        "renew_dhcp_lease": renew_dhcp_lease,
        "restart_print_spooler": restart_print_spooler,
    }
    fn = tools.get(name)
    return fn() if fn else {"tool": name, "status": "unsupported", "message": f"Tool '{name}' not found in registry"}

