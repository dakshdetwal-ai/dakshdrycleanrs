const WORKER_ORDER_URL = "https://daksh-dry-cleaners-api.dakshdetwal10.workers.dev/api/order";

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});
mainNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
}));

document.getElementById("year").textContent = new Date().getFullYear();

// Price list filters: category tabs and item search work together.
const priceSearch = document.getElementById("priceSearch");
const priceGroups = [...document.querySelectorAll(".price-group")];
const categoryTabs = [...document.querySelectorAll(".category-tab")];
let activeCategory = "all";

function filterPrices() {
  const query = (priceSearch.value || "").trim().toLowerCase();
  priceGroups.forEach(group => {
    const categoryMatches = activeCategory === "all" || group.dataset.group === activeCategory;
    const searchMatches = !query || group.textContent.toLowerCase().includes(query);
    group.hidden = !(categoryMatches && searchMatches);
  });
}
categoryTabs.forEach(button => button.addEventListener("click", () => {
  activeCategory = button.dataset.category;
  categoryTabs.forEach(tab => tab.classList.toggle("active", tab === button));
  filterPrices();
}));
priceSearch.addEventListener("input", filterPrices);

// Order requests are sent to the existing Cloudflare Worker endpoint.
// No price is calculated here because inspection-based items need confirmation.
const orderForm = document.getElementById("orderForm");
const formMessage = document.getElementById("formMessage");
orderForm.addEventListener("submit", async event => {
  event.preventDefault();
  const submitButton = orderForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Sending request…";
  formMessage.textContent = "Sending your request securely…";
  formMessage.style.color = "#607486";

  const data = Object.fromEntries(new FormData(orderForm).entries());
  data.requestType = "Laundry pickup / service request";
  data.status = "Requested";

  try {
    const response = await fetch(WORKER_ORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(result.error || "The request could not be sent.");
    formMessage.textContent = "Request received! Our team will contact you to confirm the details.";
    formMessage.style.color = "#167d72";
    orderForm.reset();
  } catch (error) {
    console.error("Order request error:", error);
    formMessage.textContent = "We couldn't send the request. Please try again or contact the shop directly.";
    formMessage.style.color = "#b54747";
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Send request <span>→</span>';
  }
});
