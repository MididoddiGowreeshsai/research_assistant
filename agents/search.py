from core.llm import get_search_tool
from graph.state import ResearchState


def search_node(state: ResearchState) -> dict:
    search = get_search_tool()
    sub_questions = state["sub_questions"]

    search_results = []
    for question in sub_questions:
        print(f"\n[Search] Searching: {question}")
        results = search.invoke(question)
        search_results.append({"question": question, "results": results})

    return {"search_results": search_results}
