import asyncio

from core.llm import extract_text, get_llm
from graph.state import ResearchState


async def _summarize_one(llm, question: str, results: list) -> dict:
    results_text = "\n".join(
        f"- {r.get('content', r.get('snippet', str(r)))}"
        for r in results
    )
    prompt = f"""Summarize the following search results to answer the question concisely and factually.

Question: {question}

Search Results:
{results_text}

Write a clear 2-3 paragraph summary. Only include information supported by the search results."""

    print(f"\n[Summarizer] Summarizing: {question[:60]}...")
    response = await llm.ainvoke(prompt)
    return {"question": question, "summary": extract_text(response)}


async def summarizer_node(state: ResearchState) -> dict:
    llm = get_llm()
    search_results = state["search_results"]

    summaries = await asyncio.gather(
        *[_summarize_one(llm, item["question"], item["results"]) for item in search_results]
    )
    return {"summaries": list(summaries)}
