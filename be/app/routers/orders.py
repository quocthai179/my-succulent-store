from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..db import get_db_session

router = APIRouter(prefix="/orders", tags=["orders"])


def get_db():
    with get_db_session() as session:
        yield session


@router.post("", response_model=schemas.OrderRead)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    cart = crud.get_or_create_cart(db, payload.cart_id)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    order = crud.create_order_from_cart(db, cart)
    return order
