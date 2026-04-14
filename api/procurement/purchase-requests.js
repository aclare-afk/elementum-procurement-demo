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
    const { requester, item, amount, record_id } = req.body;
    if (!requester || !item || amount === undefined) {
      return res.status(400).json({ error: 'requester, item, and amount are required' });
    }

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
