// POST /api/punchout/initiate
// Tim's contract — Elementum calls this to start a punchout session.
// Returns a shopping URL with record_id baked in.
//
// Body:
//   record_id  (required in practice — Elementum's automation passes the PR/PREQ handle)
//   user       (optional)
//   items      (optional — pre-populate the cart, e.g. [{"name":"pens","qty":10,"price":8.99}])
//   vendor     (optional — which supplier mock to send them to; default "amazon")
//   org        (optional — which Elementum org/environment launched this session, so the
//               mock page can route back to the *same* org instead of a hardcoded one;
//               default "presentation-se" to match pre-existing behavior for callers that
//               don't pass it yet)
 
import { store, cors } from '../../lib/store.js';
 
// Which static mock page each vendor shops from. Add an entry here whenever a
// new supplier gets its own catalog page.
const VENDOR_PAGES = {
  amazon:    'amazon-mock.html',
  biosource: 'biosource-mock.html',
};
 
export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const record_id = req.body.record_id && req.body.record_id !== "$record_id"
    ? req.body.record_id
    : "DEMO-" + Date.now();
  const user   = req.body.user  || "Elementum User";
  const items  = req.body.items || [];  // optional pre-populated cart items from agent
  const vendor = (req.body.vendor || "amazon").toLowerCase();
  const org    = (req.body.org    || "presentation-se").toLowerCase();
 
  const page = VENDOR_PAGES[vendor] || VENDOR_PAGES.amazon;
 
  const token   = Math.random().toString(36).slice(2, 18);
  const baseUrl = `https://${req.headers.host}`;
 
  // Build shopping URL — encode items as JSON if provided by agent
  let shoppingUrl = `${baseUrl}/${page}?record_id=${record_id}&user=${encodeURIComponent(user)}&token=${token}&org=${encodeURIComponent(org)}`;
  if (items.length > 0) {
    shoppingUrl += `&prefill=${encodeURIComponent(JSON.stringify(items))}`;
  }
 
  // Store flow session — include agent-provided items for context
  const session = {
    flow_id:         record_id,
    user_id:         user,
    status:          "PUNCHOUT_ACTIVE",
    vendor_id:       vendor,
    org,
    punchout_url:    shoppingUrl,
    prefill_items:   items,
    token,
    created_at:      new Date().toISOString(),
    pr_id:           null,
  };
  store.flowSessions.push(session);
 
  return res.status(200).json({ shopping_url: shoppingUrl });
}
