/* =========================
   DAKSH DRY CLEANERS
   MAIN JAVASCRIPT
========================= */


/* =========================
   PRICES
========================= */

const prices = {
  "Iron": 7.5,
  "Wash": 20,
  "Dry Clean": 50,
  "Other": 0
};


/* =========================
   ELEMENTS
========================= */

const form = document.getElementById("orderForm");
const totalEl = document.getElementById("total");
const messageEl = document.getElementById("formMessage");
const yearEl = document.getElementById("year");


/* =========================
   CALCULATE ORDER TOTAL
========================= */

function updateTotal() {

  const service = form.itemType.value;

  const quantity =
    Number(form.quantity.value) || 0;

  const packaging =
    form.packaging.value === "Yes"
      ? 4
      : 0;

  const servicePrice =
    prices[service] || 0;

  const total =
    (servicePrice * quantity) + packaging;

  totalEl.textContent =
    `₹${total.toFixed(2)}`;
}


/* =========================
   WATCH FORM CHANGES
========================= */

form.itemType.addEventListener(
  "change",
  updateTotal
);

form.quantity.addEventListener(
  "input",
  updateTotal
);

form.packaging.addEventListener(
  "change",
  updateTotal
);


/* =========================
   FORM SUBMISSION
========================= */

form.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    messageEl.textContent =
      "Sending your order...";

    messageEl.style.color =
      "#8eb2c9";


    /* Collect form data */

    const formData =
      new FormData(form);

    const data =
      Object.fromEntries(formData);


    /* Add calculated total */

    data.total =
      totalEl.textContent;


    try {

      /*
        Send order to backend.

        Backend will forward
        the order to Telegram.
      */

      const response =
        await fetch(
          "https://daksh-dry-cleaners-api.dakshdetwal10.workers.dev/api/order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(data)
          }
        );


      const result =
        await response.json();


      /* Backend error */

      if (!response.ok) {

        throw new Error(
          result.error ||
          "Order could not be sent."
        );

      }


      /* Success */

      messageEl.textContent =
        "Order received! We'll contact you on WhatsApp.";

      messageEl.style.color =
        "#35e6a0";


      /* Reset form */

      form.reset();

      updateTotal();


    } catch (error) {

      console.error(error);

      messageEl.textContent =
        "Could not send your order. Please try again.";

      messageEl.style.color =
        "#ff7f7f";

    }

  }
);


/* =========================
   CURRENT YEAR
========================= */

yearEl.textContent =
  new Date().getFullYear();


/* =========================
   SCROLL REVEAL
========================= */

const revealObserver =
  new IntersectionObserver(

    function (entries) {

      entries.forEach(
        function (entry) {

          if (entry.isIntersecting) {

            entry.target.classList.add(
              "visible"
            );

          }

        }
      );

    },

    {
      threshold: 0.12
    }

  );


document
  .querySelectorAll(".reveal")
  .forEach(
    element =>
      revealObserver.observe(element)
  );


/* =========================
   MOUSE GLOW
========================= */

const cursorGlow =
  document.querySelector(
    ".cursor-glow"
  );


window.addEventListener(
  "pointermove",
  function (event) {

    if (!cursorGlow) return;

    cursorGlow.style.left =
      `${event.clientX}px`;

    cursorGlow.style.top =
      `${event.clientY}px`;

  }
);


/* =========================
   MOBILE MENU
========================= */

const menuButton =
  document.querySelector(
    ".menu-btn"
  );

const nav =
  document.querySelector(
    ".nav"
  );


menuButton.addEventListener(
  "click",
  function () {

    nav.classList.toggle(
      "menu-open"
    );

  }
);


/* =========================
   INITIAL TOTAL
========================= */

updateTotal();
