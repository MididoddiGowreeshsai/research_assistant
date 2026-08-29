from core.llm import extract_text, get_llm
from graph.state import ResearchState


def writer_node(state: ResearchState) -> dict:
    llm = get_llm()
    topic = state["topic"]
    summaries = state["summaries"]
    feedback = state.get("human_feedback") or ""
    rag_context = state.get("rag_context") or ""

    summaries_text = "\n\n".join(
        f"### {item['question']}\n{item['summary']}" for item in summaries
    )

    if feedback:
        previous_report = state.get("final_report") or ""
        prompt = f"""You are a professional research writer revising a report based on reviewer feedback.

Topic: {topic}

Previous Report (the draft to revise):
{previous_report}

Research Summaries (source material):
{summaries_text}

Reviewer Feedback: {feedback}

Produce a revised report that visibly and specifically addresses the feedback above.
Do NOT return the same report — make concrete changes based on the feedback.
Keep this structure:
1. Executive Summary (2-3 sentences)
2. Key Findings (organized by sub-topic with clear headers)
3. Conclusion (3-4 sentences)

Use professional language and markdown formatting."""
    elif rag_context:
        prompt = f"""You are a professional research writer. Combine existing knowledge with new research findings into a comprehensive report.

Topic: {topic}

Existing Knowledge (from past reports — use this as a foundation):
{rag_context}

New Research Summaries (gaps discovered by fresh search):
{summaries_text}

Write a unified report that integrates both the existing knowledge and new findings:
1. Executive Summary (2-3 sentences)
2. Key Findings (organized by sub-topic with clear headers — blend old and new knowledge)
3. Conclusion (3-4 sentences with key takeaways)

Use professional language and markdown formatting. Do not mention "existing knowledge" or "past reports" directly."""
    else:
        prompt = f"""You are a professional research writer. Compile the summaries below into a structured report.

Topic: {topic}

Research Summaries:
{summaries_text}

Write the report with:
1. Executive Summary (2-3 sentences)
2. Key Findings (organized by sub-topic with clear headers)
3. Conclusion (3-4 sentences with key takeaways)

Use professional language and markdown formatting."""

    print("\n[Writer] Compiling report...")
    response = llm.invoke(prompt)
    return {"final_report": extract_text(response), "human_feedback": None}
