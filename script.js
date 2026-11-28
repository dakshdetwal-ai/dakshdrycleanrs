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

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Price list filters: category tabs and item search work together.
const priceSearch = document.getElementById("priceSearch");
const priceGroups = [...document.querySelectorAll(".price-group")];
const categoryTabs = [...document.querySelectorAll(".category-tab")];
let activeCategory = "all";

function filterPrices() {
  const query = (priceSearch?.value || "").trim().toLowerCase();
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
priceSearch?.addEventListener("input", filterPrices);

// Public pickup requests go through the Cloudflare Worker.
// This keeps ordering simple for customers: no account is required.
const orderForm = document.getElementById("orderForm");
const formMessage = document.getElementById("formMessage");

if (orderForm && formMessage) {
  orderForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = orderForm.querySelector('button[type="submit"]');
    const showMessage = (message, isError = false) => {
      formMessage.textContent = message;
      formMessage.style.color = isError ? "#b54747" : "#167d72";
    };

    const data = Object.fromEntries(new FormData(orderForm).entries());
    const quantity = Number(data.quantity);
    const mobileDigits = String(data.mobile || "").replace(/\D/g, "");

    if (!Number.isInteger(quantity) || quantity < 1) {
      showMessage("Please enter a valid quantity.", true);
      return;
    }
    if (mobileDigits.length < 10 || mobileDigits.length > 13) {
      showMessage("Please enter a valid mobile number.", true);
      return;
    }

    button.disabled = true;
    button.textContent = "Sending request…";
    showMessage("Sending your order request…");

    try {
      const response = await fetch(WORKER_ORDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.name || "").trim(),
          email: String(data.email || "").trim().toLowerCase(),
          mobile: String(data.mobile || "").trim(),
          itemType: data.itemType,
          quantity,
          packaging: data.packaging,
          address: String(data.address || "").trim(),
          notes: String(data.notes || "").trim()
        })
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}
      if (!response.ok || result.success === false) {
        throw new Error(result.error || "We couldn't send your request. Please try again.");
      }

      showMessage("Order request received! We'll contact you on WhatsApp to confirm the details.");
      orderForm.reset();
    } catch (error) {
      console.error("Pickup request failed:", error);
      showMessage(error.message || "Something went wrong. Please try again or call the shop.", true);
    } finally {
      button.disabled = false;
      button.innerHTML = 'Place order <span>→</span>';
    }
  });
}


// Scroll-triggered entrance motion; content remains visible if motion is unsupported.
const revealTargets = document.querySelectorAll(
  ".service-strip .section-intro, .service-tile, .pricing-heading, .price-group, .promise-art, .promise-copy, .order-copy, .order-form"
);
revealTargets.forEach((element, index) => {
  element.classList.add("reveal");
  if (element.classList.contains("service-tile") || element.classList.contains("price-group")) {
    element.classList.add("reveal-delay-" + ((index % 3) + 1));
  }
});
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
  revealTargets.forEach(element => revealObserver.observe(element));
} else {
  revealTargets.forEach(element => element.classList.add("is-visible"));
}


// Add a subtle shadow to the sticky navigation once the page scrolls.
const siteHeader = document.querySelector(".site-header");
function updateHeaderOnScroll(){siteHeader?.classList.toggle("is-scrolled", window.scrollY > 12)}
window.addEventListener("scroll", updateHeaderOnScroll, {passive:true});
updateHeaderOnScroll();


// Service card arrows take customers to the order form with the chosen service preselected.
document.querySelectorAll(".service-arrow[data-service]").forEach(link => {
  link.addEventListener("click", () => {
    const serviceSelect = document.querySelector('#orderForm select[name="itemType"]');
    if (serviceSelect) serviceSelect.value = link.dataset.service;
  });
});
