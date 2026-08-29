from core.vector_store import similarity_search
from graph.state import ResearchState


def rag_node(state: ResearchState) -> dict:
    topic = state["topic"]
    print(f"\n[RAG] Searching past reports for: {topic[:60]}...")

    hits = similarity_search(topic, threshold=0.75)

    if not hits:
        print("[RAG] No similar past reports found — full research will run.")
        return {"rag_context": "", "rag_hits": 0}

    print(f"[RAG] Found {len(hits)} relevant past report(s).")
    rag_context = "\n\n---\n\n".join(
        f"[Past report: {h['topic']} | relevance {h['similarity']:.0%}]\n\n{h['report_content']}"
        for h in hits
    )
    return {"rag_context": rag_context, "rag_hits": len(hits)}
