const crypto = require("crypto");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(500).json({ error: "Payments are not configured" });

  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
  if ([razorpay_order_id, razorpay_payment_id, razorpay_signature].some(v => typeof v !== "string" || !v)) {
    return res.status(400).json({ success: false, error: "Missing payment fields" });
  }

  const expected = crypto.createHmac("sha256", secret).update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");
  const a = Buffer.from(expected), c = Buffer.from(razorpay_signature);
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) {
    return res.status(400).json({ success: false, error: "Signature mismatch" });
  }
  // TODO: mark the order as paid / notify yourself here (e.g. send a Discord webhook, email, or write to a database).
  return res.status(200).json({ success: true, order_id: razorpay_order_id, payment_id: razorpay_payment_id });
};
