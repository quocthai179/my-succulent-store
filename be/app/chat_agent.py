from __future__ import annotations

import os
import re
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import crud, models

try:
    from langchain_openai import ChatOpenAI
    from langchain.agents import AgentExecutor, create_openai_tools_agent
    from langchain_core.messages import SystemMessage
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.tools import tool

    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False


class ChatAgent:
    def __init__(self, db: Session):
        self.db = db

    def _find_products(self, query: str) -> list[models.Product]:
        stmt = select(models.Product).where(models.Product.name.ilike(f"%{query}%"))
        return list(self.db.execute(stmt).scalars().all())

    def _list_cart(self, cart: models.Cart) -> dict[str, Any]:
        total = crud.calculate_cart_total(cart)
        return {
            "id": cart.id,
            "items": [
                {
                    "name": item.product.name,
                    "quantity": item.quantity,
                    "price": str(item.product.price),
                }
                for item in cart.items
            ],
            "total": str(total),
        }

    def _simple_parser(self, message: str, cart: models.Cart) -> str:
        match = re.findall(r"(\\d+)\\s+([^,]+)", message, flags=re.IGNORECASE)
        responses = []
        for qty, name in match:
            products = self._find_products(name.strip())
            if products:
                crud.add_to_cart(self.db, cart, products[0].id, int(qty))
                responses.append(f"Đã thêm {qty} x {products[0].name} vào giỏ hàng.")
            else:
                responses.append(f"Không tìm thấy sản phẩm phù hợp với '{name}'.")
        if not responses:
            responses.append("Bạn muốn mua sản phẩm nào? Hãy cho tôi biết tên và số lượng.")
        cart_data = self._list_cart(cart)
        responses.append(f"Giỏ hàng hiện tại: {cart_data}.")
        return " ".join(responses)

    def run(self, message: str, cart: models.Cart) -> str:
        if not LANGCHAIN_AVAILABLE or not os.getenv("OPENAI_API_KEY"):
            return self._simple_parser(message, cart)

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

        @tool
        def find_products(query: str) -> list[dict[str, Any]]:
            products = self._find_products(query)
            return [
                {
                    "id": product.id,
                    "name": product.name,
                    "category": product.category,
                    "price": str(product.price),
                }
                for product in products
            ]

        @tool
        def add_to_cart(product_id: int, quantity: int) -> dict[str, Any]:
            crud.add_to_cart(self.db, cart, product_id, quantity)
            return self._list_cart(cart)

        @tool
        def update_cart_item(item_id: int, quantity: int) -> dict[str, Any]:
            crud.update_cart_item(self.db, item_id, quantity)
            return self._list_cart(cart)

        @tool
        def remove_cart_item(item_id: int) -> dict[str, Any]:
            crud.remove_cart_item(self.db, item_id)
            return self._list_cart(cart)

        @tool
        def show_cart() -> dict[str, Any]:
            return self._list_cart(cart)

        @tool
        def calculate_total() -> str:
            total = crud.calculate_cart_total(cart)
            return str(total)

        prompt = ChatPromptTemplate.from_messages(
            [
                SystemMessage(
                    content=(
                        "Bạn là trợ lý bán sen đá. Hãy giúp người dùng tìm sản phẩm, "
                        "thêm/xóa/cập nhật giỏ hàng và tóm tắt đơn hàng. Trả lời bằng tiếng Việt, "
                        "gợi ý xác nhận trước khi chốt đơn."
                    )
                ),
                ("human", "{input}"),
                ("placeholder", "{agent_scratchpad}"),
            ]
        )

        tools = [
            find_products,
            add_to_cart,
            update_cart_item,
            remove_cart_item,
            show_cart,
            calculate_total,
        ]

        agent = create_openai_tools_agent(llm, tools, prompt)
        executor = AgentExecutor(agent=agent, tools=tools, verbose=False)
        result = executor.invoke({"input": message})
        return result["output"]


def format_total(total: Decimal) -> str:
    return f"{total:,.0f}₫"
