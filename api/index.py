import os
import sys

# Add root and subfolder paths to sys.path so backend package is found
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
fixora_dir = os.path.join(root_dir, "Fixora_AI")

for p in [root_dir, fixora_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app
