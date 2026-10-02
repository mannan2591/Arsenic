const Razorpay = require("razorpay");
const CATALOG = require("./_catalog");

const clean = (v, max) => (typeof v === "string" ? v.replace(/[\r\n<>]/g, "").trim().slice(0, max) : "");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(500).json({ error: "Payments are not configured" });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const item = clean(body.item, 120);
  if (!Object.prototype.hasOwnProperty.call(CATALOG, item)) {
    return res.status(400).json({ error: "This item cannot be paid online" });
  }
  const amount = Math.round(CATALOG[item] * 100); // paise
  if (!Number.isInteger(amount) || amount < 100) return res.status(400).json({ error: "Invalid amount" });

  const discord = clean(body.discord, 40);
  const email = clean(body.email, 80);
  if (discord.length < 2) return res.status(400).json({ error: "Discord username required" });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Valid email required" });

  try {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount,
      currency: "INR",
      receipt: "arsenic_" + Date.now(),
      notes: { item, discord, email }
    });
    return res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId });
  } catch (err) {
    console.error("Razorpay order error:", (err && err.error && err.error.description) || err.message);
    if (err && err.statusCode === 401) return res.status(401).json({ error: "Payment authentication failed" });
    return res.status(500).json({ error: "Could not create order" });
  }
};
