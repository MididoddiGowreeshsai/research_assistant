import json
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from langgraph.types import Command

from api.schemas import ResearchRequest, ResumeRequest

router = APIRouter()

PIPELINE_NODES = {"rag", "orchestrator", "search", "summarizer", "writer", "store_report"}
SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def event_stream(
    graph, input_data, config: dict, thread_id: str
) -> AsyncGenerator[str, None]:
    yield sse("thread_id", {"thread_id": thread_id})

    try:
        async for chunk in graph.astream(input_data, config, stream_mode="updates"):
            if "__interrupt__" in chunk:
                report = chunk["__interrupt__"][0].value.get("report", "")
                yield sse("review_required", {"thread_id": thread_id, "report": report})
                return

            for node_name, node_output in chunk.items():
                if node_name not in PIPELINE_NODES:
                    continue
                yield sse("node_start", {"node": node_name, "thread_id": thread_id})
                payload: dict = {"node": node_name, "thread_id": thread_id}
                if node_name == "orchestrator":
                    payload["sub_questions"] = node_output.get("sub_questions", [])
                if node_name == "rag":
                    payload["rag_hits"] = node_output.get("rag_hits", 0)
                yield sse("node_end", payload)

        state = await graph.aget_state(config)
        report = state.values.get("final_report", "") if state else ""
        yield sse("complete", {"thread_id": thread_id, "report": report})

    except Exception as exc:
        yield sse("error", {"thread_id": thread_id, "message": str(exc)})


@router.post("/research")
async def start_research(body: ResearchRequest, request: Request):
    graph = request.app.state.graph
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "topic": body.topic,
        "sub_questions": [],
        "search_results": [],
        "summaries": [],
        "final_report": None,
        "human_feedback": None,
        "approved": False,
        "rag_context": None,
        "rag_hits": 0,
    }

    return StreamingResponse(
        event_stream(graph, initial_state, config, thread_id),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@router.post("/research/{thread_id}/resume")
async def resume_research(thread_id: str, body: ResumeRequest, request: Request):
    graph = request.app.state.graph
    config = {"configurable": {"thread_id": thread_id}}
    resume_val = {"approved": body.approved, "feedback": body.feedback}

    return StreamingResponse(
        event_stream(graph, Command(resume=resume_val), config, thread_id),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@router.get("/research/{thread_id}")
async def get_research_state(thread_id: str, request: Request):
    graph = request.app.state.graph
    config = {"configurable": {"thread_id": thread_id}}
    state = await graph.aget_state(config)
    return {"values": state.values if state else {}}
