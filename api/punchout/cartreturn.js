// POST /api/punchout/cart-return
// Called by amazon-mock.html when user submits their cart.
// Creates a PR and updates the flow session.

import { store, genId, aiPolicyCheck, generatePO, cors } from '../../lib/store.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id, items, total } = req.body;
  if (!session_id || !items || total === undefined) {
    return res.status(400).json({ error: 'session_id, items, and total are required' });
  }

  // Find or create a flow session — handles direct Amazon mock access without prior flow
  let flow = store.flowSessions.find(s => s.flow_id === session_id);
  if (!flow) {
    flow = {
      flow_id:         session_id,
      user_id:         req.body.user || "user",
      status:          "PUNCHOUT_ACTIVE",
      vendor_id:       "amazon",
      request_text:    "Procurement request",
      budget_category: "Office Supplies",
      created_at:      new Date().toISOString(),
      pr_id:           null,
    };
    store.flowSessions.push(flow);
  }

  const prId   = genId("PR");
  const policy = aiPolicyCheck(total, flow.vendor_id || "amazon");

  const pr = {
    pr_id:           prId,
    source:          "PUNCHOUT_FLOW",
    flow_id:         session_id,
    description:     `Punchout order — ${flow.request_text || "Procurement request"}`,
    vendor_id:       flow.vendor_id || "amazon",
    vendor_name:     "Amazon Business",
    amount:          total,
    budget_category: flow.budget_category || "Office Supplies",
    requestor:       flow.user_id || "user",
    justification:   `Punchout cart from Amazon Business. ${items.length} item(s).`,
    line_items:      items,
    status:          policy.auto_approved ? "AUTO_APPROVED" : "PENDING_APPROVAL",
    ai_policy:       policy,
    created_at:      new Date().toISOString(),
  };

  if (policy.auto_approved) {
    const po    = generatePO(pr);
    pr.po_number = po.po_number;
  }

  store.purchaseRequests.push(pr);

  // Update flow session
  flow.status       = "REQUISITION_CREATED";
  flow.pr_id        = prId;
  flow.cart_items   = items;
  flow.cart_total   = total;
  flow.completed_at = new Date().toISOString();
  flow.agent_note   = `Cart received. Requisition ${prId} created. ${policy.auto_approved ? "Auto-approved — PO generated." : "Pending manager approval."}`;

  return res.status(201).json({
    message:      `Cart received. Requisition ${prId} created in Elementum.`,
    flow_id:      session_id,
    pr_id:        prId,
    pr_status:    pr.status,
    amount:       total,
    items,
    po_number:    pr.po_number || null,
    ai_note:      flow.agent_note,
    auto_approved: policy.auto_approved,
  });
}
