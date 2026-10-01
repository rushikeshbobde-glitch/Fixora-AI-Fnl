import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
parent_dir = os.path.abspath(os.path.join(root_dir, ".."))

for p in [root_dir, parent_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app
