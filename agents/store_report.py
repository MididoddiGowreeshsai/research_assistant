from core.vector_store import insert_report
from graph.state import ResearchState


def store_report_node(state: ResearchState) -> dict:
    topic = state["topic"]
    report = state.get("final_report") or ""
    sub_questions = state.get("sub_questions") or []

    print(f"\n[StoreReport] Saving to vector store: {topic[:60]}...")
    insert_report(topic=topic, report_content=report, sub_questions=sub_questions)
    print("[StoreReport] Done.")

    return {}
