from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..db import get_db_session

router = APIRouter(prefix="/cart", tags=["cart"])


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


@router.get("", response_model=schemas.CartRead)
def get_cart(cart_id: int | None = None, db: Session = Depends(get_db)):
    cart = crud.get_or_create_cart(db, cart_id)
    return build_cart_read(cart)


@router.post("/items", response_model=schemas.CartRead)
def add_item(payload: schemas.CartItemCreate, cart_id: int | None = None, db: Session = Depends(get_db)):
    cart = crud.get_or_create_cart(db, cart_id)
    cart = crud.add_to_cart(db, cart, payload.product_id, payload.quantity)
    return build_cart_read(cart)


@router.patch("/items/{item_id}", response_model=schemas.CartRead)
def update_item(item_id: int, payload: schemas.CartItemUpdate, db: Session = Depends(get_db)):
    try:
        cart = crud.update_cart_item(db, item_id, payload.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return build_cart_read(cart)


@router.delete("/items/{item_id}", response_model=schemas.CartRead)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    try:
        cart = crud.remove_cart_item(db, item_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return build_cart_read(cart)
