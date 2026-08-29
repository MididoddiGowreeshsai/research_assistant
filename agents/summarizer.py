from core.llm import extract_text, get_llm
from graph.state import ResearchState


def summarizer_node(state: ResearchState) -> dict:
    llm = get_llm()
    search_results = state["search_results"]

    summaries = []
    for item in search_results:
        question = item["question"]
        results = item["results"]

        results_text = "\n".join(
            f"- {r.get('content', r.get('snippet', str(r)))}"
            for r in results
        )

        prompt = f"""Summarize the following search results to answer the question concisely and factually.

Question: {question}

Search Results:
{results_text}

Write a clear 2-3 paragraph summary. Only include information supported by the search results."""

        print(f"\n[Summarizer] Summarizing results for: {question[:60]}...")
        response = llm.invoke(prompt)
        summaries.append({"question": question, "summary": extract_text(response)})

    return {"summaries": summaries}
