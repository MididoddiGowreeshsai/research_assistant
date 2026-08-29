from langgraph.graph import END, StateGraph

from agents.hitl import hitl_node
from agents.orchestrator import orchestrator_node
from agents.search import search_node
from agents.summarizer import summarizer_node
from agents.writer import writer_node
from graph.state import ResearchState


def _route_after_hitl(state: ResearchState) -> str:
    return END if state.get("approved") else "writer"


def build_graph(checkpointer=None):
    workflow = StateGraph(ResearchState)

    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("search", search_node)
    workflow.add_node("summarizer", summarizer_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("hitl", hitl_node)

    workflow.set_entry_point("orchestrator")
    workflow.add_edge("orchestrator", "search")
    workflow.add_edge("search", "summarizer")
    workflow.add_edge("summarizer", "writer")
    workflow.add_edge("writer", "hitl")
    workflow.add_conditional_edges("hitl", _route_after_hitl)

    return workflow.compile(checkpointer=checkpointer)
