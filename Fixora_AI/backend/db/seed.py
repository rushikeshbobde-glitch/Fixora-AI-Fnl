from backend.db.models import Employee, KnowledgeArticle


ARTICLES = [
    {
        "code": "KB-BOOT-001",
        "title": "PC and Workstation Boot / Power Failure Troubleshooting",
        "category": "hardware",
        "content": "Diagnose and resolve workstation boot failure, power loss, black screen, and POST halt conditions.",
        "steps": [
            "Check AC power cord and outlet indicator LED.",
            "Perform hardware residual power drain (hold power button for 30s).",
            "Disconnect external USB peripherals, hubs, and second displays.",
            "Verify internal display cable and backlight.",
            "Attempt cold reboot and listen for BIOS POST diagnostic beeps.",
            "Escalate to Desktop Hardware Support if motherboard or PSU failure."
        ],
        "tools": ["check_device", "hardware_power_diagnostic"]
    },
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
        "title": "Workstation Performance and Device Diagnostics",
        "category": "device",
        "content": "Troubleshoot laptop sluggishness, application freezing, and peripheral driver faults.",
        "steps": [
            "Check CPU and memory utilization thresholds.",
            "Terminate orphaned background crash reporting processes.",
            "Clear temporary OS cache and swap buffer.",
            "Verify system responsiveness and driver health.",
            "Escalate suspected hardware failure."
        ],
        "tools": ["check_device", "clean_temp_cache"]
    },
    {
        "code": "KB-PRN-001",
        "title": "Office Printer and Spooler Troubleshooting",
        "category": "printer",
        "content": "Diagnose and resolve office printer stalls, offline status, and print spooler queue jams.",
        "steps": [
            "Check printer status on local subnet.",
            "Verify Windows Print Spooler service state.",
            "Execute automated print spooler restart and clear queue.",
            "Send test print job to verify online readiness.",
            "Escalate if mechanical or toner hardware error."
        ],
        "tools": ["check_device", "restart_print_spooler"]
    },
    {
        "code": "KB-SOFT-001",
        "title": "Software Installation and License Provisioning",
        "category": "software",
        "content": "Assist employees with installing corporate productivity software, developer tools, and license activations.",
        "steps": [
            "Check software catalog for approved application package.",
            "Verify user role entitlement in Microsoft Intune / Jamf.",
            "Push automated background silent installation package.",
            "Confirm software icon appears in Start menu.",
            "Escalate if custom license key or admin elevation required."
        ],
        "tools": ["check_device", "verify_software_license"]
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

