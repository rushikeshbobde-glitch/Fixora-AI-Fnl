import re


def run(issue: str):
    text = issue.lower()
    category = "general"
    
    if re.search(r"(printer|print|spooler|paper jam|toner)", text):
        category = "printer"
    elif re.search(r"(boot|power|turn on|won't start|not starting|not booting|black screen|dead pc|shutting down|shuts down)", text):
        category = "hardware"
    elif re.search(r"\b(vpn)\b|gateway|tunnel", text):
        category = "vpn"
    elif re.search(r"(wifi|wi-fi|internet|network|dns|dhcp|ip address)", text):
        category = "network"
    elif re.search(r"(password|login|account|locked|authentication|sso|mfa)", text):
        category = "authentication"
    elif re.search(r"(install|software|application|license|download)", text):
        category = "software"
    elif re.search(r"(laptop|computer|pc|device|keyboard|mouse|slow|freeze|freezing)", text):
        category = "device"

    priority = "medium"
    if re.search(r"(production|security breach|data loss|server down|ransomware|critical)", text):
        priority = "critical"
    elif re.search(r"(urgent|cannot work|deadline|meeting|executive|vip)", text):
        priority = "high"


    return {
        "category": category,
        "priority": priority,
        "summary": issue
    }
