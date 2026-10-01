def run(category, evidence):
    messages = {
        "vpn": "Likely VPN session or gateway connectivity issue.",
        "network": "Likely network connectivity or adapter issue.",
        "authentication": "Likely account verification or authentication issue.",
        "device": "Likely local device or peripheral issue.",
        "general": "Insufficient evidence for a specific diagnosis."
    }
    return {
        "diagnosis": messages.get(category, messages["general"]),
        "evidence_code": evidence[0]["code"] if evidence else None
    }
