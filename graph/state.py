from typing import List, Optional, TypedDict


class ResearchState(TypedDict):
    topic: str
    sub_questions: List[str]
    search_results: List[dict]   # [{question, results}]
    summaries: List[dict]        # [{question, summary}]
    final_report: Optional[str]
    human_feedback: Optional[str]
    approved: bool
