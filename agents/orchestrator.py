from core.llm import extract_text, get_llm
from graph.state import ResearchState


def orchestrator_node(state: ResearchState) -> dict:
    llm = get_llm()
    topic = state["topic"]
    rag_context = state.get("rag_context") or ""

    if rag_context:
        prompt = f"""You are a research orchestrator. Existing knowledge about this topic is provided below.
Identify exactly 3 specific sub-questions that represent GAPS not already covered by the existing knowledge.

Topic: {topic}

Existing Knowledge (already retrieved from past reports):
{rag_context}

Return ONLY a numbered list of 3 gap-filling sub-questions, one per line. No preamble, no explanation."""
    else:
        prompt = f"""You are a research orchestrator. Given the topic below, generate exactly 3 specific sub-questions that together would comprehensively cover this topic.

Topic: {topic}

Return ONLY a numbered list of 3 sub-questions, one per line. No preamble, no explanation."""

    response = llm.invoke(prompt)
    lines = [l.strip() for l in extract_text(response).strip().splitlines() if l.strip()]
    sub_questions = [l.lstrip("0123456789). ").strip() for l in lines][:3]

    print(f"\n[Orchestrator] Generated {len(sub_questions)} sub-questions:")
    for i, q in enumerate(sub_questions, 1):
        print(f"  {i}. {q}")

    return {"sub_questions": sub_questions}
