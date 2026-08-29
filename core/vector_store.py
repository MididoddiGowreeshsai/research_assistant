import os

import psycopg
from langchain_google_genai import GoogleGenerativeAIEmbeddings

VECTOR_DIM = 768


def _embedder() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )


def _vec_str(v: list) -> str:
    return "[" + ",".join(str(x) for x in v) + "]"


def _connect() -> psycopg.Connection:
    return psycopg.connect(os.getenv("DATABASE_URL", ""))


def setup_vector_store() -> None:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return
    with _connect() as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        conn.execute(f"""
            CREATE TABLE IF NOT EXISTS research_reports (
                id SERIAL PRIMARY KEY,
                topic TEXT NOT NULL,
                embedding vector({VECTOR_DIM}),
                report_content TEXT NOT NULL,
                sub_questions TEXT[] DEFAULT '{{}}',
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """)
        conn.commit()
    print("[VectorStore] Table ready.")


def similarity_search(topic: str, threshold: float = 0.75, limit: int = 3) -> list:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return []
    try:
        vec = _vec_str(_embedder().embed_query(topic))
        with _connect() as conn:
            rows = conn.execute(
                """
                SELECT topic, report_content,
                       1 - (embedding <=> %s::vector) AS sim
                FROM research_reports
                WHERE 1 - (embedding <=> %s::vector) >= %s
                ORDER BY sim DESC
                LIMIT %s
                """,
                (vec, vec, threshold, limit),
            ).fetchall()
        return [{"topic": r[0], "report_content": r[1], "similarity": float(r[2])} for r in rows]
    except Exception as e:
        print(f"[VectorStore] Search failed: {e}")
        return []


def insert_report(topic: str, report_content: str, sub_questions: list) -> None:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return
    try:
        vec = _vec_str(_embedder().embed_query(topic))
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO research_reports (topic, embedding, report_content, sub_questions)
                VALUES (%s, %s::vector, %s, %s)
                """,
                (topic, vec, report_content, sub_questions),
            )
            conn.commit()
    except Exception as e:
        print(f"[VectorStore] Insert failed: {e}")
