// POST /api/procurement/purchase-requests
// Tim's contract — Elementum calls this after receiving cart data.
// Returns pr_number and status exactly as Tim defined.

import { store, genId, aiPolicyCheck, generatePO, cors } from '../../lib/store.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — list all PRs
  if (req.method === 'GET') {
    return res.status(200).json({ count: store.purchaseRequests.length, results: store.purchaseRequests });
  }

  // POST — create a new PR (Tim's contract)
  if (req.method === 'POST') {
    const { record_id } = req.body;
    // Handle null strings from Tim's system while his app is still being built
    const requester = req.body.requester && req.body.requester !== "null" ? req.body.requester : "Elementum User";
    const item      = req.body.item      && req.body.item      !== "null" ? req.body.item      : "Procurement Request";
    const amount    = req.body.amount    && req.body.amount    !== "null" ? parseFloat(req.body.amount) : 0;
    const quantity  = req.body.quantity  && req.body.quantity  !== "null" ? parseInt(req.body.quantity)  : 1;

    const prNumber = genId("PR");
    const policy   = aiPolicyCheck(amount, "amazon");

    const pr = {
      pr_id:        prNumber,
      pr_number:    prNumber,
      source:       "TIM_FLOW",
      record_id:    record_id || null,
      description:  item,
      vendor_name:  "Amazon Business",
      vendor_id:    "amazon",
      amount,
      quantity,
      requestor:    requester,
      status:       "pending_approval",
      ai_policy:    policy,
      created_at:   new Date().toISOString(),
    };
    store.purchaseRequests.push(pr);

    // Update matching flow session if record_id provided
    if (record_id) {
      const flow = store.flowSessions.find(s => s.flow_id === record_id);
      if (flow) {
        flow.pr_id       = prNumber;
        flow.status      = "REQUISITION_CREATED";
        flow.completed_at = new Date().toISOString();
      }
    }

    // Tim's exact return shape
    return res.status(200).json({
      pr_number: prNumber,
      status:    "pending_approval",
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
