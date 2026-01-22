from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..chat_agent import ChatAgent
from ..db import get_db_session

router = APIRouter(prefix="/chat", tags=["chat"])


def get_db():
    with get_db_session() as session:
        yield session


def build_cart_read(cart) -> schemas.CartRead:
    total = crud.calculate_cart_total(cart)
    return schemas.CartRead(
        id=cart.id,
        items=cart.items,
        total=total,
    )


@router.post("", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    cart = crud.get_or_create_cart(db, payload.cart_id)
    agent = ChatAgent(db)
    response = agent.run(payload.message, cart)
    return schemas.ChatResponse(
        response=response,
        cart_id=cart.id,
        cart=build_cart_read(cart),
    )
