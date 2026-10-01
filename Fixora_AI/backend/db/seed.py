from backend.db.models import Employee, KnowledgeArticle


ARTICLES = [
    {
        "code": "KB-VPN-001",
        "title": "VPN connection troubleshooting",
        "category": "vpn",
        "content": "Troubleshoot an employee VPN connection using approved client, gateway diagnostic and session refresh checks.",
        "steps": [
            "Check VPN client status and reachability.",
            "Confirm corporate gateway network connectivity.",
            "Execute approved VPN session refresh.",
            "Retry secure gateway handshake.",
            "Escalate if authentication or gateway handshake fails."
        ],
        "tools": ["check_network", "check_vpn", "reset_vpn_session"]
    },
    {
        "code": "KB-NET-001",
        "title": "Wi-Fi and Local Network Troubleshooting",
        "category": "network",
        "content": "Troubleshoot employee Wi-Fi and DHCP connectivity issues through simulated adapter and lease renewal checks.",
        "steps": [
            "Check network adapter and latency.",
            "Release and renew DHCP lease.",
            "Verify DNS resolution and default gateway.",
            "Escalate if signal or hardware fault persists."
        ],
        "tools": ["check_network", "renew_dhcp_lease"]
    },
    {
        "code": "KB-AUTH-001",
        "title": "Account Lockout and Password Troubleshooting",
        "category": "authentication",
        "content": "Troubleshoot account lockout and password issues using approved identity verification and directory unlocking.",
        "steps": [
            "Confirm employee identity in directory.",
            "Check account lockout status.",
            "Execute automated account unlock if policy allows.",
            "Send secure self-service password reset link.",
            "Escalate if identity or account state cannot be verified."
        ],
        "tools": ["check_auth", "unlock_user_account"]
    },
    {
        "code": "KB-DEV-001",
        "title": "Device and Peripheral Troubleshooting",
        "category": "device",
        "content": "Troubleshoot common laptop, peripheral, and device driver problems using automated diagnostics.",
        "steps": [
            "Check device system health and driver status.",
            "Collect basic hardware diagnostics.",
            "Restart affected device service.",
            "Verify device status.",
            "Escalate suspected hardware failure."
        ],
        "tools": ["check_device"]
    },
    {
        "code": "KB-PRN-001",
        "title": "Office Printer and Spooler Troubleshooting",
        "category": "device",
        "content": "Diagnose and resolve office printer stalls, offline status, and print spooler queue jams.",
        "steps": [
            "Check printer status on local subnet.",
            "Verify Windows Print Spooler service state.",
            "Execute automated print spooler restart and clear queue.",
            "Send test print job to verify online readiness.",
            "Escalate if mechanical or toner hardware error."
        ],
        "tools": ["check_device", "restart_print_spooler"]
    }
]


def seed_database(db):
    if not db.query(Employee).first():
        db.add(Employee(
            name="Demo Employee",
            email="demo@fixora.local",
            department="Engineering"
        ))

    for item in ARTICLES:
        existing = db.query(KnowledgeArticle).filter(KnowledgeArticle.code == item["code"]).first()
        if not existing:
            db.add(KnowledgeArticle(**item))
        else:
            existing.title = item["title"]
            existing.category = item["category"]
            existing.content = item["content"]
            existing.steps = item["steps"]
            existing.tools = item["tools"]

    db.commit()

