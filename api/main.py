import os
import pathlib
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

load_dotenv()

from api.limits import limiter
from api.routes import research


@asynccontextmanager
async def lifespan(app: FastAPI):
    from graph.builder import build_graph
    from graph.checkpointer import make_checkpointer

    async with make_checkpointer() as checkpointer:
        app.state.graph = build_graph(checkpointer=checkpointer)
        yield


app = FastAPI(title="Research Assistant API", lifespan=lifespan)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)  # inner — applied after CORS

# CORS — origins from env, never *
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
app.add_middleware(  # outer — handles preflight before rate limiting sees it
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve the bundled SPA when running via Docker / HF Spaces.
# Must be mounted AFTER /api routes so it only catches non-API paths.
_static = pathlib.Path(__file__).parent / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="spa")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, workers=1)
