const API_BASE = "http://localhost:8000";
let statusEl;
let productGridEl;
let cartItemsEl;
let cartTotalEl;
let chatMessagesEl;
let chatForm;
let chatInput;
let categoryTabEls = [];
let allProducts = [];

const PRODUCT_IMAGE_BASE = "./image/succulent";
const productImageMap = new Map([
  [1, "agavoides_lipstick.png"],
  [2, "allegra.png"],
  [3, "angelina.png"],
  [4, "blue_sky.png"],
  [5, "chroma.png"],
]);

let cartId = Number(localStorage.getItem("cartId")) || null;

const fallbackProducts = [
  {
    id: 1,
    name: "Sen đá agavoides lipstick",
    category: "Sen đá",
    description: "Dáng rosette nhỏ gọn, màu viền hồng nổi bật.",
    price: 15000,
    image: "agavoides_lipstick.png",
  },
  {
    id: 2,
    name: "Sen đá allegra mini",
    category: "Sen đá",
    description: "Lá dày, tông xanh bạc, phù hợp bàn làm việc.",
    price: 15000,
    image: "allegra.png",
  },
  {
    id: 3,
    name: "Sen đá angelina",
    category: "Sen đá",
    description: "Sắc vàng xanh tươi, dễ chăm sóc.",
    price: 15000,
    image: "angelina.png",
  },
  {
    id: 4,
    name: "Sen đá blue sky",
    category: "Sen đá",
    description: "Hoa thị tròn đều, màu xanh mát mắt.",
    price: 25000,
    image: "blue_sky.png",
  },
  {
    id: 5,
    name: "Sen đá chroma",
    category: "Sen đá",
    description: "Tông xanh pha hồng, viền lá nổi bật.",
    price: 15000,
    image: "chroma.png",
  },
  {
    id: 6,
    name: "Sen đá elegans",
    category: "Sen đá",
    description: "Lá dày, màu xanh bạc, dáng hoa thị.",
    price: 15000,
    image: "elegans.png",
  },
  {
    id: 7,
    name: "Sen đá major",
    category: "Sen đá",
    description: "Dáng gọn, màu xanh nhạt, dễ phối chậu.",
    price: 15000,
    image: "major.png",
  },
  {
    id: 8,
    name: "Sen đá perle von nurnberg",
    category: "Sen đá",
    description: "Sắc tím phấn, viền lá rõ nét.",
    price: 15000,
    image: "perle_von_nurnberg.png",
  },
  {
    id: 9,
    name: "Sen đá pink jelly bean",
    category: "Sen đá",
    description: "Lá tròn nhỏ, màu xanh hồng đáng yêu.",
    price: 15000,
    image: "pink_jelly_bean.png",
  },
  {
    id: 10,
    name: "Sen đá violet queen",
    category: "Sen đá",
    description: "Màu tím nhẹ, dáng rosette nổi bật.",
    price: 15000,
    image: "violet_queen.png",
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
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
}

function resolveProductImage(product) {
  if (product.image) {
    if (product.image.startsWith("http") || product.image.startsWith("/")) {
      return product.image;
    }
    return `${PRODUCT_IMAGE_BASE}/${product.image}`;
  }
  const mappedImage = productImageMap.get(product.id);
  if (mappedImage) {
    return `${PRODUCT_IMAGE_BASE}/${mappedImage}`;
  }
  return `${PRODUCT_IMAGE_BASE}/placeholder.jpg`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function renderProducts(products) {
  if (!productGridEl) {
    return;
  }

  productGridEl.innerHTML = "";

  if (!products.length) {
    productGridEl.innerHTML =
      "<p class=\"muted\">Không tìm thấy sản phẩm phù hợp với danh mục đã chọn.</p>";
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    const imageUrl = resolveProductImage(product);
    card.innerHTML = `
      <img class="product-image" src="${imageUrl}" alt="${product.name}" loading="lazy" />
      <h4>${product.name}</h4>
      <p class="muted">${product.description}</p>
      <strong>${formatCurrency(product.price)}</strong>
      <button data-product-id="${product.id}">THÊM VÀO GIỎ</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      addToCart(product.id, 1);
    });
    productGridEl.appendChild(card);
  });
}

function renderCart(cart) {
  if (!cartItemsEl || !cartTotalEl) {
    return;
  }

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

function getActiveCategories() {
  if (!categoryTabEls.length) {
    return [];
  }
  const activeTab = categoryTabEls.find((tab) =>
    tab.classList.contains("active")
  );
  if (!activeTab) {
    return [];
  }
  const categoryData = activeTab.dataset.categories || "";
  return categoryData
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
}

function applyCategoryFilter(categories) {
  if (!productGridEl) {
    return;
  }
  const normalized = (categories || []).map((category) =>
    category.toLowerCase()
  );
  const filtered =
    normalized.length === 0
      ? allProducts
      : allProducts.filter((product) =>
          normalized.includes(product.category.toLowerCase())
        );
  setStatus(`Tìm thấy ${filtered.length} sản phẩm`);
  renderProducts(filtered);
}

async function loadProducts() {
  try {
    const products = await fetchJson(`${API_BASE}/products`);
    allProducts = products;
    applyCategoryFilter(getActiveCategories());
  } catch (error) {
    console.warn(error);
    setStatus("Không thể kết nối backend, hiển thị dữ liệu mẫu.");
    allProducts = fallbackProducts;
    applyCategoryFilter(getActiveCategories());
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
  if (!chatMessagesEl) {
    return;
  }
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

async function loadPartials() {
  const placeholders = document.querySelectorAll("[data-include]");
  await Promise.all(
    Array.from(placeholders).map(async (placeholder) => {
      const file = placeholder.getAttribute("data-include");
      if (!file) {
        return;
      }
      const response = await fetch(file);
      if (!response.ok) {
        throw new Error(`Không thể tải ${file}`);
      }
      placeholder.innerHTML = await response.text();
      placeholder.removeAttribute("data-include");
    })
  );
}

function cacheElements() {
  statusEl = document.getElementById("status");
  productGridEl = document.getElementById("product-grid");
  cartItemsEl = document.getElementById("cart-items");
  cartTotalEl = document.getElementById("cart-total");
  chatMessagesEl = document.getElementById("chat-messages");
  chatForm = document.getElementById("chat-form");
  chatInput = document.getElementById("chat-input");
  categoryTabEls = Array.from(
    document.querySelectorAll(".featured-tabs .tab")
  );
}

function bindChatForm() {
  if (!chatForm || !chatInput) {
    return;
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
}

function bindCategoryTabs() {
  if (!categoryTabEls.length) {
    return;
  }
  categoryTabEls.forEach((tab) => {
    tab.addEventListener("click", () => {
      categoryTabEls.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      applyCategoryFilter(getActiveCategories());
    });
  });
}

async function initApp() {
  await loadPartials();
  cacheElements();
  bindChatForm();
  bindCategoryTabs();
  loadProducts();
  loadCart();
  appendMessage(
    "bot",
    "Xin chào! Tôi có thể giúp bạn chọn sen đá, phụ kiện và tạo đơn hàng."
  );
}

document.addEventListener("DOMContentLoaded", () => {
  initApp().catch((error) => console.warn(error));
});
