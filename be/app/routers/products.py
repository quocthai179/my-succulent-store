from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..db import get_db_session

router = APIRouter(prefix="/products", tags=["products"])


def get_db():
    with get_db_session() as session:
        yield session


@router.get("", response_model=list[schemas.ProductRead])
def list_products(category: str | None = None, db: Session = Depends(get_db)):
    return crud.get_products(db, category)


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)
