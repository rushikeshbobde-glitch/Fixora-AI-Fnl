def run(category, evidence, issue_text=""):
    messages = {
        "hardware": "Detected workstation boot failure, residual power capacitor block, or display output halt.",
        "printer": "Detected print spooler buffer stall or corrupt local printer job queue.",
        "vpn": "Detected VPN gateway handshake timeout or expired tunnel credentials.",
        "network": "Detected network adapter DHCP lease expiration or DNS resolution anomaly.",
        "authentication": "Detected Active Directory account lockout following repeated authentication failures.",
        "device": "Detected high background process resource contention and temporary cache buildup.",
        "software": "Detected unprovisioned software package or missing catalog entitlement.",
        "general": "General incident requiring diagnostic triage and human review."
    }

    # Probed simulated subsystem status
    system_probes = {
        "hardware": {"motherboard_power": "STANDBY_POWER_NOMINAL", "status": "COLD_BOOT_REQUIRED", "bios_post": "PENDING_POWER_CYCLE"},
        "printer": {"spooler_service": "Windows Spooler (spoolsv.exe)", "status": "STALLED_QUEUE", "driver_version": "v10.4.1", "queue_backlog": 3},
        "vpn": {"gateway": "vpn.corporate.internal", "status": "ONLINE (Latency 22ms)", "tunnel_protocol": "WireGuard/IKEv2", "session_status": "EXPIRED_SESSION_TOKEN"},
        "network": {"adapter": "Ethernet/Wi-Fi DualBand", "status": "ONLINE", "dhcp_pool": "192.168.1.0/24", "dns_health": "NOMINAL (1.1.1.1)"},
        "authentication": {"directory": "Azure AD / Okta Sync", "status": "ONLINE", "account_policy": "LOCKED_AFTER_5_ATTEMPTS", "mfa_health": "NOMINAL"},
        "device": {"cpu_utilization": "88%", "ram_usage": "92%", "status": "MEMORY_PRESSURE", "orphaned_threads": 4},
        "software": {"intune_agent": "ONLINE", "catalog_sync": "NOMINAL", "status": "READY_FOR_DEPLOYMENT"},
        "general": {"infrastructure": "Corporate Core", "status": "NOMINAL", "alerts": 0}
    }

    probed_status = system_probes.get(category, system_probes["general"])

    return {
        "diagnosis": messages.get(category, messages["general"]),
        "evidence_code": evidence[0]["code"] if evidence else None,
        "system_status": probed_status,
        "correlation_confidence": 0.94 if evidence else 0.45
    }


