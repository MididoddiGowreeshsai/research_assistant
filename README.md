# Multi-Agent Research Assistant

A multi-agent research assistant that takes a topic and returns a structured report — built with **LangGraph**, **Google Gemini**, and **Tavily**. Features human-in-the-loop review, a streaming FastAPI backend, and a React frontend.

---

## Architecture

```
User Input (topic)
       │
       ▼
 ┌─────────────┐
 │ Orchestrator│  → Breaks topic into 3 targeted sub-questions (Gemini)
 └──────┬──────┘
        │
        ▼
 ┌─────────────┐
 │ Search Agent│  → Web search per sub-question (Tavily)
 └──────┬──────┘
        │
        ▼
 ┌─────────────────┐
 │ Summarizer Agent│  → Condenses each search result (Gemini)
 └──────┬──────────┘
        │
        ▼
 ┌─────────────┐
 │ Writer Agent│  → Compiles structured markdown report (Gemini)
 └──────┬──────┘
        │
        ▼
 ┌─────────────┐
 │ HITL Review │  → User approves or requests changes (LangGraph interrupt)
 └──────┬──────┘
        │
   approved? ──No──→ Writer Agent (revise with feedback)
        │
       Yes
        │
        ▼
  Final Report
```

---

## Features

- **4-agent pipeline** — Orchestrator → Search → Summarizer → Writer
- **Human-in-the-loop (HITL)** — approve or request changes after each draft via `LangGraph interrupt()`
- **Iterative revision** — writer receives the previous draft + feedback and produces targeted changes
- **SSE streaming** — real-time agent progress streamed to the frontend
- **PostgreSQL checkpointing** — HITL state persists across API restarts (falls back to in-memory)
- **React UI** — two-panel layout: agent status feed + markdown report preview

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent orchestration | [LangGraph](https://github.com/langchain-ai/langgraph) |
| LLM | Google Gemini (`gemini-3.6-flash`) via `langchain-google-genai` |
| Web search | [Tavily](https://tavily.com) |
| Backend | FastAPI + SSE streaming |
| State persistence | PostgreSQL (`langgraph-checkpoint-postgres`) / MemorySaver |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |

---

## Project Structure

```
research_assistant/
├── main.py                   # Terminal entry point (Phase 1 & 2)
├── requirements.txt
├── .env
├── agents/
│   ├── orchestrator.py       # Breaks topic → 3 sub-questions
│   ├── search.py             # Tavily web search
│   ├── summarizer.py         # Summarises search results
│   ├── writer.py             # Compiles / revises report
│   └── hitl.py               # Human review node (interrupt)
├── graph/
│   ├── state.py              # ResearchState TypedDict
│   ├── builder.py            # LangGraph graph construction
│   └── checkpointer.py       # Async PostgreSQL / MemorySaver setup
├── core/
│   └── llm.py                # Gemini + Tavily initializers
├── api/
│   ├── main.py               # FastAPI app + lifespan
│   ├── schemas.py            # Pydantic models
│   └── routes/
│       └── research.py       # SSE streaming endpoints
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── hooks/useResearchStream.ts
    │   └── components/
    │       ├── AgentStatusFeed.tsx
    │       ├── HitlReviewBar.tsx
    │       └── ReportPreview.tsx
    └── package.json
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Google AI Studio API key](https://aistudio.google.com) (free)
- [Tavily API key](https://tavily.com) (free tier)
- PostgreSQL (optional — MemorySaver used if not configured)

### 1. Clone & install Python deps

```bash
git clone https://github.com/YOUR_USERNAME/research-assistant.git
cd research-assistant
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
GOOGLE_API_KEY=your_google_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# Optional: set for persistent HITL state across restarts
DATABASE_URL=postgresql://user:password@localhost/research_assistant
```

### 3. Install frontend deps

```bash
cd frontend
npm install
cd ..
```

---

## Running

### Terminal mode (Phases 1 & 2 — HITL in terminal)

```bash
python main.py
```

Enter a topic, review the draft, then type `approve` or describe changes.

### Full stack (Phases 3 & 4)

Open three terminals:

```bash
# Terminal 1 — FastAPI backend
uvicorn api.main:app --reload

# Terminal 2 — React frontend
cd frontend
npm run dev

# Open http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/research` | Start research, returns SSE stream |
| `POST` | `/api/research/{thread_id}/resume` | Resume after HITL with feedback |
| `GET` | `/api/research/{thread_id}` | Get current graph state |

### SSE Event Types

```
thread_id        → {"thread_id": "uuid"}
node_start       → {"node": "orchestrator", "thread_id": "..."}
node_end         → {"node": "orchestrator", "sub_questions": [...], "thread_id": "..."}
review_required  → {"thread_id": "...", "report": "markdown string"}
complete         → {"thread_id": "...", "report": "markdown string"}
error            → {"thread_id": "...", "message": "..."}
```

---

## Build Phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ | 4-agent pipeline (Orchestrator → Search → Summarizer → Writer) |
| 2 | ✅ | HITL with `LangGraph interrupt()` + PostgreSQL checkpointing |
| 3 | ✅ | FastAPI backend with SSE streaming |
| 4 | ✅ | React chat UI with agent status feed and report preview panel |

---

## Screenshots

> _Add screenshots of the React UI here_

---

## License

MIT