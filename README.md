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
- **Rate limiting** — per-IP 3 req/hour via slowapi; global daily cap (default 40) via env
- **Cold-start banner** — frontend polls `/api/health` and shows a waking indicator on Render free tier

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent orchestration | [LangGraph](https://github.com/langchain-ai/langgraph) |
| LLM | Google Gemini (`gemini-3.6-flash`) via `langchain-google-genai` |
| Web search | [Tavily](https://tavily.com) |
| Embeddings | Google `text-embedding-004` (768-dim) |
| Vector store | PostgreSQL + pgvector ([Neon](https://neon.tech)) |
| Backend | FastAPI + SSE streaming + slowapi rate limiting |
| State persistence | PostgreSQL (`langgraph-checkpoint-postgres`) / MemorySaver |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |

---

## Project Structure

```
research_assistant/
├── main.py                   # Terminal entry point
├── requirements.txt          # Pinned via pip freeze
├── render.yaml               # Render deployment config
├── Dockerfile                # Multi-stage build for Hugging Face Spaces
├── .env.example
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
│   ├── main.py               # FastAPI app + CORS + rate limiting + lifespan
│   ├── limits.py             # slowapi Limiter, daily cap, validate_topic, heartbeat
│   ├── schemas.py            # Pydantic models
│   └── routes/
│       └── research.py       # SSE streaming endpoints
└── frontend/
    ├── vercel.json           # Vite build + SPA rewrite
    ├── .env.example
    └── src/
        ├── App.tsx           # Cold-start banner + main layout
        ├── lib/api.ts        # API_BASE, apiUrl(), pingBackend()
        ├── hooks/
        │   ├── useResearchStream.ts
        │   └── useBackendWake.ts   # polls /api/health, 90s timeout
        └── components/
            ├── AgentStatusFeed.tsx
            ├── HitlReviewBar.tsx
            └── ReportPreview.tsx
```

---

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Google AI Studio API key](https://aistudio.google.com) (free)
- [Tavily API key](https://tavily.com) (free tier)
- PostgreSQL with pgvector (optional — MemorySaver + no RAG used if `DATABASE_URL` is not set)

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

# Optional — enables pgvector RAG + persistent HITL checkpointing
# Use Neon's DIRECT connection string (not the -pooler URL)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Install frontend deps

```bash
cd frontend
cp .env.example .env     # edit VITE_API_URL if backend is not on :8000
npm install
cd ..
```

### 4. Run locally

```bash
# Terminal 1 — FastAPI backend (port 8000)
uvicorn api.main:app --reload

# Terminal 2 — React frontend (port 5173)
cd frontend && npm run dev

# Terminal mode (no API needed)
python main.py
```

---

## Deploy — Vercel + Render (default)

### Backend → Render free tier

1. Push the repo to GitHub.
2. In [Render](https://render.com) → New → Web Service → connect the repo.
3. Set **Root Directory** to `.` (the repo root).
4. Render detects `render.yaml` automatically. If not, set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT --workers 1`
5. Under **Environment**, add the secret variables (marked `sync: false` in `render.yaml`):

   | Key | Value |
   |---|---|
   | `GOOGLE_API_KEY` | your key |
   | `TAVILY_API_KEY` | your key |
   | `DATABASE_URL` | Neon direct URL (`?sslmode=require`) |
   | `ALLOWED_ORIGINS` | your Vercel frontend URL, e.g. `https://research-assistant.vercel.app` |

6. Copy the Render service URL (e.g. `https://research-assistant-api.onrender.com`).

> **Neon database**: create a free project at [neon.tech](https://neon.tech), copy the **direct** connection string (not the `-pooler` URL — LangGraph's checkpointer uses prepared statements that PgBouncer rejects), and paste it as `DATABASE_URL`.

### Frontend → Vercel

1. In [Vercel](https://vercel.com) → New Project → import the repo.
2. Set **Root Directory** to `frontend/`.
3. Vercel auto-detects Vite. Add one environment variable:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render backend URL (no trailing slash) |

4. Deploy. `frontend/vercel.json` handles the SPA catch-all rewrite automatically.

---

## Deploy — Hugging Face Spaces (single URL)

Use the included `Dockerfile` to serve the React SPA and the FastAPI backend from one container.

1. Create a new Space on [huggingface.co/spaces](https://huggingface.co/spaces) → **Docker** SDK → port **7860**.
2. Push the repo as-is (the Dockerfile is at the root).
3. Add the following **Repository Secrets** in Space settings:

   | Secret | Value |
   |---|---|
   | `GOOGLE_API_KEY` | your key |
   | `TAVILY_API_KEY` | your key |
   | `DATABASE_URL` | Neon direct URL (`?sslmode=require`) |
   | `ALLOWED_ORIGINS` | your Space URL, e.g. `https://username-research-assistant.hf.space` |

4. The build installs Python deps, builds the React frontend, and serves both from port 7860.  
   No `VITE_API_URL` needed — all traffic goes to the same origin.

---

## API Reference

| Method | Endpoint | Auth/Limit |
|---|---|---|
| `GET` | `/api/health` | no limit |
| `POST` | `/api/research` | 3/hour per IP; daily global cap |
| `POST` | `/api/research/{thread_id}/resume` | 10/hour per IP |
| `GET` | `/api/research/{thread_id}` | no limit |

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

Heartbeat comments (`: ping`) are emitted every 15 seconds of silence to keep proxies alive — the frontend silently discards them.

---

## Build Phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ | 4-agent pipeline (Orchestrator → Search → Summarizer → Writer) |
| 2 | ✅ | HITL with `LangGraph interrupt()` + PostgreSQL checkpointing |
| 3 | ✅ | FastAPI backend with SSE streaming |
| 4 | ✅ | React chat UI with agent status feed and report preview panel |
| 5 | ✅ | RAG layer with pgvector — retrieval, gap analysis, knowledge synthesis, auto-persist |
| 6 | ✅ | Production deployment — Vercel + Render + Neon; Dockerfile for HF Spaces |

---

## License

MIT
