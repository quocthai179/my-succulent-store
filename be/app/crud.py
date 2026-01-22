from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models


SAMPLE_PRODUCTS = [
    {
        "name": "Sen đá Haworthia Zebra",
        "category": "Haworthia",
        "description": "Lá sọc trắng nổi bật, phù hợp để bàn làm việc.",
        "price": Decimal("75000"),
    },
    {
        "name": "Sen đá Echeveria Blue",
        "category": "Echeveria",
        "description": "Tán lá xanh phấn, dáng hoa thị sang trọng.",
        "price": Decimal("89000"),
    },
    {
        "name": "Chậu đất nung mini",
        "category": "Chậu sen đá",
        "description": "Chậu đất nung thoát nước tốt, kích thước 10cm.",
        "price": Decimal("32000"),
    },
    {
        "name": "Chậu gốm men trắng",
        "category": "Chậu sen đá",
        "description": "Phù hợp phối set quà tặng, phong cách tối giản.",
        "price": Decimal("65000"),
    },
    {
        "name": "Đá trang trí trắng",
        "category": "Đồ trang trí",
        "description": "Gói 500g đá trang trí bề mặt, sạch và đẹp.",
        "price": Decimal("25000"),
    },
    {
        "name": "Tượng thỏ mini",
        "category": "Đồ trang trí",
        "description": "Phụ kiện trang trí giúp chậu sen đá sinh động hơn.",
        "price": Decimal("29000"),
    },
    {
        "name": "Đất trộn sen đá",
        "category": "Đất - phân bón - thuốc",
        "description": "Đất tơi xốp, giàu dinh dưỡng, thoát nước nhanh.",
        "price": Decimal("42000"),
    },
    {
        "name": "Phân bón chậm tan",
        "category": "Đất - phân bón - thuốc",
        "description": "Bổ sung dinh dưỡng lâu dài cho sen đá.",
        "price": Decimal("35000"),
    },
]


def seed_products(db: Session) -> None:
    existing = db.execute(select(models.Product)).scalars().first()
    if existing:
        return
    for product in SAMPLE_PRODUCTS:
        db.add(models.Product(**product))
    db.commit()


def get_products(db: Session, category: str | None = None) -> list[models.Product]:
    stmt = select(models.Product)
    if category:
        stmt = stmt.where(models.Product.category == category)
    return list(db.execute(stmt).scalars().all())


def get_categories(db: Session) -> list[str]:
    stmt = select(models.Product.category).distinct().order_by(models.Product.category)
    return [row[0] for row in db.execute(stmt).all()]


def get_or_create_cart(db: Session, cart_id: int | None = None) -> models.Cart:
    if cart_id:
        cart = db.get(models.Cart, cart_id)
        if cart:
            return cart
    cart = models.Cart()
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def add_to_cart(db: Session, cart: models.Cart, product_id: int, quantity: int) -> models.Cart:
    item = next((item for item in cart.items if item.product_id == product_id), None)
    if item:
        item.quantity += quantity
    else:
        item = models.CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
        db.add(item)
    db.commit()
    db.refresh(cart)
    return cart


def update_cart_item(db: Session, item_id: int, quantity: int) -> models.Cart:
    item = db.get(models.CartItem, item_id)
    if not item:
        raise ValueError("Cart item not found")
    item.quantity = quantity
    db.commit()
    db.refresh(item.cart)
    return item.cart


def remove_cart_item(db: Session, item_id: int) -> models.Cart:
    item = db.get(models.CartItem, item_id)
    if not item:
        raise ValueError("Cart item not found")
    cart = item.cart
    db.delete(item)
    db.commit()
    db.refresh(cart)
    return cart


def calculate_cart_total(cart: models.Cart) -> Decimal:
    total = Decimal("0")
    for item in cart.items:
        total += Decimal(item.product.price) * item.quantity
    return total


def create_order_from_cart(db: Session, cart: models.Cart) -> models.Order:
    total = calculate_cart_total(cart)
    order = models.Order(total=total)
    db.add(order)
    db.flush()
    for item in cart.items:
        order_item = models.OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.product.price,
        )
        db.add(order_item)
    db.commit()
    db.refresh(order)
    return order
