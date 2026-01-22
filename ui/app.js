const API_BASE = "http://localhost:8000";
const statusEl = document.getElementById("status");
const productGroupsEl = document.getElementById("product-groups");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const chatMessagesEl = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

let cartId = Number(localStorage.getItem("cartId")) || null;

const fallbackProducts = [
  {
    id: 1,
    name: "Sen đá Haworthia Zebra",
    category: "Haworthia",
    description: "Lá sọc trắng nổi bật, phù hợp để bàn làm việc.",
    price: 75000,
  },
  {
    id: 2,
    name: "Sen đá Echeveria Blue",
    category: "Echeveria",
    description: "Tán lá xanh phấn, dáng hoa thị sang trọng.",
    price: 89000,
  },
  {
    id: 3,
    name: "Chậu đất nung mini",
    category: "Chậu sen đá",
    description: "Chậu đất nung thoát nước tốt, kích thước 10cm.",
    price: 32000,
  },
  {
    id: 4,
    name: "Đá trang trí trắng",
    category: "Đồ trang trí",
    description: "Gói 500g đá trang trí bề mặt, sạch và đẹp.",
    price: 25000,
  },
  {
    id: 5,
    name: "Đất trộn sen đá",
    category: "Đất - phân bón - thuốc",
    description: "Đất tơi xốp, giàu dinh dưỡng, thoát nước nhanh.",
    price: 42000,
  },
];

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currency.format(Number(value));
}

function setStatus(message) {
  statusEl.textContent = message;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function renderProducts(products) {
  const groups = products.reduce((acc, product) => {
    acc[product.category] ||= [];
    acc[product.category].push(product);
    return acc;
  }, {});

  productGroupsEl.innerHTML = "";

  Object.entries(groups).forEach(([category, items]) => {
    const groupEl = document.createElement("div");
    groupEl.className = "product-group";
    groupEl.innerHTML = `<h3>${category}</h3>`;

    const grid = document.createElement("div");
    grid.className = "product-grid";

    items.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <h4>${product.name}</h4>
        <p class="muted">${product.description}</p>
        <strong>${formatCurrency(product.price)}</strong>
        <button data-product-id="${product.id}">Thêm vào giỏ hàng</button>
      `;
      card.querySelector("button").addEventListener("click", () => {
        addToCart(product.id, 1);
      });
      grid.appendChild(card);
    });

    groupEl.appendChild(grid);
    productGroupsEl.appendChild(groupEl);
  });
}

function renderCart(cart) {
  cartItemsEl.innerHTML = "";
  if (!cart.items.length) {
    cartItemsEl.innerHTML = "<li class=\"muted\">Giỏ hàng đang trống.</li>";
    cartTotalEl.textContent = formatCurrency(0);
    return;
  }

  cart.items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <strong>${item.product.name}</strong>
      <span>${formatCurrency(item.product.price)}</span>
      <div class="cart-item-actions">
        <input type="number" min="1" value="${item.quantity}" />
        <button type="button">Xóa</button>
      </div>
    `;
    const qtyInput = li.querySelector("input");
    qtyInput.addEventListener("change", () => {
      updateCartItem(item.id, Number(qtyInput.value));
    });
    li.querySelector("button").addEventListener("click", () => {
      removeCartItem(item.id);
    });
    cartItemsEl.appendChild(li);
  });

  cartTotalEl.textContent = formatCurrency(cart.total);
}

async function loadProducts() {
  try {
    const products = await fetchJson(`${API_BASE}/products`);
    setStatus(`Tìm thấy ${products.length} sản phẩm`);
    renderProducts(products);
  } catch (error) {
    console.warn(error);
    setStatus("Không thể kết nối backend, hiển thị dữ liệu mẫu.");
    renderProducts(fallbackProducts);
  }
}

async function loadCart() {
  try {
    const query = cartId ? `?cart_id=${cartId}` : "";
    const cart = await fetchJson(`${API_BASE}/cart${query}`);
    cartId = cart.id;
    localStorage.setItem("cartId", cartId);
    renderCart(cart);
  } catch (error) {
    console.warn(error);
    renderCart({ items: [], total: 0 });
  }
}

async function addToCart(productId, quantity) {
  try {
    const query = cartId ? `?cart_id=${cartId}` : "";
    const cart = await fetchJson(`${API_BASE}/cart/items${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    cartId = cart.id;
    localStorage.setItem("cartId", cartId);
    renderCart(cart);
  } catch (error) {
    console.warn(error);
  }
}

async function updateCartItem(itemId, quantity) {
  if (!quantity || quantity < 1) {
    return;
  }
  try {
    const cart = await fetchJson(`${API_BASE}/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    renderCart(cart);
  } catch (error) {
    console.warn(error);
  }
}

async function removeCartItem(itemId) {
  try {
    const cart = await fetchJson(`${API_BASE}/cart/items/${itemId}`, {
      method: "DELETE",
    });
    renderCart(cart);
  } catch (error) {
    console.warn(error);
  }
}

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `chat-message ${role}`;
  div.textContent = text;
  chatMessagesEl.appendChild(div);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function sendChat(message) {
  appendMessage("user", message);
  try {
    const payload = { message, cart_id: cartId };
    const response = await fetchJson(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    cartId = response.cart_id;
    localStorage.setItem("cartId", cartId);
    renderCart(response.cart);
    appendMessage("bot", response.response);
  } catch (error) {
    console.warn(error);
    appendMessage(
      "bot",
      "Chatbot tạm thời chưa sẵn sàng. Vui lòng thử lại sau hoặc đặt hàng qua giỏ hàng."
    );
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) {
    return;
  }
  chatInput.value = "";
  sendChat(message);
});

loadProducts();
loadCart();
appendMessage(
  "bot",
  "Xin chào! Tôi có thể giúp bạn chọn sen đá, phụ kiện và tạo đơn hàng."
);
