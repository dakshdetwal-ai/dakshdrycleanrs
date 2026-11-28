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

// Price list search and category filters work together, with live row matching.
const priceSearch = document.getElementById("priceSearch");
const priceGroups = [...document.querySelectorAll(".price-group")];
const categoryTabs = [...document.querySelectorAll(".category-tab")];
const priceNoResults = document.getElementById("priceNoResults");
let activeCategory = "all";

function clearPriceHighlights(root) {
  root.querySelectorAll("mark.price-match").forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent)));
}
function highlightPriceMatches(root, query) {
  if (!query) return;
  const terms = query.split(/\s+/).filter(Boolean).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return;
  const regex = new RegExp("(" + terms.join("|") + ")", "gi");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest("mark,script,style")) continue;
    if (regex.test(node.nodeValue)) { regex.lastIndex = 0; nodes.push(node); }
    else regex.lastIndex = 0;
  }
  nodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    node.nodeValue.split(regex).forEach((part, index) => {
      if (!part) return;
      if (index % 2) {
        const mark = document.createElement("mark");
        mark.className = "price-match";
        mark.textContent = part;
        fragment.appendChild(mark);
      } else fragment.appendChild(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  });
}
function filterPrices() {
  const query = (priceSearch?.value || "").trim().toLowerCase();
  let visibleCount = 0;
  priceGroups.forEach(group => {
    clearPriceHighlights(group);
    const categoryMatches = activeCategory === "all" || group.dataset.group === activeCategory;
    const rows = [...group.querySelectorAll("tbody tr")];
    let matchingRows = 0;
    const titleMatches = group.querySelector(".group-title")?.textContent.toLowerCase().includes(query);
    rows.forEach(row => {
      const matches = !query || titleMatches || row.textContent.toLowerCase().includes(query);
      row.hidden = !matches;
      if (matches) matchingRows++;
    });
    const visible = categoryMatches && (!query || titleMatches || matchingRows > 0);
    group.hidden = !visible;
    if (visible) {
      visibleCount++;
      if (query) highlightPriceMatches(group, query);
    }
  });
  if (priceNoResults) priceNoResults.hidden = visibleCount > 0;
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
const garmentEntries = document.getElementById("garmentEntries");
const garmentTemplate = document.getElementById("garmentEntryTemplate");
const addGarmentButton = document.getElementById("addGarment");
const garmentCount = document.getElementById("garmentCount");

function refreshGarmentRows() {
  if (!garmentEntries) return;
  const rows = [...garmentEntries.querySelectorAll(".garment-entry")];
  if (garmentCount) garmentCount.textContent = rows.length + (rows.length === 1 ? " item" : " items");
  rows.forEach(row => {
    const remove = row.querySelector(".remove-garment");
    if (remove) remove.disabled = rows.length === 1;
  });
}
addGarmentButton?.addEventListener("click", () => {
  if (!garmentTemplate || !garmentEntries) return;
  garmentEntries.appendChild(garmentTemplate.content.cloneNode(true));
  refreshGarmentRows();
  updateOrderSummary();
});
garmentEntries?.addEventListener("click", event => {
  const remove = event.target.closest(".remove-garment");
  if (remove && garmentEntries.querySelectorAll(".garment-entry").length > 1) {
    remove.closest(".garment-entry").remove();
    refreshGarmentRows();
    updateOrderSummary();
  }
});

const summaryLines = document.getElementById("orderSummaryLines");
const summaryTotal = document.getElementById("orderSummaryTotal");
const SERVICE_ESTIMATE_RATES = { Iron: 7.5, Wash: 20, "Dry Clean": 50 };
const formatINR = amount => "₹" + (Number.isInteger(amount) ? amount : amount.toFixed(2).replace(/0$/, ""));
function updateOrderSummary() {
  if (!summaryLines || !summaryTotal || !garmentEntries) return;
  const items = [...garmentEntries.querySelectorAll(".garment-entry")].map(row => ({
    garment: row.querySelector('[name="garmentType"]')?.value || "",
    service: row.querySelector('[name="garmentService"]')?.value || "",
    quantity: Number(row.querySelector('[name="garmentQuantity"]')?.value || 0)
  })).filter(item => item.garment && item.service && Number.isInteger(item.quantity) && item.quantity > 0);
  const clothCount = items.reduce((total, item) => total + item.quantity, 0);
  const packaging = orderForm?.querySelector('[name="packaging"]')?.value === "Yes" ? clothCount : 0;
  summaryLines.innerHTML = "";
  let subtotal = 0;
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "summary-empty";
    empty.textContent = "Choose a garment and service to see your estimate.";
    summaryLines.appendChild(empty);
  } else {
    items.forEach(item => {
      const lineTotal = SERVICE_ESTIMATE_RATES[item.service] * item.quantity;
      subtotal += lineTotal;
      const line = document.createElement("div");
      line.className = "summary-line";
      const label = document.createElement("span");
      label.textContent = (item.service === "Iron" ? "Ironing" : item.service === "Wash" ? "Wash + Iron" : "Dry Cleaning") + " · " + item.garment + " × " + item.quantity;
      const amount = document.createElement("strong");
      amount.textContent = formatINR(lineTotal);
      line.append(label, amount);
      summaryLines.appendChild(line);
    });
    if (packaging) {
      const line = document.createElement("div");
      line.className = "summary-line";
      const label = document.createElement("span");
      label.textContent = "Packaging × " + clothCount + " cloth" + (clothCount === 1 ? "" : "es");
      const amount = document.createElement("strong");
      amount.textContent = formatINR(packaging);
      line.append(label, amount);
      summaryLines.appendChild(line);
    }
  }
  summaryTotal.textContent = formatINR(subtotal + packaging);
}
refreshGarmentRows();
garmentEntries?.addEventListener("change", updateOrderSummary);
garmentEntries?.addEventListener("input", updateOrderSummary);
const packagingSelect = orderForm?.querySelector('[name="packaging"]');
const packagingWarning = document.getElementById("packagingWarning");
packagingSelect?.addEventListener("change", () => {
  if (packagingWarning) packagingWarning.hidden = packagingSelect.value !== "No";
  updateOrderSummary();
});
updateOrderSummary();

