from backend.tools.mock_it_tools import execute_tool


def run(tools):
    results = []
    for tool in tools:
        results.append({
            "name": tool,
            "result": execute_tool(tool)
        })
    return {
        "actions": results,
        "message": "Approved simulated diagnostic actions were executed."
    }
