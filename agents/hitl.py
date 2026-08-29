from langgraph.types import interrupt

from graph.state import ResearchState


def hitl_node(state: ResearchState) -> dict:
    feedback: dict = interrupt({"report": state["final_report"]})
    if feedback.get("approved"):
        return {"approved": True, "human_feedback": None}
    return {"approved": False, "human_feedback": feedback.get("feedback", "")}