if (orderForm && formMessage) {
  orderForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = orderForm.querySelector('button[type="submit"]');
    const showMessage = (message, isError = false) => {
      formMessage.textContent = message;
      formMessage.style.color = isError ? "#b54747" : "#167d72";
    };
    const data = Object.fromEntries(new FormData(orderForm).entries());
    const mobileDigits = String(data.mobile || "").replace(/\D/g, "");
    const garments = [...orderForm.querySelectorAll(".garment-entry")].map(row => ({
      garment: row.querySelector('[name="garmentType"]').value,
      service: row.querySelector('[name="garmentService"]').value,
      quantity: Number(row.querySelector('[name="garmentQuantity"]').value)
    }));
    if (mobileDigits.length < 10 || mobileDigits.length > 13) {
      showMessage("Please enter a valid mobile number.", true); return;
    }
    if (!garments.length || garments.some(item => !item.garment || !item.service || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      showMessage("Please complete the garment, service and quantity for every item.", true); return;
    }
    const totalQuantity = garments.reduce((sum, item) => sum + item.quantity, 0);
    const itemSummary = garments.map(item => item.quantity + " " + item.garment + " — " + (item.service === "Iron" ? "Ironing" : item.service === "Wash" ? "Wash + Iron" : "Dry Cleaning")).join("; ");
    const extraNotes = String(data.notes || "").trim();
    const garmentNotes = "Garment details: " + itemSummary;
    const notes = [garmentNotes, extraNotes].filter(Boolean).join("\n");
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
          itemType: garments.length === 1 ? garments[0].service : "Multiple garment services",
          quantity: totalQuantity,
          garments,
          packaging: data.packaging,
          packagingRate: data.packaging === "Yes" ? 1 : 0,
          packagingCharge: data.packaging === "Yes" ? totalQuantity : 0,
          address: String(data.address || "").trim(),
          notes
        })
      });
      let result = {};
      try { result = await response.json(); } catch (_) {}
      if (!response.ok || result.success === false) throw new Error(result.error || "We couldn't send your request. Please try again.");
      showMessage("Order request received! We'll contact you on WhatsApp to confirm the details.");
      orderForm.reset();
      if (garmentEntries && garmentTemplate) {
        garmentEntries.innerHTML = "";
        garmentEntries.appendChild(garmentTemplate.content.cloneNode(true));
        refreshGarmentRows();
      }
    } catch (error) {
      console.error("Pickup request failed:", error);
      showMessage(error.message || "Something went wrong. Please try again or call the shop.", true);
    } finally {
      button.disabled = false;
      button.innerHTML = 'Submit My Order <span>→</span>';
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


// Pricing-card CTAs carry the selected garment category into the order form.
document.querySelectorAll(".price-order-link[data-price-group]").forEach(link => {
  link.addEventListener("click", () => {
    const card = link.closest(".price-group");
    const groupName = card?.querySelector(".group-title h3")?.textContent.trim() || "Selected garment";
    const serviceSelect = document.querySelector('#orderForm select[name="itemType"]');
    const notesField = document.querySelector('#orderForm textarea[name="notes"]');
    if (serviceSelect) serviceSelect.value = "Other";
    if (notesField) notesField.value = "Garment category: " + groupName + ". Please help me choose the right service.";
  });
});
