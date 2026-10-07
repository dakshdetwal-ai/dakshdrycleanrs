require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID;


/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname)
  )
);


/* =========================
   PRICES
========================= */

const prices = {
  Iron: 7.5,
  Wash: 20,
  "Dry Clean": 50,
  Other: 0
};


/* =========================
   SECURITY / TEXT CLEANING
========================= */

function clean(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


/* =========================
   ORDER API
========================= */

app.post(
  "/api/order",
  async (req, res) => {

    try {

      const {
        name,
        email,
        mobile,
        itemType,
        quantity,
        packaging,
        address
      } = req.body || {};


      /* Validate required fields */

      if (
        !name ||
        !email ||
        !mobile ||
        !itemType ||
        !quantity ||
        !address
      ) {

        return res.status(400).json({
          error:
            "Please fill all required fields."
        });

      }


      /* Validate quantity */

      const qty =
        Number(quantity);

      if (
        !Number.isInteger(qty) ||
        qty < 1
      ) {

        return res.status(400).json({
          error:
            "Invalid quantity."
        });

      }


      /* Calculate price */

      const servicePrice =
        prices[itemType] || 0;

      const serviceTotal =
        servicePrice * qty;

      const packagingFee =
        packaging === "Yes"
          ? 4
          : 0;

      const total =
        serviceTotal +
        packagingFee;


      /* Check Telegram configuration */

      if (
        !TELEGRAM_BOT_TOKEN ||
        !TELEGRAM_CHAT_ID
      ) {

        console.error(
          "Telegram configuration missing."
        );

        return res.status(500).json({
          error:
            "Telegram is not configured yet."
        });

      }


      /* =========================
         TELEGRAM MESSAGE
      ========================= */

      const telegramMessage = `

🧺 <b>NEW DAKSH DRY CLEANERS ORDER</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Customer</b>
Name: ${clean(name)}
Email: ${clean(email)}
Mobile: ${clean(mobile)}

━━━━━━━━━━━━━━━━━━

🧼 <b>ORDER</b>
Service: ${clean(itemType)}
Quantity: ${qty}

📦 Packaging:
${
  packaging === "Yes"
    ? "Yes (+₹4)"
    : "No"
}

━━━━━━━━━━━━━━━━━━

💰 <b>TOTAL: ₹${total.toFixed(2)}</b>

━━━━━━━━━━━━━━━━━━

📍 <b>ADDRESS</b>

${clean(address)}

━━━━━━━━━━━━━━━━━━

📱 Contact customer on WhatsApp
for order details and updates.

`;



      /* =========================
         SEND TO TELEGRAM
      ========================= */

      const telegramResponse =
        await fetch(

          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,

          {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              chat_id:
                TELEGRAM_CHAT_ID,

              text:
                telegramMessage,

              parse_mode:
                "HTML"

            })

          }

        );


      /* Telegram error */

      if (
        !telegramResponse.ok
      ) {

        const errorText =
          await telegramResponse.text();

        console.error(
          "Telegram error:",
          errorText
        );

        return res.status(502).json({
          error:
            "Telegram delivery failed."
        });

      }


      /* =========================
         SUCCESS
      ========================= */

      return res.json({
        success: true,
        message:
          "Order sent successfully."
      });


    } catch (error) {

      console.error(
        "ORDER ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Something went wrong."
      });

    }

  }
);


/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  () => {

    console.log(
      `Daksh Dry Cleaners running at http://localhost:${PORT}`
    );

  }
);
