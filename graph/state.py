from typing import List, Optional, TypedDict


class ResearchState(TypedDict):
    topic: str
    sub_questions: List[str]
    search_results: List[dict]   # [{question, results}]
    summaries: List[dict]        # [{question, summary}]
    final_report: Optional[str]
    human_feedback: Optional[str]
    approved: bool
    rag_context: Optional[str]   # past reports retrieved by pgvector
    rag_hits: int                # number of past reports found
