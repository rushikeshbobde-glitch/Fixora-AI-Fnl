from backend.db.models import Employee, KnowledgeArticle


ARTICLES = [
    {
        "code": "KB-VPN-001",
        "title": "VPN connection troubleshooting",
        "category": "vpn",
        "content": "Troubleshoot an employee VPN connection using approved client and connectivity checks.",
        "steps": [
            "Check VPN client status.",
            "Confirm network connectivity.",
            "Refresh the VPN session.",
            "Retry the approved VPN connection.",
            "Escalate if authentication or gateway checks fail."
        ],
        "tools": ["check_network", "check_vpn"]
    },
    {
        "code": "KB-NET-001",
        "title": "Wi-Fi connection troubleshooting",
        "category": "network",
        "content": "Troubleshoot employee Wi-Fi connectivity.",
        "steps": [
            "Check network connectivity.",
            "Refresh the network adapter.",
            "Reconnect to the approved network.",
            "Verify connectivity.",
            "Escalate if the issue persists."
        ],
        "tools": ["check_network"]
    },
    {
        "code": "KB-AUTH-001",
        "title": "Account and password troubleshooting",
        "category": "authentication",
        "content": "Troubleshoot account lockout and password issues using approved identity checks.",
        "steps": [
            "Confirm the employee identity.",
            "Check account status.",
            "Run the approved authentication diagnostic.",
            "Use the approved password-reset workflow if permitted.",
            "Escalate if identity or account state cannot be verified."
        ],
        "tools": ["check_auth"]
    },
    {
        "code": "KB-DEV-001",
        "title": "Device troubleshooting",
        "category": "device",
        "content": "Troubleshoot common laptop and peripheral problems.",
        "steps": [
            "Check device status.",
            "Collect basic diagnostics.",
            "Restart the affected service or device when approved.",
            "Verify device status.",
            "Escalate suspected hardware failure."
        ],
        "tools": ["check_device"]
    }
]


def seed_database(db):
    if not db.query(Employee).first():
        db.add(Employee(
            name="Demo Employee",
            email="demo@fixora.local",
            department="Engineering"
        ))

    if not db.query(KnowledgeArticle).first():
        for item in ARTICLES:
            db.add(KnowledgeArticle(**item))

    db.commit()
