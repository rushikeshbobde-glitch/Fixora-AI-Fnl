import re


def run(issue: str):
    text = issue.lower()
    category = "general"
    if re.search(r"\b(vpn)\b", text):
        category = "vpn"
    elif re.search(r"(wifi|wi-fi|internet|network|dns)", text):
        category = "network"
    elif re.search(r"(password|login|account|locked|authentication)", text):
        category = "authentication"
    elif re.search(r"(laptop|computer|pc|device|keyboard|mouse|printer|print|spooler)", text):
        category = "device"

    priority = "medium"
    if re.search(r"(production|security breach|data loss|server down|ransomware)", text):
        priority = "critical"
    elif re.search(r"(urgent|cannot work|deadline|meeting)", text):
        priority = "high"

    return {
        "category": category,
        "priority": priority,
        "summary": issue
    }
