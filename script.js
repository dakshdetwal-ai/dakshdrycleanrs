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

// Guest pickup requests use the same Supabase orders table as dashboard requests.
// RLS deliberately requires an authenticated account, so guest users are directed to sign in.
const orderForm = document.getElementById("orderForm");
const formMessage = document.getElementById("formMessage");

if (orderForm) {
  orderForm.addEventListener("submit", async event => {
    event.preventDefault();
    const submitButton = orderForm.querySelector('button[type="submit"]');
    const show = (message, error = false) => {
      formMessage.textContent = message;
      formMessage.style.color = error ? "#b54747" : "#167d72";
    };

    const config = window.dakshSupabase;
    if (!config) {
      show("The order service is unavailable right now. Please try again later.", true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending request…";
    show("Checking your customer account…");

    try {
      const { data: { session }, error: sessionError } = await config.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        const next = new URL("login.html", window.location.href);
        next.searchParams.set("next", "dashboard.html#newOrder");
        show("Please sign in to submit a pickup request. Redirecting you to sign in…");
        window.location.href = next.toString();
        return;
      }

      const data = Object.fromEntries(new FormData(orderForm).entries());
      const qty = Number(data.quantity);
      if (!Number.isInteger(qty) || qty < 1) throw new Error("Enter a valid quantity.");

      const serviceMap = {
        "Ironing": "Ironing",
        "Washing + ironing": "Washing + ironing",
        "Dry cleaning": "Dry cleaning",
        "Need advice": "Need advice"
      };
      const item = String(data.itemType || "").trim();
      const { error } = await config.from("orders").insert({
        user_id: session.user.id,
        item_description: item,
        service: serviceMap[data.service] || data.service,
        quantity: qty,
        pickup_date: data.pickupDate || null,
        address: String(data.address || "").trim(),
        notes: [data.notes ? String(data.notes).trim() : "", "Customer: " + String(data.name || "").trim(), "Phone: " + String(data.mobile || "").trim()].filter(Boolean).join("\\n")
      });
      if (error) throw error;

      show("Request received! You can track it in your customer dashboard. Our team will contact you to confirm details.");
      orderForm.reset();
    } catch (error) {
      console.error("Order request error:", error);
      show(error.message || "We couldn't send your request. Please try again.", true);
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send request <span>→</span>';
    }
  });
}
