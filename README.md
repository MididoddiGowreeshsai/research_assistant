# Multi-Agent Research Assistant

A multi-agent research assistant that takes a topic and returns a structured report — built with **LangGraph**, **Google Gemini**, and **Tavily**. Features a RAG layer with pgvector, human-in-the-loop review, a streaming FastAPI backend, and a React frontend.

---

## Architecture

```
User Input (topic)
       │
       ▼
 ┌─────────────┐
 │  RAG Agent  │  → Retrieves similar past reports from pgvector (768-dim embeddings)
 └──────┬──────┘
        │
        ▼
 ┌─────────────┐
 │ Orchestrator│  → Identifies 3 gap-filling sub-questions (or full coverage if no past reports)
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
 │ Writer Agent│  → Combines past knowledge + new findings into unified report (Gemini)
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
 ┌──────────────┐
 │ Store Report │  → Embeds & saves approved report back to pgvector for future retrieval
 └──────┬───────┘
        │
        ▼
  Final Report
```

---

## Features

- **RAG layer** — retrieves similar past approved reports from pgvector (cosine similarity ≥ 0.75) before starting research
- **Gap-aware orchestrator** — when past reports exist, generates only sub-questions that cover knowledge gaps
- **Knowledge synthesis** — writer blends existing knowledge + new findings into a unified report
- **Human-in-the-loop (HITL)** — approve or request changes after each draft via `LangGraph interrupt()`
- **Iterative revision** — writer receives the previous draft + feedback and produces targeted changes
- **Auto-persist** — approved reports are embedded and stored back to pgvector for future retrieval
- **SSE streaming** — real-time agent progress streamed to the frontend (including RAG hit count)
- **PostgreSQL checkpointing** — HITL state persists across API restarts (falls back to in-memory)
- **React UI** — two-panel layout: agent status feed + markdown report preview

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent orchestration | [LangGraph](https://github.com/langchain-ai/langgraph) |
| LLM | Google Gemini (`gemini-3.6-flash`) via `langchain-google-genai` |
| Web search | [Tavily](https://tavily.com) |
| Embeddings | Google `text-embedding-004` (768-dim) |
| Vector store | PostgreSQL + pgvector |
| Backend | FastAPI + SSE streaming |
| State persistence | PostgreSQL (`langgraph-checkpoint-postgres`) / MemorySaver |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |

---

## Project Structure

```
research_assistant/
├── main.py                   # Terminal entry point
├── requirements.txt
├── .env
├── agents/
│   ├── rag.py                # pgvector similarity retrieval node
│   ├── orchestrator.py       # Breaks topic → 3 sub-questions (gap-aware)
│   ├── search.py             # Tavily web search
│   ├── summarizer.py         # Summarises search results
│   ├── writer.py             # Compiles / revises report (blends RAG + new)
│   ├── hitl.py               # Human review node (interrupt)
│   └── store_report.py       # Embeds & saves approved report to pgvector
├── graph/
│   ├── state.py              # ResearchState TypedDict
│   ├── builder.py            # LangGraph graph construction
│   └── checkpointer.py       # Async PostgreSQL / MemorySaver setup
├── core/
│   ├── llm.py                # Gemini + Tavily initializers
│   └── vector_store.py       # pgvector setup, similarity search, insert
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
- PostgreSQL with pgvector extension (optional — MemorySaver + no RAG used if not configured)

### 1. Clone & install Python deps

```bash
git clone https://github.com/MididoddiGowreeshsai/research_assistant.git
cd research_assistant
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

# Optional: enables pgvector RAG + persistent HITL state
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

### Terminal mode

```bash
python main.py
```

Enter a topic, review the draft, then type `approve` or describe changes.

### Full stack

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
node_start       → {"node": "rag", "thread_id": "..."}
node_end         → {"node": "rag", "rag_hits": 2, "thread_id": "..."}
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
| 5 | ✅ | RAG layer with pgvector — retrieval, gap analysis, knowledge synthesis, auto-persist |

---

## Screenshots

> _Add screenshots of the React UI here_

---

## License

MIT
