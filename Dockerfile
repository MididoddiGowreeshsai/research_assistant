# syntax=docker/dockerfile:1
# Multi-stage build for Hugging Face Spaces (port 7860).
# Builds the React frontend in Stage 1, then serves everything from the
# FastAPI backend in Stage 2 so there is only one public URL.

# ── Stage 1: build React frontend ────────────────────────────────────────────
FROM node:20-slim AS fe-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + static assets ───────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY agents/ agents/
COPY api/ api/
COPY core/ core/
COPY graph/ graph/
COPY main.py .

# Embed built frontend so FastAPI serves the SPA from /
COPY --from=fe-build /app/frontend/dist/ api/static/

# Non-root user (HF Spaces requirement)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 7860
ENV PORT=7860

# api/main.py's __main__ block reads $PORT and starts uvicorn
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT}
