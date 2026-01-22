from __future__ import annotations

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str
    category: str
    description: str
    price: Decimal


class ProductRead(BaseModel):
    id: int
    name: str
    category: str
    description: str
    price: Decimal

    class Config:
        from_attributes = True


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemRead(BaseModel):
    id: int
    product: ProductRead
    quantity: int

    class Config:
        from_attributes = True


class CartRead(BaseModel):
    id: int
    items: list[CartItemRead]
    total: Decimal


class OrderCreate(BaseModel):
    cart_id: int


class OrderItemRead(BaseModel):
    product: ProductRead
    quantity: int
    price: Decimal

    class Config:
        from_attributes = True


class OrderRead(BaseModel):
    id: int
    status: str
    total: Decimal
    items: list[OrderItemRead]

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    cart_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    cart_id: int
    cart: CartRead
