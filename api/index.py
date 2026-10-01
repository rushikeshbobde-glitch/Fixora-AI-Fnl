import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
fixora_dir = os.path.join(root_dir, "Fixora_AI")

possible_paths = [
    root_dir,
    fixora_dir,
    os.path.join(root_dir, "Fixora_AI_Problem12_PostgreSQL_Complete"),
    os.path.join(root_dir, "Fixora_AI_Problem12_PostgreSQL_Complete", "Fixora_AI"),
    current_dir
]

for p in possible_paths:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.main import app
except Exception:
    try:
        from Fixora_AI.backend.main import app
    except Exception as e:
        import backend.main as bmain
        app = bmain.app
