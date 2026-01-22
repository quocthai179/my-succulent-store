from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import crud, models
from .db import engine, get_db_session
from .routers import cart, chat, orders, products

app = FastAPI(title="Succulent Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    models.Base.metadata.create_all(bind=engine)
    with get_db_session() as db:
        crud.seed_products(db)


app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(chat.router)


@app.get("/")
def read_root():
    return {"status": "ok"}
