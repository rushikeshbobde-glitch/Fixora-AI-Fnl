import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
parent_dir = os.path.abspath(os.path.join(root_dir, ".."))

possible_paths = [
    root_dir,
    parent_dir,
    current_dir
]

for p in possible_paths:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.main import app
except Exception:
    import backend.main as bmain
    app = bmain.app
