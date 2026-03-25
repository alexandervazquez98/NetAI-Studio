import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import init_db
from backend.routers import analysis, chat, graph, websocket

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB on startup."""
    logger.info("Starting NetAI Studio backend...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down NetAI Studio backend.")


app = FastAPI(
    title="NetAI Studio API",
    version="1.0.0",
    description="AI-powered network management platform",
    lifespan=lifespan,
)

# --- CORS ---
origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(graph.router)
app.include_router(analysis.router)
app.include_router(chat.router)
app.include_router(websocket.router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "netai-studio-backend"}
