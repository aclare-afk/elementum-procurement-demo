// GET  /api/flow/[flowId]          — get flow status
// POST /api/flow/[flowId]/punchout — initiate punchout for a flow
// POST /api/flow/[flowId]/cart-return — handled in cart-return.js

import { store, cors } from '../../lib/store.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse the path to get flowId and optional sub-action
  // e.g. /api/flow/FLOW-123         → flowId = FLOW-123
  // e.g. /api/flow/FLOW-123/punchout → flowId = FLOW-123, action = punchout
  const parts    = req.url.replace('/api/flow/', '').split('/').filter(Boolean);
  const flowId   = parts[0];
  const action   = parts[1]; // "punchout" | "cart-return" | undefined

  const flow = store.flowSessions.find(s => s.flow_id === flowId);
  if (!flow) return res.status(404).json({ error: `Flow ${flowId} not found` });

  // GET — return flow status + attached PR
  if (req.method === 'GET') {
    const result = { ...flow };
    if (flow.pr_id) {
      result.pr = store.purchaseRequests.find(p => p.pr_id === flow.pr_id) || null;
    }
    return res.status(200).json(result);
  }

  // POST /punchout — initiate punchout for this flow
  if (req.method === 'POST' && action === 'punchout') {
    const vendorId   = req.query.vendor_id || req.body?.vendor_id || "amazon";
    const token      = Math.random().toString(36).slice(2, 18);
    const baseUrl    = `https://${req.headers.host}`;
    const punchoutUrl = `${baseUrl}/amazon-mock.html?session=${flowId}&record_id=${flowId}&token=${token}&return_url=${encodeURIComponent(baseUrl + '/api/punchout/cart-return')}`;

    flow.status           = "PUNCHOUT_ACTIVE";
    flow.vendor_id        = vendorId;
    flow.punchout_token   = token;
    flow.punchout_url     = punchoutUrl;
    flow.punchout_started = new Date().toISOString();

    return res.status(201).json({
      flow_id:      flowId,
      punchout_url: punchoutUrl,
      token,
      status:       "PUNCHOUT_ACTIVE",
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
