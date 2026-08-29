from langgraph.graph import END, StateGraph

from agents.hitl import hitl_node
from agents.orchestrator import orchestrator_node
from agents.rag import rag_node
from agents.search import search_node
from agents.store_report import store_report_node
from agents.summarizer import summarizer_node
from agents.writer import writer_node
from graph.state import ResearchState


def _route_after_hitl(state: ResearchState) -> str:
    return "store_report" if state.get("approved") else "writer"


def build_graph(checkpointer=None):
    workflow = StateGraph(ResearchState)

    workflow.add_node("rag", rag_node)
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("search", search_node)
    workflow.add_node("summarizer", summarizer_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("hitl", hitl_node)
    workflow.add_node("store_report", store_report_node)

    workflow.set_entry_point("rag")
    workflow.add_edge("rag", "orchestrator")
    workflow.add_edge("orchestrator", "search")
    workflow.add_edge("search", "summarizer")
    workflow.add_edge("summarizer", "writer")
    workflow.add_edge("writer", "hitl")
    workflow.add_conditional_edges("hitl", _route_after_hitl)
    workflow.add_edge("store_report", END)

    return workflow.compile(checkpointer=checkpointer)
