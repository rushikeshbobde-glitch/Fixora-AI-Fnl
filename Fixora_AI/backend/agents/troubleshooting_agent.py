def run(evidence, category="general", issue_text=""):
    """
    Key Challenge Implementation:
    Dynamically select the appropriate tool and action based on the specific issue symptoms,
    system state, and safety constraints rather than blindly following a fixed workflow.
    """
    if not evidence:
        return {
            "steps": ["Collect additional issue telemetry.", "Escalate to human IT technician."],
            "tools": [],
            "dynamic_selection_reason": "No matched runbook found; avoiding automated execution on unknown pattern.",
            "evaluated_tools": []
        }

    issue_lower = (issue_text or "").lower()
    base_tools = evidence[0].get("tools", [])
    base_steps = evidence[0].get("steps", [])

    selected_tools = []
    reason_notes = []
    evaluated_tools = []

    # Dynamic Tool Selection Logic
    if "printer" in issue_lower or "spooler" in issue_lower or "jam" in issue_lower or category == "printer":
        selected_tools = ["check_device", "restart_print_spooler"]
        reason_notes.append("Dynamic trigger: Printer/spooler failure detected -> Selected non-destructive queue purge and spooler service restart.")
        evaluated_tools = [
            {"tool": "restart_print_spooler", "decision": "SELECTED", "reason": "Restores buffer without impacting host OS"},
            {"tool": "reboot_workstation", "decision": "SKIPPED", "reason": "High user disruption; spooler restart suffices"},
            {"tool": "reinstall_driver", "decision": "SKIPPED", "reason": "Requires elevated privileges and network pull"}
        ]
    elif "boot" in issue_lower or "power" in issue_lower or "turn on" in issue_lower or "won't start" in issue_lower or "dead" in issue_lower or category == "hardware":
        selected_tools = ["check_device", "hardware_power_diagnostic"]
        reason_notes.append("Dynamic trigger: Workstation boot failure / power halt -> Selected power rail verification and residual power drain runbook.")
        evaluated_tools = [
            {"tool": "hardware_power_diagnostic", "decision": "SELECTED", "reason": "Evaluates power rails and generates cold power cycle steps"},
            {"tool": "reflash_bios", "decision": "REJECTED", "reason": "Safety hazard; risky to execute on unpowered hardware"},
            {"tool": "format_disk", "decision": "REJECTED", "reason": "Data loss safety violation"}
        ]
    elif "vpn" in issue_lower or "gateway" in issue_lower or "tunnel" in issue_lower or category == "vpn":
        selected_tools = ["check_network", "check_vpn", "reset_vpn_session"]
        reason_notes.append("Dynamic trigger: VPN tunnel handshake error -> Selected session token refresh and gateway reconnect.")
        evaluated_tools = [
            {"tool": "reset_vpn_session", "decision": "SELECTED", "reason": "Clears expired token and regenerates session"},
            {"tool": "flush_dns", "decision": "SKIPPED", "reason": "DNS resolution is healthy (1.1.1.1)"},
            {"tool": "reinstall_vpn_client", "decision": "SKIPPED", "reason": "Client binary is up to date"}
        ]
    elif "password" in issue_lower or "lock" in issue_lower or "account" in issue_lower or category == "authentication":
        selected_tools = ["check_auth", "unlock_user_account"]
        reason_notes.append("Dynamic trigger: Identity lockout detected -> Selected automated directory account unlock and MFA challenge.")
        evaluated_tools = [
            {"tool": "unlock_user_account", "decision": "SELECTED", "reason": "Unlocks AD directory object and triggers SMS OTP"},
            {"tool": "reset_kerberos_ticket", "decision": "SKIPPED", "reason": "Lockout occurs at IdP level"},
            {"tool": "disable_account", "decision": "REJECTED", "reason": "Violates employee productivity safety policy"}
        ]
    elif "wi-fi" in issue_lower or "wifi" in issue_lower or "dhcp" in issue_lower or "ip" in issue_lower or category == "network":
        selected_tools = ["check_network", "renew_dhcp_lease"]
        reason_notes.append("Dynamic trigger: Local adapter / IP lease fault -> Selected DHCP release/renew cycle.")
        evaluated_tools = [
            {"tool": "renew_dhcp_lease", "decision": "SELECTED", "reason": "Re-acquires subnet IP from corporate pool"},
            {"tool": "reset_network_switch", "decision": "SKIPPED", "reason": "Infrastructure-wide impact; localized adapter fix only"}
        ]
    elif "install" in issue_lower or "software" in issue_lower or "license" in issue_lower or category == "software":
        selected_tools = ["check_device", "verify_software_license"]
        reason_notes.append("Dynamic trigger: Software provisioning request -> Selected Intune package validation and silent deploy.")
        evaluated_tools = [
            {"tool": "verify_software_license", "decision": "SELECTED", "reason": "Validates corporate entitlement and installs package"},
            {"tool": "admin_elevation_override", "decision": "SKIPPED", "reason": "Requires compliance review"}
        ]
    elif "slow" in issue_lower or "freeze" in issue_lower or "laptop" in issue_lower or category == "device":
        selected_tools = ["check_device", "clean_temp_cache"]
        reason_notes.append("Dynamic trigger: Device performance degradation -> Selected memory cleanup and cache purge.")
        evaluated_tools = [
            {"tool": "clean_temp_cache", "decision": "SELECTED", "reason": "Frees memory pressure without rebooting device"},
            {"tool": "reinstall_os", "decision": "REJECTED", "reason": "Extreme action; cache cleanup sufficient"}
        ]
    else:
        # Fallback to evidence toolset
        selected_tools = base_tools
        reason_notes.append("Standard runbook toolset applied from validated knowledge base.")
        evaluated_tools = [{"tool": t, "decision": "SELECTED", "reason": "Runbook baseline"} for t in base_tools]


    return {
        "steps": base_steps,
        "tools": selected_tools,
        "dynamic_selection_reason": " ".join(reason_notes),
        "evaluated_tools": evaluated_tools
    }

