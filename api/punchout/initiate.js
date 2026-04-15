// POST /api/punchout/initiate
// Tim's contract — Elementum calls this to start a punchout session.
// Returns a shopping URL with record_id baked in.
//
// Optional: pass "items" array to pre-populate the cart
// e.g. { "record_id": "...", "user": "...", "items": [{"name":"pens","qty":10,"price":8.99}] }

import { store, cors } from '../../lib/store.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const record_id = req.body.record_id && req.body.record_id !== "$record_id"
    ? req.body.record_id
    : "DEMO-" + Date.now();
  const user  = req.body.user  || "Elementum User";
  const items = req.body.items || [];  // optional pre-populated cart items from agent

  const token   = Math.random().toString(36).slice(2, 18);
  const baseUrl = `https://${req.headers.host}`;

  // Build shopping URL — encode items as JSON if provided by agent
  let shoppingUrl = `${baseUrl}/amazon-mock.html?record_id=${record_id}&user=${encodeURIComponent(user)}&token=${token}`;
  if (items.length > 0) {
    shoppingUrl += `&prefill=${encodeURIComponent(JSON.stringify(items))}`;
  }

  // Store flow session — include agent-provided items for context
  const session = {
    flow_id:         record_id,
    user_id:         user,
    status:          "PUNCHOUT_ACTIVE",
    vendor_id:       "amazon",
    punchout_url:    shoppingUrl,
    prefill_items:   items,
    token,
    created_at:      new Date().toISOString(),
    pr_id:           null,
  };
  store.flowSessions.push(session);

  return res.status(200).json({ shopping_url: shoppingUrl });
}
