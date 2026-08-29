import uuid

from dotenv import load_dotenv

load_dotenv()

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from graph.builder import build_graph

PIPELINE_NODES = {"orchestrator", "search", "summarizer", "writer"}


def run_research(topic: str) -> dict:
    graph = build_graph(checkpointer=MemorySaver())
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    initial_state = {
        "topic": topic,
        "sub_questions": [],
        "search_results": [],
        "summaries": [],
        "final_report": None,
        "human_feedback": None,
        "approved": False,
    }

    print(f"\n{'='*60}\nResearch Topic: {topic}\n{'='*60}")

    current_input = initial_state
    while True:
        interrupted = False

        for chunk in graph.stream(current_input, config, stream_mode="updates"):
            if "__interrupt__" in chunk:
                interrupted = True
                report = chunk["__interrupt__"][0].value.get("report", "")
                print(f"\n{'='*60}\nDRAFT REPORT\n{'='*60}\n{report}")
                break

            for node_name, node_output in chunk.items():
                if node_name not in PIPELINE_NODES:
                    continue
                print(f"\n[{node_name.upper()}] done")
                if node_name == "orchestrator":
                    for i, q in enumerate(node_output.get("sub_questions", []), 1):
                        print(f"  {i}. {q}")

        if not interrupted:
            break

        answer = input("\n→ Approve? (type 'approve' or describe changes): ").strip()
        if answer.lower() == "approve":
            current_input = Command(resume={"approved": True})
        else:
            current_input = Command(resume={"approved": False, "feedback": answer})

    final = graph.get_state(config).values
    print(f"\n{'='*60}\nFINAL APPROVED REPORT\n{'='*60}\n{final.get('final_report', '')}")
    return final


if __name__ == "__main__":
    topic = input("Enter research topic: ").strip()
    if topic:
        run_research(topic)
