// POST /api/punchout/initiate
// Tim's contract — Elementum calls this to start a punchout session.
// Returns a shopping URL with record_id baked in.

import { store, genId, cors } from '../../lib/store.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { record_id, user } = req.body;
  if (!record_id || !user) {
    return res.status(400).json({ error: 'record_id and user are required' });
  }

  const token       = Math.random().toString(36).slice(2, 18);
  const baseUrl     = `https://${req.headers.host}`;
  const shoppingUrl = `${baseUrl}/amazon-mock.html?record_id=${record_id}&user=${encodeURIComponent(user)}&token=${token}`;

  // Store as a flow session
  const session = {
    flow_id:     record_id,
    user_id:     user,
    status:      "PUNCHOUT_ACTIVE",
    vendor_id:   "amazon",
    punchout_url: shoppingUrl,
    token,
    created_at:  new Date().toISOString(),
    pr_id:       null,
  };
  store.flowSessions.push(session);

  return res.status(200).json({ shopping_url: shoppingUrl });
}
